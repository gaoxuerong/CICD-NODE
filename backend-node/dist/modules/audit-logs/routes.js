"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { action, user_id, username, page = '1', pageSize = '50' } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
        const offset = (p - 1) * ps;
        const where = {};
        if (action)
            where.action = action;
        if (user_id)
            where.user_id = user_id;
        if (username)
            where.username = { [sequelize_1.Op.like]: `%${username}%` };
        const total = await models_1.AuditLog.count({ where: Object.keys(where).length ? where : undefined });
        const rows = await models_1.AuditLog.findAll({
            where: Object.keys(where).length ? where : undefined,
            include: [{ model: models_1.User, as: 'user', attributes: ['username'] }],
            order: [['id', 'DESC']],
            limit: ps,
            offset,
        });
        const items = rows.map((row) => {
            const plain = row.get({ plain: true });
            return { ...plain, username: plain.user?.username ?? plain.username ?? null };
        });
        (0, response_1.ok)(res, { items, total, page: p, pageSize: ps });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const log = await models_1.AuditLog.findByPk(req.params.id, {
            include: [{ model: models_1.User, as: 'user', attributes: ['username'] }],
        });
        if (!log)
            return (0, response_1.fail)(res, 404, '日志不存在');
        const plain = log.get({ plain: true });
        (0, response_1.ok)(res, { ...plain, username: plain.user?.username ?? plain.username ?? null });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map