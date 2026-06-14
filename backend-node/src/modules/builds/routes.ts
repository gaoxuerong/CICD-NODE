import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Build, Project, Pipeline, User } from '../../db/models';

const router = Router();

const createSchema = z.object({
  pipeline_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive(),
  branch: z.string().max(100).optional().default('main'),
  commit_sha: z.string().max(100).optional(),
  commit_message: z.string().max(500).optional(),
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id, pipeline_id, status, page = '1', pageSize = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where: any = {};
    if (project_id) where.project_id = project_id;
    if (pipeline_id) where.pipeline_id = pipeline_id;
    if (status) where.status = status;

    const { rows, count } = await Build.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
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
        pipeline_name: plain.pipeline?.name ?? null,
        trigger_by_name: plain.triggerUser?.username ?? null,
      };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
      ],
    });

    if (!build) return fail(res, 404, '构建不存在');
    const plain = build.get({ plain: true }) as any;
    ok(res, {
      ...plain,
      project_name: plain.project?.name ?? null,
      pipeline_name: plain.pipeline?.name ?? null,
      trigger_by_name: plain.triggerUser?.username ?? null,
    });
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

    const maxBuild = await Build.max('build_number', { where: { project_id: parsed.data.project_id } }) as number | null;
    const buildNumber = (maxBuild ?? 0) + 1;

    const build = await Build.create({
      build_number: buildNumber,
      pipeline_id: parsed.data.pipeline_id ?? null,
      project_id: parsed.data.project_id,
      branch: parsed.data.branch,
      commit_sha: parsed.data.commit_sha ?? null,
      commit_message: parsed.data.commit_message ?? null,
      status: 'running',
      trigger_by: req.user!.id,
      started_at: new Date(),
      created_at: new Date(),
    });

    created(res, { id: build.id, build_number: buildNumber, status: 'running' });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, { attributes: ['id', 'status'], raw: true });

    if (!build) return fail(res, 404, '构建不存在');
    if (!['pending', 'running'].includes(build.status)) {
      return fail(res, 400, '当前状态不可取消');
    }

    await Build.update({ status: 'cancelled', finished_at: new Date() }, { where: { id: req.params.id } });
    message(res, '构建已取消');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/:id/retry', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, { raw: true });

    if (!build) return fail(res, 404, '构建不存在');

    const maxBuild = await Build.max('build_number', { where: { project_id: build.project_id } }) as number | null;
    const buildNumber = (maxBuild ?? 0) + 1;

    const newBuild = await Build.create({
      build_number: buildNumber,
      pipeline_id: build.pipeline_id,
      project_id: build.project_id,
      branch: build.branch,
      commit_sha: build.commit_sha,
      commit_message: build.commit_message,
      status: 'running',
      trigger_by: req.user!.id,
      started_at: new Date(),
      created_at: new Date(),
    });

    created(res, { id: newBuild.id, build_number: buildNumber, status: 'running' });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
