import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail } from '../../common/response';
import { AuditLog, User } from '../../db/models';

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     tags: [AuditLogs]
 *     summary: 获取审计日志列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 按操作类型筛选
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: 按用户 ID 筛选
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: 按用户名模糊搜索
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 50
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           user_id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           action:
 *                             type: string
 *                           target_type:
 *                             type: string
 *                           target_name:
 *                             type: string
 *                           ip:
 *                             type: string
 *                           details:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { action, user_id, username, page = '1', pageSize = '50' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
    const offset = (p - 1) * ps;

    const where: any = {};
    if (action) where.action = action;
    if (user_id) where.user_id = user_id;
    if (username) where.username = { [Op.like]: `%${username}%` };

    const total = await AuditLog.count({ where: Object.keys(where).length ? where : undefined });

    const rows = await AuditLog.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const items = rows.map((row) => {
      const plain = row.get({ plain: true }) as any;
      return { ...plain, username: plain.user?.username ?? plain.username ?? null };
    });

    ok(res, { items, total, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/audit-logs/{id}:
 *   get:
 *     tags: [AuditLogs]
 *     summary: 获取审计日志详情
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
 *         description: 日志不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['username'] }],
    });

    if (!log) return fail(res, 404, '日志不存在');
    const plain = log.get({ plain: true }) as any;
    ok(res, { ...plain, username: plain.user?.username ?? plain.username ?? null });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
