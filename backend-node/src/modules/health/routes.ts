import { Router } from 'express';
import { sequelize } from '../../db/sequelize';
import { ok } from '../../common/response';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: 健康检查
 *     description: 检查服务和数据库连接状态
 *     responses:
 *       200:
 *         description: 服务状态
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy]
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       description: 运行时长（秒）
 *                     database:
 *                       type: string
 *                       enum: [connected, disconnected]
 */
router.get('/', async (_req, res) => {
  try {
    await sequelize.authenticate();
    ok(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch {
    ok(res, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
