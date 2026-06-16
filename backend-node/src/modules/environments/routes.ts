import { Router } from 'express';
import { z } from 'zod';
import { UniqueConstraintError } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { writeAuditLog } from '../../common/audit';
import { ok, fail, created, message } from '../../common/response';
import { Environment, Project, User } from '../../db/models';

const router = Router();
const environmentTypes = ['development', 'testing', 'staging', 'production'] as const;

function normalizeEnvironmentInput(body: any) {
  if (!body || typeof body !== 'object') return body;
  return {
    ...body,
    project_id: body.project_id ?? body.projectId,
    deploy_url: body.deploy_url ?? body.deployUrl,
  };
}

function handleEnvironmentWriteError(res: any, err: unknown) {
  if (err instanceof UniqueConstraintError) {
    return fail(res, 409, '同项目下环境类型已存在');
  }
  return fail(res, 500, '服务器内部错误');
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(environmentTypes),
  project_id: z.coerce.number().int().positive(),
  deploy_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(environmentTypes).optional(),
  deploy_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * @swagger
 * /api/environments:
 *   get:
 *     tags: [Environments]
 *     summary: 获取环境列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: 按项目筛选
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [development, staging, production, testing]
 *                       project_id:
 *                         type: integer
 *                       deploy_url:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [active, inactive]
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id, type, status } = req.query as any;

    const where: any = {};
    if (project_id) where.project_id = project_id;
    if (type) where.type = type;
    if (status) where.status = status;

    const rows = await Environment.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        projectId: plain.project_id,
        deployUrl: plain.deploy_url,
        project_name: (plain as any).project?.name ?? null,
        creator_name: (plain as any).creator?.username ?? null,
      };
    });

    ok(res, items);
  } catch (err) {
    handleEnvironmentWriteError(res, err);
  }
});

/**
 * @swagger
 * /api/environments/{id}:
 *   get:
 *     tags: [Environments]
 *     summary: 获取环境详情
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
 *         description: 环境不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const env = await Environment.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
    });

    if (!env) return fail(res, 404, '环境不存在');
    const plain = env.get({ plain: true });
    ok(res, {
      ...plain,
      projectId: plain.project_id,
      deployUrl: plain.deploy_url,
      project_name: (plain as any).project?.name ?? null,
      creator_name: (plain as any).creator?.username ?? null,
    });
  } catch (err) {
    handleEnvironmentWriteError(res, err);
  }
});

/**
 * @swagger
 * /api/environments:
 *   post:
 *     tags: [Environments]
 *     summary: 创建环境
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, project_id]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: production
 *               type:
 *                 type: string
 *                 enum: [development, staging, production, testing]
 *               project_id:
 *                 type: integer
 *               deploy_url:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 同项目下环境名称已存在
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(normalizeEnvironmentInput(req.body));
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const project = await Project.findByPk(parsed.data.project_id, { attributes: ['id', 'name'], raw: true });
    if (!project) return fail(res, 404, '项目不存在');

    const exists = await Environment.findOne({ where: { project_id: parsed.data.project_id, name: parsed.data.name } });
    if (exists) return fail(res, 409, '同项目下环境名称已存在');
    const typeExists = await Environment.findOne({ where: { project_id: parsed.data.project_id, type: parsed.data.type } });
    if (typeExists) return fail(res, 409, '同项目下环境类型已存在');

    const env = await Environment.create({
      name: parsed.data.name,
      type: parsed.data.type,
      project_id: parsed.data.project_id,
      deploy_url: parsed.data.deploy_url ?? null,
      description: parsed.data.description ?? null,
      status: 'active',
      created_by: req.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await writeAuditLog(req, {
      action: 'environment.create',
      targetType: 'environment',
      targetName: env.name,
      details: { environmentId: env.id, projectId: env.project_id, type: env.type },
    });

    created(res, { id: env.id, ...parsed.data });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/environments/{id}:
 *   put:
 *     tags: [Environments]
 *     summary: 更新环境配置
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
 *               deploy_url:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 环境不存在
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(normalizeEnvironmentInput(req.body));
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const env = await Environment.findByPk(req.params.id, { raw: true });
    if (!env) return fail(res, 404, '环境不存在');

    const updates: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) {
      const typeExists = await Environment.findOne({ where: { project_id: env.project_id, type: data.type }, raw: true });
      if (typeExists && typeExists.id !== env.id) return fail(res, 409, '同项目下环境类型已存在');
      updates.type = data.type;
    }
    if (data.deploy_url !== undefined) updates.deploy_url = data.deploy_url;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) return fail(res, 400, '没有需要更新的字段');

    updates.updated_at = new Date();
    await Environment.update(updates, { where: { id: req.params.id } });

    const updated = await Environment.findByPk(req.params.id, { raw: true });
    await writeAuditLog(req, {
      action: 'environment.update',
      targetType: 'environment',
      targetName: updated?.name ?? String(req.params.id),
      details: { environmentId: req.params.id, fields: Object.keys(updates).filter((key) => key !== 'updated_at') },
    });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/environments/{id}:
 *   delete:
 *     tags: [Environments]
 *     summary: 删除环境
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
 *         description: 环境不存在
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const env = await Environment.findByPk(req.params.id, { raw: true });
    if (!env) return fail(res, 404, '环境不存在');

    await Environment.destroy({ where: { id: req.params.id } });
    await writeAuditLog(req, {
      action: 'environment.delete',
      targetType: 'environment',
      targetName: env.name,
      details: { environmentId: env.id, projectId: env.project_id, type: env.type },
    });
    message(res, '环境已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
