"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const sequelize_1 = require("sequelize");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(2).max(50),
    email: zod_1.z.string().email(),
    nickname: zod_1.z.string().max(100).optional(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.string().optional().default('user'),
    status: zod_1.z.enum(['active', 'disabled']).optional().default('active'),
});
const updateUserSchema = zod_1.z.object({
    nickname: zod_1.z.string().max(100).optional(),
    email: zod_1.z.string().email().optional(),
    role: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'disabled']).optional(),
    password: zod_1.z.string().min(6).optional(),
});
const resetPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6),
});
function parsePermissions(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string');
    }
    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    }
    catch {
        return [];
    }
}
router.get('/permissions', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await models_1.User.findByPk(req.user.id, { attributes: ['role', 'is_superuser'], raw: true });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        if (user.is_superuser) {
            return (0, response_1.ok)(res, { permissions: ['*'] });
        }
        const roleObj = await models_1.Role.findOne({ where: { code: user.role }, attributes: ['permissions'] });
        const permissions = parsePermissions(roleObj?.permissions);
        (0, response_1.ok)(res, { permissions });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { page = '1', pageSize = '20', keyword } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const offset = (p - 1) * ps;
        const where = keyword
            ? {
                [sequelize_1.Op.or]: [
                    { username: { [sequelize_1.Op.like]: `%${keyword}%` } },
                    { email: { [sequelize_1.Op.like]: `%${keyword}%` } },
                    { nickname: { [sequelize_1.Op.like]: `%${keyword}%` } },
                ],
            }
            : undefined;
        const { rows, count } = await models_1.User.findAndCountAll({
            where,
            attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
            order: [['id', 'DESC']],
            limit: ps,
            offset,
            raw: true,
        });
        (0, response_1.ok)(res, { items: rows, total: count, page: p, pageSize: ps });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await models_1.User.findByPk(req.params.id, {
            attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
            raw: true,
        });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        (0, response_1.ok)(res, user);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = createUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const { username, email, nickname, password, role, status } = parsed.data;
        const exists = await models_1.User.findOne({
            where: {
                [sequelize_1.Op.or]: [{ username }, { email }],
            },
            attributes: ['id'],
        });
        if (exists) {
            return (0, response_1.fail)(res, 409, '用户名或邮箱已存在');
        }
        const roleExists = await models_1.Role.findOne({ where: { code: role }, attributes: ['id'] });
        if (!roleExists) {
            return (0, response_1.fail)(res, 400, '角色不存在');
        }
        const hash = bcryptjs_1.default.hashSync(password, 10);
        const user = await models_1.User.create({
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
        (0, response_1.created)(res, { id: user.id, username, email, nickname, role, status });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/:id/reset-password', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const user = await models_1.User.findByPk(req.params.id, { attributes: ['id', 'is_superuser'], raw: true });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        const passwordHash = bcryptjs_1.default.hashSync(parsed.data.password, 10);
        await models_1.User.update({ password_hash: passwordHash, updated_at: new Date() }, { where: { id: req.params.id } });
        (0, response_1.message)(res, '密码已重置');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = updateUserSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const user = await models_1.User.findByPk(req.params.id, { attributes: ['id', 'is_superuser'], raw: true });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        if (user.is_superuser && parsed.data.role && parsed.data.role !== 'admin') {
            if (req.user.id !== user.id) {
                return (0, response_1.fail)(res, 403, '超级管理员角色不可更改');
            }
        }
        const updates = {};
        if (parsed.data.nickname !== undefined)
            updates.nickname = parsed.data.nickname;
        if (parsed.data.email !== undefined)
            updates.email = parsed.data.email;
        if (parsed.data.role !== undefined)
            updates.role = parsed.data.role;
        if (parsed.data.status !== undefined)
            updates.status = parsed.data.status;
        if (parsed.data.password !== undefined)
            updates.password_hash = bcryptjs_1.default.hashSync(parsed.data.password, 10);
        if (Object.keys(updates).length === 0) {
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        }
        updates.updated_at = new Date();
        await models_1.User.update(updates, { where: { id: req.params.id } });
        const updated = await models_1.User.findByPk(req.params.id, {
            attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'created_at', 'updated_at'],
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
        const user = await models_1.User.findByPk(req.params.id, { attributes: ['id', 'is_superuser', 'username'], raw: true });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        if (user.is_superuser) {
            return (0, response_1.fail)(res, 403, '不能删除超级管理员');
        }
        if (user.id === req.user.id) {
            return (0, response_1.fail)(res, 403, '不能删除自己');
        }
        await models_1.User.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '用户已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map