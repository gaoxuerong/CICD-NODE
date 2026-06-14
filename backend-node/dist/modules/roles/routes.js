"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createRoleSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(50),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    level: zod_1.z.number().int().min(0).max(9999).optional().default(0),
    permissions: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
const updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    level: zod_1.z.number().int().min(0).max(9999).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
});
const SYSTEM_ROLES = ['superadmin', 'admin', 'manager', 'developer', 'user', 'viewer'];
router.get('/', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const rows = await models_1.Role.findAll({
            attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
            order: [['level', 'DESC']],
            raw: true,
        });
        (0, response_1.ok)(res, rows);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const role = await models_1.Role.findByPk(req.params.id, {
            attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
            raw: true,
        });
        if (!role) {
            return (0, response_1.fail)(res, 404, '角色不存在');
        }
        (0, response_1.ok)(res, role);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = createRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const { code, name, description, level, permissions } = parsed.data;
        if (SYSTEM_ROLES.includes(code)) {
            return (0, response_1.fail)(res, 400, '该角色编码为系统保留');
        }
        const exists = await models_1.Role.findOne({ where: { code }, attributes: ['id'] });
        if (exists) {
            return (0, response_1.fail)(res, 409, '角色编码已存在');
        }
        const role = await models_1.Role.create({
            code,
            name,
            description: description ?? null,
            level,
            is_system: 0,
            permissions: JSON.stringify(permissions),
            created_at: new Date(),
            updated_at: new Date(),
        });
        (0, response_1.created)(res, { id: role.id, code, name, description, level, permissions });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = updateRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const role = await models_1.Role.findByPk(req.params.id, { attributes: ['id', 'code', 'is_system'], raw: true });
        if (!role) {
            return (0, response_1.fail)(res, 404, '角色不存在');
        }
        if (role.is_system && SYSTEM_ROLES.includes(role.code)) {
            if (role.code === 'superadmin') {
                return (0, response_1.fail)(res, 403, '超级管理员角色不可修改');
            }
        }
        const updates = {};
        if (parsed.data.name !== undefined)
            updates.name = parsed.data.name;
        if (parsed.data.description !== undefined)
            updates.description = parsed.data.description;
        if (parsed.data.level !== undefined)
            updates.level = parsed.data.level;
        if (parsed.data.permissions !== undefined)
            updates.permissions = JSON.stringify(parsed.data.permissions);
        if (Object.keys(updates).length === 0) {
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        }
        updates.updated_at = new Date();
        await models_1.Role.update(updates, { where: { id: req.params.id } });
        const updated = await models_1.Role.findByPk(req.params.id, {
            attributes: ['id', 'code', 'name', 'description', 'level', 'is_system', 'permissions', 'created_at', 'updated_at'],
            raw: true,
        });
        (0, response_1.ok)(res, updated);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const role = await models_1.Role.findByPk(req.params.id, { attributes: ['id', 'code', 'is_system'], raw: true });
        if (!role) {
            return (0, response_1.fail)(res, 404, '角色不存在');
        }
        if (role.is_system) {
            return (0, response_1.fail)(res, 403, '系统内置角色不可删除');
        }
        const userCount = await models_1.User.count({ where: { role: role.code } });
        if (userCount > 0) {
            return (0, response_1.fail)(res, 409, `该角色下仍有 ${userCount} 个用户，无法删除`);
        }
        await models_1.Role.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '角色已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map