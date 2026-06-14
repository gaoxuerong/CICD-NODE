"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { page = '1', pageSize = '20' } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const offset = (p - 1) * ps;
        const where = { user_id: req.user.id };
        const total = await models_1.Notification.count({ where });
        const rows = await models_1.Notification.findAll({
            where,
            order: [['id', 'DESC']],
            limit: ps,
            offset,
            raw: true,
        });
        (0, response_1.ok)(res, { items: rows, total, page: p, pageSize: ps });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/unread-count', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const count = await models_1.Notification.count({ where: { user_id: req.user.id, is_read: 0 } });
        (0, response_1.ok)(res, { count });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { title, content, target_user_id } = req.body ?? {};
        if (!title)
            return (0, response_1.fail)(res, 400, '通知标题不能为空');
        const notification = await models_1.Notification.create({
            user_id: target_user_id ?? req.user.id,
            title,
            content: content ?? null,
            is_read: 0,
            created_at: new Date(),
        });
        (0, response_1.created)(res, { id: notification.id, title, content });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id/read', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        await models_1.Notification.update({ is_read: 1 }, { where: { id: req.params.id, user_id: req.user.id } });
        (0, response_1.message)(res, '已标记为已读');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/read-all', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        await models_1.Notification.update({ is_read: 1 }, { where: { user_id: req.user.id, is_read: 0 } });
        (0, response_1.message)(res, '已全部标记为已读');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        await models_1.Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
        (0, response_1.message)(res, '通知已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map