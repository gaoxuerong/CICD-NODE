import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { writeAuditLog } from '../../common/audit';
import { ok, fail, created, message } from '../../common/response';
import { Role, User } from '../../db/models';

const router = Router();

const createRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  level: z.number().int().min(0).max(9999).optional().default(0),
  permissions: z.array(z.string()).optional().default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  level: z.number().int().min(0).max(9999).optional(),
  permissions: z.array(z.string()).optional(),
});

const SYSTEM_ROLES = ['superadmin', 'admin', 'manager', 'developer', 'user'];

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: 获取角色列表
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 */
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const rows = await Role.findAll({
      attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
      order: [['level', 'DESC']],
      raw: true,
    });
    ok(res, rows);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: 获取角色详情
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: 角色不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
      raw: true,
    });

    if (!role) {
      return fail(res, 404, '角色不存在');
    }

    ok(res, role);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: 创建角色
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               level:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 9999
 *                 default: 0
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: []
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误或角色编码为系统保留
 *       409:
 *         description: 角色编码已存在
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { code, name, description, level, permissions } = parsed.data;

    if (SYSTEM_ROLES.includes(code)) {
      return fail(res, 400, '该角色编码为系统保留');
    }

    const exists = await Role.findOne({ where: { code }, attributes: ['id'] });
    if (exists) {
      return fail(res, 409, '角色编码已存在');
    }

    const role = await Role.create({
      code,
      name,
      description: description ?? null,
      level,
      is_system: 0,
      permissions: JSON.stringify(permissions),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await writeAuditLog(req, {
      action: 'role.create',
      targetType: 'role',
      targetName: code,
      details: { name, level, permissions },
    });

    created(res, { id: role.id, code, name, description, level, permissions });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: 更新角色信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               level:
 *                 type: integer
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 超级管理员角色不可修改
 *       404:
 *         description: 角色不存在
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const role = await Role.findByPk(req.params.id, { attributes: ['id', 'code', 'is_system'], raw: true });

    if (!role) {
      return fail(res, 404, '角色不存在');
    }

    if (role.is_system && SYSTEM_ROLES.includes(role.code)) {
      if (role.code === 'superadmin') {
        return fail(res, 403, '超级管理员角色不可修改');
      }
    }

    const updates: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.level !== undefined) updates.level = parsed.data.level;
    if (parsed.data.permissions !== undefined) updates.permissions = JSON.stringify(parsed.data.permissions);

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }

    updates.updated_at = new Date();
    await Role.update(updates, { where: { id: req.params.id } });

    const updated = await Role.findByPk(req.params.id, {
      attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
      raw: true,
    });
    await writeAuditLog(req, {
      action: 'role.update',
      targetType: 'role',
      targetName: updated?.code ?? String(req.params.id),
      details: { fields: Object.keys(updates).filter((key) => key !== 'updated_at') },
    });
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: 删除角色
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
 *       403:
 *         description: 系统内置角色不可删除
 *       404:
 *         description: 角色不存在
 *       409:
 *         description: 该角色下仍有用户
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, { attributes: ['id', 'code', 'is_system'], raw: true });

    if (!role) {
      return fail(res, 404, '角色不存在');
    }

    if (role.is_system) {
      return fail(res, 403, '系统内置角色不可删除');
    }

    const userCount = await User.count({ where: { role: role.code } });
    if (userCount > 0) {
      return fail(res, 409, `该角色下仍有 ${userCount} 个用户，无法删除`);
    }

    await Role.destroy({ where: { id: req.params.id } });
    await writeAuditLog(req, {
      action: 'role.delete',
      targetType: 'role',
      targetName: role.code,
    });
    message(res, '角色已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
