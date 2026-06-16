import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { writeAuditLog } from '../../common/audit';
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

/**
 * @swagger
 * /api/users/permissions:
 *   get:
 *     tags: [Users]
 *     summary: 获取当前用户权限列表
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: 未授权
 */
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

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: 获取用户列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（用户名/邮箱/昵称）
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
 *                         $ref: '#/components/schemas/User'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       401:
 *         description: 未授权
 */
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

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: 获取用户详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户 ID
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
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
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

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: 创建用户
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 default: user
 *               status:
 *                 type: string
 *                 enum: [active, disabled]
 *                 default: active
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       409:
 *         description: 用户名或邮箱已存在
 */
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

    await writeAuditLog(req, {
      action: 'user.create',
      targetType: 'user',
      targetName: username,
      details: { userId: user.id, role, status },
    });

    created(res, { id: user.id, username, email, nickname, role, status });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/users/{id}/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: 重置用户密码
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: 重置成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
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

    await writeAuditLog(req, {
      action: 'user.reset_password',
      targetType: 'user',
      targetName: String(req.params.id),
    });

    message(res, '密码已重置');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: 更新用户信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, disabled]
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权修改
 *       404:
 *         description: 用户不存在
 */
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
    await writeAuditLog(req, {
      action: 'user.update',
      targetType: 'user',
      targetName: updated?.username ?? String(req.params.id),
      details: { fields: Object.keys(updates).filter((key) => key !== 'updated_at') },
    });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: 删除用户
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权删除
 *       404:
 *         description: 用户不存在
 */
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
    await writeAuditLog(req, {
      action: 'user.delete',
      targetType: 'user',
      targetName: user.username,
      details: { userId: user.id },
    });
    message(res, '用户已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
