"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const DEFAULT_SETTINGS = {
    'app.name': 'CICD Platform',
    'app.version': '1.0.0',
    'app.timezone': 'Asia/Shanghai',
    'auth.login_attempts_max': '5',
    'auth.lockout_duration_minutes': '30',
    'pipeline.default_timeout_minutes': '30',
    'pipeline.max_concurrent_builds': '3',
    'notification.enabled': 'true',
    'notification.types': 'build,deploy,system',
    'git.auto_sync': 'false',
    'git.sync_interval_minutes': '5',
    'ui.language': 'zh-CN',
    'ui.theme': 'light',
};
router.get('/', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const rows = await models_1.SystemSetting.findAll({
            attributes: ['id', 'key', 'value', 'updated_at'],
            order: [['key', 'ASC']],
            raw: true,
        });
        const settings = {};
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
            settings[key] = DEFAULT_SETTINGS[key];
        }
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        (0, response_1.ok)(res, settings);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:key', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const row = await models_1.SystemSetting.findOne({ where: { key: req.params.key }, attributes: ['id', 'key', 'value', 'updated_at'] });
        if (!row) {
            const def = DEFAULT_SETTINGS[req.params.key];
            if (def !== undefined) {
                return (0, response_1.ok)(res, { key: req.params.key, value: def, is_default: true });
            }
            return (0, response_1.fail)(res, 404, '设置项不存在');
        }
        (0, response_1.ok)(res, row);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { settings } = req.body ?? {};
        if (!settings || typeof settings !== 'object') {
            return (0, response_1.fail)(res, 400, 'settings 必须为对象');
        }
        for (const [k, v] of Object.entries(settings)) {
            if (typeof v !== 'string')
                continue;
            await models_1.SystemSetting.upsert({ key: k, value: v, updated_at: new Date() });
        }
        (0, response_1.message)(res, '设置已更新');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:key', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { value } = req.body ?? {};
        if (value === undefined)
            return (0, response_1.fail)(res, 400, '缺少 value');
        await models_1.SystemSetting.upsert({ key: req.params.key, value: String(value), updated_at: new Date() });
        (0, response_1.message)(res, '设置已更新');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:key', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const deleted = await models_1.SystemSetting.destroy({ where: { key: req.params.key } });
        if (deleted === 0) {
            return (0, response_1.fail)(res, 404, '设置项不存在');
        }
        (0, response_1.message)(res, '设置已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map