import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Pipeline, Project, User } from '../../db/models';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  project_id: z.number().int().positive(),
  trigger_type: z.enum(['manual', 'push', 'tag', 'schedule']).optional().default('manual'),
  branch_filter: z.string().max(200).optional(),
  config: z.string().max(10000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  trigger_type: z.enum(['manual', 'push', 'tag', 'schedule']).optional(),
  branch_filter: z.string().max(200).optional(),
  config: z.string().max(10000).optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id, page = '1', pageSize = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where = project_id ? { project_id } : undefined;

    const { rows, count } = await Pipeline.findAndCountAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const items = rows.map((row) => {
      const plain = row.get({ plain: true }) as any;
      return {
        ...plain,
        project_name: plain.project?.name ?? null,
        creator_name: plain.creator?.username ?? null,
      };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const row = await Pipeline.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
    });

    if (!row) return fail(res, 404, '流水线不存在');
    const plain = row.get({ plain: true }) as any;
    ok(res, { ...plain, project_name: plain.project?.name ?? null, creator_name: plain.creator?.username ?? null });
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

    const pipeline = await Pipeline.create({
      name: parsed.data.name,
      project_id: parsed.data.project_id,
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

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const pipeline = await Pipeline.findByPk(req.params.id, { raw: true });
    if (!pipeline) return fail(res, 404, '流水线不存在');

    const updates: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
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

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id, { raw: true });
    if (!pipeline) return fail(res, 404, '流水线不存在');

    await Pipeline.destroy({ where: { id: req.params.id } });
    message(res, '流水线已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
