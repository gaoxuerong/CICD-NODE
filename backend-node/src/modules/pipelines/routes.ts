import { Router } from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import {
  buildProjectPermissions,
  canAccessProject,
  getAccessibleProjectIds,
  getProjectRole,
} from '../../common/project-access';
import { ok, fail, created, message } from '../../common/response';
import { Environment, Pipeline, Project, User } from '../../db/models';

const router = Router();

function normalizePipelineInput(body: any) {
  if (!body || typeof body !== 'object') return body;
  return {
    ...body,
    project_id: body.project_id ?? body.projectId,
    environment_id: body.environment_id ?? body.environmentId,
  };
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  project_id: z.coerce.number().int().positive(),
  environment_id: z.coerce.number().int().positive(),
  trigger_type: z.enum(['manual', 'push', 'tag', 'schedule']).optional().default('manual'),
  branch_filter: z.string().max(200).optional(),
  config: z.string().max(10000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment_id: z.coerce.number().int().positive().optional(),
  trigger_type: z.enum(['manual', 'push', 'tag', 'schedule']).optional(),
  branch_filter: z.string().max(200).optional(),
  config: z.string().max(10000).optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
});

/**
 * @swagger
 * /api/pipelines:
 *   get:
 *     tags: [Pipelines]
 *     summary: 获取流水线列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: 按项目筛选
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
 *                         $ref: '#/components/schemas/Pipeline'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id, page = '1', pageSize = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const accessibleProjectIds = await getAccessibleProjectIds(req.user!);
    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return ok(res, { items: [], total: 0, page: p, pageSize: ps });
    }

    const where: any = {};
    if (project_id) where.project_id = project_id;
    if (accessibleProjectIds) {
      where.project_id = project_id
        ? project_id
        : { [Op.in]: accessibleProjectIds };
      if (project_id && !accessibleProjectIds.includes(Number(project_id))) {
        return ok(res, { items: [], total: 0, page: p, pageSize: ps });
      }
    }

    const { rows, count } = await Pipeline.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Environment, as: 'environment', attributes: ['name', 'type'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const items = await Promise.all(rows.map(async (row) => {
      const plain = row.get({ plain: true }) as any;
      const currentUserProjectRole = await getProjectRole(req.user!.id, plain.project_id);
      return {
        ...plain,
        project_name: plain.project?.name ?? null,
        environment_name: plain.environment?.name ?? null,
        environment_type: plain.environment?.type ?? null,
        current_user_project_role: currentUserProjectRole,
        permissions: buildProjectPermissions(req.user!, currentUserProjectRole),
        creator_name: plain.creator?.username ?? null,
      };
    }));

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/pipelines/{id}:
 *   get:
 *     tags: [Pipelines]
 *     summary: 获取流水线详情
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
 *       404:
 *         description: 流水线不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const row = await Pipeline.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Environment, as: 'environment', attributes: ['name', 'type'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
    });

    if (!row) return fail(res, 404, '流水线不存在');
    const plain = row.get({ plain: true }) as any;
    if (!(await canAccessProject(req.user!, plain.project_id, 'view'))) {
      return fail(res, 403, '没有权限访问该流水线');
    }
    const currentUserProjectRole = await getProjectRole(req.user!.id, plain.project_id);
    ok(res, {
      ...plain,
      environmentId: plain.environment_id,
      project_name: plain.project?.name ?? null,
      environment_name: plain.environment?.name ?? null,
      environment_type: plain.environment?.type ?? null,
      current_user_project_role: currentUserProjectRole,
      permissions: buildProjectPermissions(req.user!, currentUserProjectRole),
      creator_name: plain.creator?.username ?? null,
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/pipelines:
 *   post:
 *     tags: [Pipelines]
 *     summary: 创建流水线
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, project_id]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               project_id:
 *                 type: integer
 *               trigger_type:
 *                 type: string
 *                 enum: [manual, push, tag, schedule]
 *                 default: manual
 *               branch_filter:
 *                 type: string
 *                 maxLength: 200
 *               config:
 *                 type: string
 *                 maxLength: 10000
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 项目不存在
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(normalizePipelineInput(req.body));
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const project = await Project.findByPk(parsed.data.project_id, { attributes: ['id'], raw: true });
    if (!project) return fail(res, 404, '项目不存在');
    if (!(await canAccessProject(req.user!, parsed.data.project_id, 'managePipelines'))) {
      return fail(res, 403, '没有权限创建该项目的流水线');
    }

    const environment = await Environment.findOne({
      where: { id: parsed.data.environment_id, project_id: parsed.data.project_id },
      attributes: ['id'],
      raw: true,
    });
    if (!environment) return fail(res, 400, '目标环境不存在或不属于该项目');

    const pipeline = await Pipeline.create({
      name: parsed.data.name,
      project_id: parsed.data.project_id,
      environment_id: parsed.data.environment_id,
      trigger_type: parsed.data.trigger_type,
      branch_filter: parsed.data.branch_filter ?? null,
      config: parsed.data.config ?? null,
      status: 'enabled',
      created_by: req.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    created(res, { id: pipeline.id, ...parsed.data });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/pipelines/{id}:
 *   put:
 *     tags: [Pipelines]
 *     summary: 更新流水线配置
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
 *               trigger_type:
 *                 type: string
 *                 enum: [manual, push, tag, schedule]
 *               branch_filter:
 *                 type: string
 *               config:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled]
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 流水线不存在
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const pipeline = await Pipeline.findByPk(req.params.id, { raw: true });
    if (!pipeline) return fail(res, 404, '流水线不存在');
    if (!(await canAccessProject(req.user!, pipeline.project_id, 'managePipelines'))) {
      return fail(res, 403, '没有权限编辑该流水线');
    }

    const updates: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.environment_id !== undefined) {
      const environment = await Environment.findOne({
        where: { id: data.environment_id, project_id: pipeline.project_id },
        attributes: ['id'],
        raw: true,
      });
      if (!environment) return fail(res, 400, '目标环境不存在或不属于该项目');
      updates.environment_id = data.environment_id;
    }
    if (data.trigger_type !== undefined) updates.trigger_type = data.trigger_type;
    if (data.branch_filter !== undefined) updates.branch_filter = data.branch_filter;
    if (data.config !== undefined) updates.config = data.config;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) return fail(res, 400, '没有需要更新的字段');

    updates.updated_at = new Date();
    await Pipeline.update(updates, { where: { id: req.params.id } });

    const updated = await Pipeline.findByPk(req.params.id, { raw: true });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/pipelines/{id}:
 *   delete:
 *     tags: [Pipelines]
 *     summary: 删除流水线
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
 *         description: 流水线不存在
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id, { raw: true });
    if (!pipeline) return fail(res, 404, '流水线不存在');
    if (!(await canAccessProject(req.user!, pipeline.project_id, 'managePipelines'))) {
      return fail(res, 403, '没有权限删除该流水线');
    }

    await Pipeline.destroy({ where: { id: req.params.id } });
    message(res, '流水线已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
