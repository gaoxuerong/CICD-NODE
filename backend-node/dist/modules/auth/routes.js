"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const sequelize_1 = require("sequelize");
const auth_1 = require("../../common/auth");
const rate_limiter_1 = require("../../common/rate-limiter");
const response_1 = require("../../common/response");
const auth_middleware_1 = require("../../common/auth-middleware");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const updateProfileSchema = zod_1.z.object({
    nickname: zod_1.z.string().max(100).optional(),
    email: zod_1.z.string().email().optional(),
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
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body ?? {};
        if (!username || !password) {
            return (0, response_1.fail)(res, 400, '用户名和密码不能为空');
        }
        const ip = (req.ip ?? req.socket.remoteAddress ?? 'unknown');
        const user = await models_1.User.findOne({ where: { username } });
        if (!user) {
            return (0, response_1.fail)(res, 401, '用户名或密码错误');
        }
        if (user.status !== 'active') {
            return (0, response_1.fail)(res, 403, '账号已被禁用');
        }
        (0, rate_limiter_1.checkLoginRateLimit)(ip, user.id);
        const valid = bcryptjs_1.default.compareSync(password, user.password_hash);
        if (!valid) {
            return (0, response_1.fail)(res, 401, '用户名或密码错误');
        }
        (0, rate_limiter_1.resetLoginRateLimit)(ip, user.id);
        await models_1.User.update({ last_login_at: new Date() }, { where: { id: user.id } });
        const accessToken = (0, auth_1.createAccessToken)(user.id);
        const refreshToken = (0, auth_1.createRefreshToken)(user.id);
        const safeUser = user.get({ plain: true });
        delete safeUser.password_hash;
        (0, response_1.ok)(res, {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: safeUser,
            token: accessToken,
            refreshToken,
            userInfo: safeUser,
        });
    }
    catch (err) {
        if (err?.message?.includes('登录') || err?.message?.includes('频繁')) {
            return (0, response_1.fail)(res, 429, err.message);
        }
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/logout', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const header = req.headers.authorization;
        const token = header?.split(' ')[1];
        if (token) {
            await (0, auth_1.blacklistToken)(token, req.user.id);
        }
        (0, response_1.message)(res, '已退出登录');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.body?.refresh_token ?? req.body?.refreshToken;
        if (!refreshToken) {
            return (0, response_1.fail)(res, 400, '缺少 refresh_token');
        }
        const payload = (0, auth_1.verifyToken)(refreshToken, 'refresh');
        if (!payload) {
            return (0, response_1.fail)(res, 401, '无效的 refresh_token');
        }
        if (await (0, auth_1.isTokenBlacklisted)(refreshToken)) {
            return (0, response_1.fail)(res, 401, 'refresh_token 已被吊销');
        }
        await (0, auth_1.blacklistToken)(refreshToken, Number(payload.sub));
        const newAccessToken = (0, auth_1.createAccessToken)(Number(payload.sub));
        const newRefreshToken = (0, auth_1.createRefreshToken)(Number(payload.sub));
        (0, response_1.ok)(res, {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/profile', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await models_1.User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
            raw: true,
        });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        const roleObj = await models_1.Role.findOne({ where: { code: user.role }, attributes: ['permissions'] });
        const permissions = parsePermissions(roleObj?.permissions);
        (0, response_1.ok)(res, { ...user.get({ plain: true }), permissions });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/profile', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const updates = {};
        if (parsed.data.nickname !== undefined) {
            updates.nickname = parsed.data.nickname;
        }
        if (parsed.data.email !== undefined) {
            const exists = await models_1.User.findOne({ where: { email: parsed.data.email, id: { [sequelize_1.Op.ne]: req.user.id } } });
            if (exists) {
                return (0, response_1.fail)(res, 409, '邮箱已存在');
            }
            updates.email = parsed.data.email;
        }
        if (Object.keys(updates).length === 0) {
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        }
        updates.updated_at = new Date();
        await models_1.User.update(updates, { where: { id: req.user.id } });
        const user = await models_1.User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'last_login_at', 'created_at', 'updated_at'],
            raw: true,
        });
        (0, response_1.ok)(res, user);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map