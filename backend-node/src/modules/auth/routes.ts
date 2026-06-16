import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Op } from 'sequelize';
import { createAccessToken, createRefreshToken, verifyToken, blacklistToken, isTokenBlacklisted } from '../../common/auth';
import { checkLoginRateLimit, resetLoginRateLimit } from '../../common/rate-limiter';
import { ok, fail, message } from '../../common/response';
import { authMiddleware } from '../../common/auth-middleware';
import { logger } from '../../common/logger';
import { getRequestLogFields } from '../../common/request-logger';
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: 登录成功
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
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 用户名或密码错误
 *       403:
 *         description: 账号已禁用
 *       429:
 *         description: 登录频繁
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    const requestFields = getRequestLogFields(req);

    if (!username || !password) {
      logger.warn('auth_login_failed', {
        ...requestFields,
        username,
        reason: 'missing_credentials',
      });
      return fail(res, 400, '用户名和密码不能为空');
    }

    const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown');

    const user = await User.findOne({ where: { username } });
    if (!user) {
      logger.warn('auth_login_failed', {
        ...requestFields,
        username,
        reason: 'user_not_found',
      });
      return fail(res, 401, '用户名或密码错误');
    }

    if (user.status !== 'active') {
      logger.warn('auth_login_failed', {
        ...requestFields,
        username,
        userId: user.id,
        reason: 'inactive_user',
      });
      return fail(res, 403, '账号已被禁用');
    }

    checkLoginRateLimit(ip, user.id);

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      logger.warn('auth_login_failed', {
        ...requestFields,
        username,
        userId: user.id,
        reason: 'invalid_password',
      });
      return fail(res, 401, '用户名或密码错误');
    }

    resetLoginRateLimit(ip, user.id);

    await User.update({ last_login_at: new Date() }, { where: { id: user.id } });

    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);
    const safeUser = user.get({ plain: true });
    delete (safeUser as any).password_hash;

    logger.info('auth_login_succeeded', {
      ...requestFields,
      username,
      userId: user.id,
    });

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
      logger.warn('auth_login_rate_limited', {
        ...getRequestLogFields(req),
        username: req.body?.username,
        reason: err.message,
      });
      return fail(res, 429, err.message);
    }
    logger.error('auth_login_error', {
      ...getRequestLogFields(req),
      username: req.body?.username,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 退出登录
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 退出成功
 *       401:
 *         description: 未授权
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const header = req.headers.authorization;
    const token = header?.split(' ')[1];
    if (token) {
      await blacklistToken(token, req.user!.id);
    }
    logger.info('auth_logout_succeeded', {
      ...getRequestLogFields(req),
      userId: req.user!.id,
      username: req.user!.username,
    });
    message(res, '已退出登录');
  } catch (err) {
    logger.error('auth_logout_error', {
      ...getRequestLogFields(req),
      userId: req.user?.id,
      username: req.user?.username,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 刷新 Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: 刷新成功
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
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *       400:
 *         description: 缺少 refresh_token
 *       401:
 *         description: Token 无效或已吊销
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body?.refresh_token ?? req.body?.refreshToken;
    if (!refreshToken) {
      logger.warn('auth_refresh_failed', {
        ...getRequestLogFields(req),
        reason: 'missing_refresh_token',
      });
      return fail(res, 400, '缺少 refresh_token');
    }

    const payload = verifyToken(refreshToken, 'refresh');
    if (!payload) {
      logger.warn('auth_refresh_failed', {
        ...getRequestLogFields(req),
        reason: 'invalid_refresh_token',
      });
      return fail(res, 401, '无效的 refresh_token');
    }

    if (await isTokenBlacklisted(refreshToken)) {
      logger.warn('auth_refresh_failed', {
        ...getRequestLogFields(req),
        userId: Number(payload.sub),
        tokenId: payload.jti,
        reason: 'blacklisted_refresh_token',
      });
      return fail(res, 401, 'refresh_token 已被吊销');
    }

    await blacklistToken(refreshToken, Number(payload.sub));

    const newAccessToken = createAccessToken(Number(payload.sub));
    const newRefreshToken = createRefreshToken(Number(payload.sub));

    logger.info('auth_refresh_succeeded', {
      ...getRequestLogFields(req),
      userId: Number(payload.sub),
      oldTokenId: payload.jti,
    });

    ok(res, {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    logger.error('auth_refresh_error', {
      ...getRequestLogFields(req),
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: 获取当前用户信息
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
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

    ok(res, { ...user, permissions });
  } catch (err) {
    logger.error('auth_profile_error', {
      ...getRequestLogFields(req),
      userId: req.user?.id,
      username: req.user?.username,
      error: err,
    });
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: 更新当前用户资料
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       409:
 *         description: 邮箱已存在
 */
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
