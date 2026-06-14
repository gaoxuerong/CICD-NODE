import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail } from '../../common/response';
import { Build, Environment, Pipeline, Project, User } from '../../db/models';

const router = Router();

router.get('/stats', authMiddleware, async (_req, res) => {
  try {
    const projects = await Project.count();
    const pipelines = await Pipeline.count();
    const users = await User.count();
    const environments = await Environment.count();

    const buildTotal = await Build.count();
    const buildRunning = await Build.count({ where: { status: 'running' } });
    const buildSuccess = await Build.count({ where: { status: 'success' } });
    const buildFailed = await Build.count({ where: { status: 'failed' } });

    const buildSuccessRate = buildTotal > 0 ? Math.round((buildSuccess / buildTotal) * 100) : 0;

    ok(res, {
      projects,
      pipelines,
      users,
      environments,
      builds: {
        total: buildTotal,
        running: buildRunning,
        success: buildSuccess,
        failed: buildFailed,
        successRate: buildSuccessRate,
      },
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/recent-builds', authMiddleware, async (_req, res) => {
  try {
    const rows = await Build.findAll({
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      limit: 10,
      raw: true,
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        project_name: (plain as any).project?.name ?? null,
        pipeline_name: (plain as any).pipeline?.name ?? null,
        trigger_by_name: (plain as any).triggerUser?.username ?? null,
      };
    });

    ok(res, items);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/recent-projects', authMiddleware, async (_req, res) => {
  try {
    const rows = await Project.findAll({
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      order: [['updated_at', 'DESC']],
      limit: 5,
      raw: true,
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return { ...plain, creator_name: (plain as any).creator?.username ?? null };
    });

    ok(res, items);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
