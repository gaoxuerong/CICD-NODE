import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Environment, Project, User } from '../../db/models';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['development', 'staging', 'production', 'testing']),
  project_id: z.number().int().positive(),
  deploy_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  deploy_url: z.string().url().optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id } = req.query as any;

    const where = project_id ? { project_id } : undefined;

    const rows = await Environment.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      raw: true,
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        project_name: (plain as any).project?.name ?? null,
        creator_name: (plain as any).creator?.username ?? null,
      };
    });

    ok(res, items);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const env = await Environment.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
      raw: true,
    });

    if (!env) return fail(res, 404, '环境不存在');
    const plain = env.get({ plain: true });
    ok(res, { ...plain, project_name: (plain as any).project?.name ?? null, creator_name: (plain as any).creator?.username ?? null });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const project = await Project.findByPk(parsed.data.project_id, { attributes: ['id'], raw: true });
    if (!project) return fail(res, 404, '项目不存在');

    const exists = await Environment.findOne({ where: { project_id: parsed.data.project_id, name: parsed.data.name } });
    if (exists) return fail(res, 409, '同项目下环境名称已存在');

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

    created(res, { id: env.id, ...parsed.data });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const env = await Environment.findByPk(req.params.id, { raw: true });
    if (!env) return fail(res, 404, '环境不存在');

    const updates: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.deploy_url !== undefined) updates.deploy_url = data.deploy_url;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) return fail(res, 400, '没有需要更新的字段');

    updates.updated_at = new Date();
    await Environment.update(updates, { where: { id: req.params.id } });

    const updated = await Environment.findByPk(req.params.id, { raw: true });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const env = await Environment.findByPk(req.params.id, { raw: true });
    if (!env) return fail(res, 404, '环境不存在');

    await Environment.destroy({ where: { id: req.params.id } });
    message(res, '环境已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
