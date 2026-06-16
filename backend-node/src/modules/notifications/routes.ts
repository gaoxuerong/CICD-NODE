import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Notification } from '../../db/models';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: 获取通知列表（分页）
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           content:
 *                             type: string
 *                           is_read:
 *                             type: integer
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
    const { page = '1', pageSize = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where = { user_id: req.user!.id };

    const total = await Notification.count({ where });

    const rows = await Notification.findAll({
      where,
      order: [['id', 'DESC']],
      limit: ps,
      offset,
      raw: true,
    });

    ok(res, { items: rows, total, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: 获取未读通知数量
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
 *                     count:
 *                       type: integer
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user!.id, is_read: 0 } });
    ok(res, { count });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: 创建通知
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               target_user_id:
 *                 type: integer
 *                 description: 指定接收用户，不传则发给自己
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 标题不能为空
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, target_user_id } = req.body ?? {};
    if (!title) return fail(res, 400, '通知标题不能为空');

    const notification = await Notification.create({
      user_id: target_user_id ?? req.user!.id,
      title,
      content: content ?? null,
      is_read: 0,
      created_at: new Date(),
    });

    created(res, { id: notification.id, title, content });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: 标记单条通知为已读
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
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await Notification.update({ is_read: 1 }, { where: { id: req.params.id, user_id: req.user!.id } });
    message(res, '已标记为已读');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: 全部标记为已读
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功
 */
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.update({ is_read: 1 }, { where: { user_id: req.user!.id, is_read: 0 } });
    message(res, '已全部标记为已读');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: 删除通知
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
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, user_id: req.user!.id } });
    message(res, '通知已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
