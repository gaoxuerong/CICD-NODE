import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Op } from 'sequelize';
import { createAccessToken, createRefreshToken, verifyToken, blacklistToken, isTokenBlacklisted } from '../../common/auth';
import { checkLoginRateLimit, resetLoginRateLimit } from '../../common/rate-limiter';
import { ok, fail, message } from '../../common/response';
import { authMiddleware } from '../../common/auth-middleware';
import { Role, User } from '../../db/models';

const router = Router();

const updateProfileSchema = z.object({
  nickname: z.string().max(100).optional(),
  email: z.string().email().optional(),
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

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return fail(res, 400, '用户名和密码不能为空');
    }

    const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown');

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return fail(res, 401, '用户名或密码错误');
    }

    if (user.status !== 'active') {
      return fail(res, 403, '账号已被禁用');
    }

    checkLoginRateLimit(ip, user.id);

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return fail(res, 401, '用户名或密码错误');
    }

    resetLoginRateLimit(ip, user.id);

    await User.update({ last_login_at: new Date() }, { where: { id: user.id } });

    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);
    const safeUser = user.get({ plain: true });
    delete (safeUser as any).password_hash;

    ok(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: safeUser,
      token: accessToken,
      refreshToken,
      userInfo: safeUser,
    });
  } catch (err: any) {
    if (err?.message?.includes('登录') || err?.message?.includes('频繁')) {
      return fail(res, 429, err.message);
    }
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const header = req.headers.authorization;
    const token = header?.split(' ')[1];
    if (token) {
      await blacklistToken(token, req.user!.id);
    }
    message(res, '已退出登录');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body?.refresh_token ?? req.body?.refreshToken;
    if (!refreshToken) {
      return fail(res, 400, '缺少 refresh_token');
    }

    const payload = verifyToken(refreshToken, 'refresh');
    if (!payload) {
      return fail(res, 401, '无效的 refresh_token');
    }

    if (await isTokenBlacklisted(refreshToken)) {
      return fail(res, 401, 'refresh_token 已被吊销');
    }

    await blacklistToken(refreshToken, Number(payload.sub));

    const newAccessToken = createAccessToken(Number(payload.sub));
    const newRefreshToken = createRefreshToken(Number(payload.sub));

    ok(res, {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
      raw: true,
    });

    if (!user) {
      return fail(res, 404, '用户不存在');
    }

    const roleObj = await Role.findOne({ where: { code: user.role }, attributes: ['permissions'] });
    const permissions = parsePermissions(roleObj?.permissions);

    ok(res, { ...user.get({ plain: true }), permissions });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.nickname !== undefined) {
      updates.nickname = parsed.data.nickname;
    }

    if (parsed.data.email !== undefined) {
      const exists = await User.findOne({ where: { email: parsed.data.email, id: { [Op.ne]: req.user!.id } } });
      if (exists) {
        return fail(res, 409, '邮箱已存在');
      }
      updates.email = parsed.data.email;
    }

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }

    updates.updated_at = new Date();
    await User.update(updates, { where: { id: req.user!.id } });

    const user = await User.findByPk(req.user!.id, {
      attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
      raw: true,
    });

    ok(res, user);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
