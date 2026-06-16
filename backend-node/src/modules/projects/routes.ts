import { Router } from 'express';
import { z } from 'zod';
import { Op, UniqueConstraintError } from 'sequelize';
import { authMiddleware, requirePermission } from '../../common/auth-middleware';
import { writeAuditLog } from '../../common/audit';
import { logger } from '../../common/logger';
import {
  buildProjectPermissions,
  canAccessProject,
  getAccessibleProjectIds,
  getProjectRole,
  getProjectRolesByProjectId,
} from '../../common/project-access';
import { ok, fail, created, message } from '../../common/response';
import { sequelize } from '../../db/sequelize';
import { Build, Environment, GitCredential, Pipeline, Project, ProjectMember, User } from '../../db/models';

const router = Router();
const projectSourceSchema = z.enum(['local', 'github', 'gitlab', 'gitee', 'custom']);

function normalizeProjectInput(body: any) {
  if (!body || typeof body !== 'object') return body;
  return {
    ...body,
    default_branch: body.default_branch ?? body.defaultBranch,
    git_credential_id: body.git_credential_id ?? body.gitCredentialId,
  };
}

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  repositoryUrl: z.string().url().optional(),
  language: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  source: projectSourceSchema.optional().default('local'),
  git_credential_id: z.coerce.number().int().positive().nullable().optional(),
  github_owner: z.string().optional(),
  github_repo: z.string().optional(),
  default_branch: z.string().optional().default('main'),
  members: z.array(z.object({
    user_id: z.coerce.number().int().positive(),
    role: z.enum(['owner', 'maintainer', 'developer']),
  })).optional().default([]),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  repositoryUrl: z.string().url().optional(),
  language: z.string().max(50).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  source: projectSourceSchema.optional(),
  git_credential_id: z.coerce.number().int().positive().nullable().optional(),
  github_owner: z.string().optional(),
  github_repo: z.string().optional(),
  default_branch: z.string().optional(),
});

const DEFAULT_PROJECT_ENVIRONMENTS = [
  { name: '开发环境', type: 'development', description: '用于日常开发联调。' },
  { name: '测试环境', type: 'testing', description: '用于功能测试和回归验证。' },
  { name: '生产环境', type: 'production', description: '面向真实用户的生产环境。' },
];

function handleProjectWriteError(res: any, err: unknown) {
  if (err instanceof UniqueConstraintError) {
    return fail(res, 409, '项目名称已存在');
  }
  return fail(res, 500, '服务器内部错误');
}

function normalizeProjectMembers(inputMembers: Array<{ user_id: number; role: string }>, fallbackOwnerId: number) {
  const roleRank: Record<string, number> = { developer: 1, maintainer: 2, owner: 3 };
  const byUserId = new Map<number, 'owner' | 'maintainer' | 'developer'>();

  for (const member of inputMembers) {
    const nextRole = member.role as 'owner' | 'maintainer' | 'developer';
    const currentRole = byUserId.get(member.user_id);
    if (!currentRole || roleRank[nextRole] > roleRank[currentRole]) {
      byUserId.set(member.user_id, nextRole);
    }
  }

  const hasOwner = Array.from(byUserId.values()).includes('owner');
  if (!hasOwner) {
    byUserId.set(fallbackOwnerId, 'owner');
  }

  return Array.from(byUserId.entries()).map(([user_id, role]) => ({ user_id, role }));
}

function getProjectMemberSummary(members: any[]) {
  const summary: Record<string, Array<{ id: number; username: string; nickname: string | null }>> = {
    owner: [],
    maintainer: [],
    developer: [],
  };

  for (const member of members) {
    const role = member.role;
    if (!summary[role]) continue;
    const user = member.user ?? {};
    summary[role].push({
      id: member.user_id,
      username: user.username ?? '',
      nickname: user.nickname ?? null,
    });
  }

  return summary;
}

/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: 获取项目列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = '1', pageSize = '20', keyword } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const accessibleProjectIds = await getAccessibleProjectIds(req.user!);
    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return ok(res, { items: [], total: 0, page: p, pageSize: ps });
    }

    const where: any = keyword
      ? { [Op.or]: [{ name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }] }
      : {};
    if (accessibleProjectIds) {
      where.id = { [Op.in]: accessibleProjectIds };
    }

    const { rows, count } = await Project.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: GitCredential, as: 'gitCredential', attributes: ['id', 'name', 'type'] },
      ],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const projectRoles = await getProjectRolesByProjectId(req.user!, rows.map((row) => row.id));
    const projectIds = rows.map((row) => row.id);
    const projectMembers = projectIds.length
      ? await ProjectMember.findAll({
          where: { project_id: { [Op.in]: projectIds } },
          include: [{ model: User, as: 'user', attributes: ['username', 'nickname'] }],
        })
      : [];
    const membersByProjectId = new Map<number, any[]>();
    for (const member of projectMembers) {
      const plainMember = member.get({ plain: true });
      const list = membersByProjectId.get(plainMember.project_id) ?? [];
      list.push(plainMember);
      membersByProjectId.set(plainMember.project_id, list);
    }

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      const currentUserProjectRole = projectRoles.get(plain.id) ?? null;
      const memberSummary = getProjectMemberSummary(membersByProjectId.get(plain.id) ?? []);
      return {
        ...plain,
        gitCredentialId: plain.git_credential_id ?? null,
        defaultBranch: plain.default_branch ?? null,
        current_user_project_role: currentUserProjectRole,
        permissions: buildProjectPermissions(req.user!, currentUserProjectRole),
        member_summary: memberSummary,
        owner_names: memberSummary.owner.map((member) => member.nickname || member.username).join('、'),
        creator_name: (plain as any).creator?.username ?? null,
        git_credential_name: (plain as any).gitCredential?.name ?? null,
        git_credential_type: (plain as any).gitCredential?.type ?? null,
      };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch (err) {
    logger.error('projects_list_error', {
      userId: req.user?.id,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: 获取项目详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Project'
 *                     - type: object
 *                       properties:
 *                         creator_name:
 *                           type: string
 *                         members:
 *                           type: array
 *       404:
 *         description: 项目不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: GitCredential, as: 'gitCredential', attributes: ['id', 'name', 'type'] },
      ],
    });

    if (!project) {
      return fail(res, 404, '项目不存在');
    }
    if (!(await canAccessProject(req.user!, req.params.id, 'view'))) {
      return fail(res, 403, '没有权限访问该项目');
    }

    const members = await ProjectMember.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['username', 'nickname', 'avatar'] }],
    });

    const plain = project.get({ plain: true });
    const plainMembers = members.map((member) => member.get({ plain: true }));
    const currentUserProjectRole = await getProjectRole(req.user!.id, req.params.id);
    ok(res, {
      ...plain,
      gitCredentialId: plain.git_credential_id ?? null,
      defaultBranch: plain.default_branch ?? null,
      current_user_project_role: currentUserProjectRole,
      permissions: buildProjectPermissions(req.user!, currentUserProjectRole),
      creator_name: (plain as any).creator?.username ?? null,
      git_credential_name: (plain as any).gitCredential?.name ?? null,
      git_credential_type: (plain as any).gitCredential?.type ?? null,
      members: plainMembers,
      member_summary: getProjectMemberSummary(plainMembers),
    });
  } catch (err) {
    logger.error('project_detail_error', {
      userId: req.user?.id,
      projectId: req.params.id,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     tags: [Projects]
 *     summary: 创建项目
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               repositoryUrl:
 *                 type: string
 *                 format: uri
 *               language:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [local, github]
 *                 default: local
 *               default_branch:
 *                 type: string
 *                 default: main
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 项目名称已存在
 */
router.post('/', authMiddleware, requirePermission('projects.create'), async (req, res) => {
  try {
    const parsed = createProjectSchema.safeParse(normalizeProjectInput(req.body));
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { name, description, repositoryUrl, language, status, source, git_credential_id, github_owner, github_repo, default_branch, members } = parsed.data;

    const exists = await Project.findOne({ where: { name }, attributes: ['id'] });
    if (exists) {
      return fail(res, 409, '项目名称已存在');
    }

    if (git_credential_id) {
      const credential = await GitCredential.findByPk(git_credential_id, { attributes: ['id'] });
      if (!credential) {
        return fail(res, 400, 'Git 凭据不存在');
      }
    }

    const normalizedMembers = normalizeProjectMembers(members, req.user!.id);
    const memberUserIds = normalizedMembers.map((member) => member.user_id);
    const memberUsers = await User.findAll({
      where: { id: { [Op.in]: memberUserIds } },
      attributes: ['id'],
      raw: true,
    });
    const existingUserIds = new Set(memberUsers.map((user) => user.id));
    const missingUserId = memberUserIds.find((userId) => !existingUserIds.has(userId));
    if (missingUserId) {
      return fail(res, 400, `项目成员用户不存在：${missingUserId}`);
    }

    const project = await sequelize.transaction(async (transaction) => {
      const createdProject = await Project.create({
        name,
        description: description ?? null,
        repositoryUrl: repositoryUrl ?? null,
        language: language ?? null,
        status,
        source,
        git_credential_id: git_credential_id ?? null,
        github_owner: github_owner ?? null,
        github_repo: github_repo ?? null,
        default_branch,
        created_by: req.user!.id,
        created_at: new Date(),
        updated_at: new Date(),
      }, { transaction });

      await ProjectMember.bulkCreate(normalizedMembers.map((member) => ({
        project_id: createdProject.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: new Date(),
      })), { transaction });

      await Environment.bulkCreate(DEFAULT_PROJECT_ENVIRONMENTS.map((env) => ({
        name: env.name,
        type: env.type,
        project_id: createdProject.id,
        deploy_url: null,
        description: env.description,
        status: 'active',
        created_by: req.user!.id,
        created_at: new Date(),
        updated_at: new Date(),
      })), { transaction });

      return createdProject;
    });

    await writeAuditLog(req, {
      action: 'project.create',
      targetType: 'project',
      targetName: name,
      details: { projectId: project.id, source, status, members: normalizedMembers },
    });

    created(res, { id: project.id, name, description, language, status, source, gitCredentialId: git_credential_id ?? null });
  } catch (err) {
    handleProjectWriteError(res, err);
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: 更新项目信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               repositoryUrl:
 *                 type: string
 *               language:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 项目不存在
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateProjectSchema.safeParse(normalizeProjectInput(req.body));
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return fail(res, 404, '项目不存在');
    }
    if (!(await canAccessProject(req.user!, req.params.id, 'edit'))) {
      return fail(res, 403, '没有权限编辑该项目');
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) {
      const exists = await Project.findOne({
        where: {
          name: parsed.data.name,
          id: { [Op.ne]: req.params.id },
        },
        attributes: ['id'],
      });
      if (exists) {
        return fail(res, 409, '项目名称已存在');
      }
      updates.name = parsed.data.name;
    }
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.repositoryUrl !== undefined) updates.repositoryUrl = parsed.data.repositoryUrl;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.source !== undefined) updates.source = parsed.data.source;
    if (parsed.data.github_owner !== undefined) updates.github_owner = parsed.data.github_owner;
    if (parsed.data.github_repo !== undefined) updates.github_repo = parsed.data.github_repo;
    if (parsed.data.default_branch !== undefined) updates.default_branch = parsed.data.default_branch;
    if (parsed.data.git_credential_id !== undefined) {
      if (parsed.data.git_credential_id !== null) {
        const credential = await GitCredential.findByPk(parsed.data.git_credential_id, { attributes: ['id'] });
        if (!credential) {
          return fail(res, 400, 'Git 凭据不存在');
        }
      }
      updates.git_credential_id = parsed.data.git_credential_id;
    }

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }

    updates.updated_at = new Date();
    await Project.update(updates, { where: { id: req.params.id } });

    const updated = await Project.findByPk(req.params.id, {
      include: [{ model: GitCredential, as: 'gitCredential', attributes: ['id', 'name', 'type'] }],
    });
    const plain = updated?.get({ plain: true });
    await writeAuditLog(req, {
      action: 'project.update',
      targetType: 'project',
      targetName: plain?.name ?? String(req.params.id),
      details: { fields: Object.keys(updates).filter((key) => key !== 'updated_at') },
    });
    ok(res, plain ? {
      ...plain,
      gitCredentialId: plain.git_credential_id ?? null,
      defaultBranch: plain.default_branch ?? null,
      git_credential_name: (plain as any).gitCredential?.name ?? null,
      git_credential_type: (plain as any).gitCredential?.type ?? null,
    } : null);
  } catch (err) {
    logger.error('project_update_error', {
      userId: req.user?.id,
      projectId: req.params.id,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: 删除项目
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 项目不存在
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return fail(res, 404, '项目不存在');
    }
    if (!(await canAccessProject(req.user!, req.params.id, 'delete'))) {
      return fail(res, 403, '只有项目所有者可以删除项目');
    }

    await sequelize.transaction(async (transaction) => {
      await Build.destroy({ where: { project_id: req.params.id }, transaction });
      await Pipeline.destroy({ where: { project_id: req.params.id }, transaction });
      await Environment.destroy({ where: { project_id: req.params.id }, transaction });
      await ProjectMember.destroy({ where: { project_id: req.params.id }, transaction });
      await Project.destroy({ where: { id: req.params.id }, transaction });
    });

    await writeAuditLog(req, {
      action: 'project.delete',
      targetType: 'project',
      targetName: project.name,
      details: { projectId: project.id },
    });

    message(res, '项目已删除');
  } catch (err) {
    logger.error('project_delete_error', {
      userId: req.user?.id,
      projectId: req.params.id,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}/members:
 *   get:
 *     tags: [Projects]
 *     summary: 获取项目成员列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    if (!(await canAccessProject(req.user!, req.params.id, 'view'))) {
      return fail(res, 403, '没有权限访问项目成员');
    }

    const members = await ProjectMember.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['username', 'nickname', 'avatar'] }],
      raw: true,
    });

    ok(res, members);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     tags: [Projects]
 *     summary: 添加项目成员
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *               role:
 *                 type: string
 *                 default: developer
 *     responses:
 *       200:
 *         description: 添加成功
 *       409:
 *         description: 用户已是成员
 */
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    if (!(await canAccessProject(req.user!, req.params.id, 'manageMembers'))) {
      return fail(res, 403, '没有权限管理项目成员');
    }

    const { user_id, role = 'developer' } = req.body ?? {};
    if (!user_id) {
      return fail(res, 400, '缺少 user_id');
    }
    if (!['developer', 'maintainer'].includes(role)) {
      return fail(res, 400, '项目成员角色只能是 developer 或 maintainer');
    }

    const project = await Project.findByPk(req.params.id, { raw: true });
    if (!project) {
      return fail(res, 404, '项目不存在');
    }

    const user = await User.findByPk(user_id, { raw: true });
    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    const exists = await ProjectMember.findOne({ where: { project_id: req.params.id, user_id } });
    if (exists) {
      return fail(res, 409, '用户已是项目成员');
    }

    await ProjectMember.create({
      project_id: Number(req.params.id),
      user_id,
      role,
      joined_at: new Date(),
    });

    await writeAuditLog(req, {
      action: 'project.member.add',
      targetType: 'project',
      targetName: project.name,
      details: { projectId: project.id, userId: user_id, role },
    });

    message(res, '成员已添加');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}/members/{userId}:
 *   delete:
 *     tags: [Projects]
 *     summary: 移除项目成员
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 移除成功
 *       403:
 *         description: 不能移除所有者
 *       404:
 *         description: 成员不存在
 */
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    if (!(await canAccessProject(req.user!, req.params.id, 'manageMembers'))) {
      return fail(res, 403, '没有权限管理项目成员');
    }

    const member = await ProjectMember.findOne({
      where: { project_id: req.params.id, user_id: req.params.userId },
      attributes: ['id', 'role'],
    });

    if (!member) {
      return fail(res, 404, '成员不存在');
    }

    if (member.role === 'owner') {
      return fail(res, 403, '不能移除项目所有者');
    }

    await ProjectMember.destroy({ where: { project_id: req.params.id, user_id: req.params.userId } });
    await writeAuditLog(req, {
      action: 'project.member.remove',
      targetType: 'project',
      targetName: String(req.params.id),
      details: { projectId: req.params.id, userId: req.params.userId },
    });
    message(res, '成员已移除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/projects/{id}/transfer:
 *   post:
 *     tags: [Projects]
 *     summary: 转让项目所有权
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 转让成功
 *       403:
 *         description: 无权转让
 *       404:
 *         description: 目标用户不是成员
 */
router.post('/:id/transfer', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body ?? {};
    if (!user_id) {
      return fail(res, 400, '缺少 user_id');
    }

    const projectId = req.params.id;

    const currentOwner = await ProjectMember.findOne({ where: { project_id: projectId, user_id: req.user!.id, role: 'owner' } });
    if (!currentOwner) {
      return fail(res, 403, '只有项目所有者可以转让所有权');
    }

    const targetMember = await ProjectMember.findOne({ where: { project_id: projectId, user_id } });
    if (!targetMember) {
      return fail(res, 404, '目标用户不是项目成员');
    }

    await ProjectMember.update({ role: 'developer' }, { where: { project_id: projectId, user_id: req.user!.id } });
    await ProjectMember.update({ role: 'owner' }, { where: { project_id: projectId, user_id } });

    message(res, '项目所有权已转让');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
