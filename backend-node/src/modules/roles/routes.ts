import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
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

const SYSTEM_ROLES = ['superadmin', 'admin', 'manager', 'developer', 'user', 'viewer'];

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

    created(res, { id: role.id, code, name, description, level, permissions });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

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
    ok(res, updated);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

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
    message(res, '角色已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
