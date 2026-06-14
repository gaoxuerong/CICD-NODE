import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Role, User } from '../../db/models';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  nickname: z.string().max(100).optional(),
  password: z.string().min(6),
  role: z.string().optional().default('user'),
  status: z.enum(['active', 'disabled']).optional().default('active'),
});

const updateUserSchema = z.object({
  nickname: z.string().max(100).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(6).optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

router.get('/permissions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user!.id, { attributes: ['role', 'is_superuser'], raw: true });
    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    if (user.is_superuser) {
      return ok(res, { permissions: ['*'] });
    }

    const roleObj = await Role.findOne({ where: { code: user.role }, attributes: ['permissions'] });
    const permissions = parsePermissions(roleObj?.permissions);

    ok(res, { permissions });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = '1', pageSize = '20', keyword } = req.query as any;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where = keyword
      ? {
          [Op.or]: [
            { username: { [Op.like]: `%${keyword}%` } },
            { email: { [Op.like]: `%${keyword}%` } },
            { nickname: { [Op.like]: `%${keyword}%` } },
          ],
        }
      : undefined;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
      raw: true,
    });

    ok(res, { items: rows, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
      raw: true,
    });

    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    ok(res, user);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { username, email, nickname, password, role, status } = parsed.data;

    const exists = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
      attributes: ['id'],
    });
    if (exists) {
      return fail(res, 409, '用户名或邮箱已存在');
    }

    const roleExists = await Role.findOne({ where: { code: role }, attributes: ['id'] });
    if (!roleExists) {
      return fail(res, 400, '角色不存在');
    }

    const hash = bcrypt.hashSync(password, 10);

    const user = await User.create({
      username,
      email,
      nickname: nickname ?? null,
      password_hash: hash,
      role,
      status,
      is_superuser: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    created(res, { id: user.id, username, email, nickname, role, status });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const user = await User.findByPk(req.params.id, { attributes: ['id', 'is_superuser'], raw: true });
    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
    await User.update({ password_hash: passwordHash, updated_at: new Date() }, { where: { id: req.params.id } });

    message(res, '密码已重置');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const user = await User.findByPk(req.params.id, { attributes: ['id', 'is_superuser'], raw: true });

    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    if (user.is_superuser && parsed.data.role && parsed.data.role !== 'admin') {
      if (req.user!.id !== user.id) {
        return fail(res, 403, '超级管理员角色不可更改');
      }
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.nickname !== undefined) updates.nickname = parsed.data.nickname;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.password !== undefined) updates.password_hash = bcrypt.hashSync(parsed.data.password, 10);

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }

    updates.updated_at = new Date();
    await User.update(updates, { where: { id: req.params.id } });

    const updated = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'created_at', 'updated_at'],
      raw: true,
    });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: ['id', 'is_superuser', 'username'], raw: true });

    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    if (user.is_superuser) {
      return fail(res, 403, '不能删除超级管理员');
    }

    if (user.id === req.user!.id) {
      return fail(res, 403, '不能删除自己');
    }

    await User.destroy({ where: { id: req.params.id } });
    message(res, '用户已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
