import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail } from '../../common/response';
import { Build, Environment, Pipeline, Project, User } from '../../db/models';

const router = Router();

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: 获取仪表盘统计数据
 *     security:
 *       - bearerAuth: []
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
 *                     projects:
 *                       type: integer
 *                     pipelines:
 *                       type: integer
 *                     users:
 *                       type: integer
 *                     environments:
 *                       type: integer
 *                     builds:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         running:
 *                           type: integer
 *                         success:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         successRate:
 *                           type: integer
 */
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

/**
 * @swagger
 * /api/dashboard/recent-builds:
 *   get:
 *     tags: [Dashboard]
 *     summary: 获取最近构建记录（分页）
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
 *           default: 10
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
 *                         $ref: '#/components/schemas/Build'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/recent-builds', authMiddleware, async (req, res) => {
  try {
    const { page = '1', pageSize = '10' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const offset = (p - 1) * ps;

    const { rows, count } = await Build.findAndCountAll({
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: Environment, as: 'environment', attributes: ['name', 'type'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const items = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        project_name: (plain as any).project?.name ?? null,
        pipeline_name: (plain as any).pipeline?.name ?? null,
        environment_name: (plain as any).environment?.name ?? null,
        environment_type: (plain as any).environment?.type ?? null,
        trigger_by_name: (plain as any).triggerUser?.username ?? null,
      };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/dashboard/recent-projects:
 *   get:
 *     tags: [Dashboard]
 *     summary: 获取最近更新的项目（分页）
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
 *           default: 5
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
router.get('/recent-projects', authMiddleware, async (req, res) => {
  try {
    const { page = '1', pageSize = '5' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 5));
    const offset = (p - 1) * ps;

    const { rows, count } = await Project.findAndCountAll({
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      order: [['updated_at', 'DESC']],
      limit: ps,
      offset,
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

export default router;
