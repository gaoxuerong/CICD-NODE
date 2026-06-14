import { Router } from 'express';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail } from '../../common/response';
import { AuditLog, User } from '../../db/models';

const router = Router();

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
