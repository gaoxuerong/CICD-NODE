import { Router } from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Project, ProjectMember, User } from '../../db/models';

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  git_url: z.string().url().optional(),
  language: z.string().max(50).optional(),
  source: z.enum(['local', 'github']).optional().default('local'),
  github_owner: z.string().optional(),
  github_repo: z.string().optional(),
  github_default_branch: z.string().optional().default('main'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  git_url: z.string().url().optional(),
  language: z.string().max(50).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = '1', pageSize = '20', keyword } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where = keyword
      ? { [Op.or]: [{ name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }] }
      : undefined;

    const { rows, count } = await Project.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
      raw: true,
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return { ...plain, creator_name: (plain as any).creator?.username ?? null };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      raw: true,
    });

    if (!project) {
      return fail(res, 404, '项目不存在');
    }

    const members = await ProjectMember.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['username', 'nickname', 'avatar'] }],
      raw: true,
    });

    const plain = project.get({ plain: true });
    ok(res, { ...plain, creator_name: (plain as any).creator?.username ?? null, members });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { name, description, git_url, language, source, github_owner, github_repo, github_default_branch } = parsed.data;

    const exists = await Project.findOne({ where: { name }, attributes: ['id'] });
    if (exists) {
      return fail(res, 409, '项目名称已存在');
    }

    const project = await Project.create({
      name,
      description: description ?? null,
      git_url: git_url ?? null,
      language: language ?? null,
      status: 'active',
      source,
      github_owner: github_owner ?? null,
      github_repo: github_repo ?? null,
      github_default_branch,
      created_by: req.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await ProjectMember.create({
      project_id: project.id,
      user_id: req.user!.id,
      role: 'owner',
      joined_at: new Date(),
    });

    created(res, { id: project.id, name, description, source });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const project = await Project.findByPk(req.params.id, { raw: true });
    if (!project) {
      return fail(res, 404, '项目不存在');
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.git_url !== undefined) updates.git_url = parsed.data.git_url;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }

    updates.updated_at = new Date();
    await Project.update(updates, { where: { id: req.params.id } });

    const updated = await Project.findByPk(req.params.id, { raw: true });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, { raw: true });
    if (!project) {
      return fail(res, 404, '项目不存在');
    }

    await Project.destroy({ where: { id: req.params.id } });
    message(res, '项目已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
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

router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { user_id, role = 'developer' } = req.body ?? {};
    if (!user_id) {
      return fail(res, 400, '缺少 user_id');
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

    message(res, '成员已添加');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
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
    message(res, '成员已移除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

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
