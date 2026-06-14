import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Notification } from '../../db/models';

const router = Router();

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

router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user!.id, is_read: 0 } });
    ok(res, { count });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

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

router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await Notification.update({ is_read: 1 }, { where: { id: req.params.id, user_id: req.user!.id } });
    message(res, '已标记为已读');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.update({ is_read: 1 }, { where: { user_id: req.user!.id, is_read: 0 } });
    message(res, '已全部标记为已读');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, user_id: req.user!.id } });
    message(res, '通知已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
