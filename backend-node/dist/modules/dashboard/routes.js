"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const projects = await models_1.Project.count();
        const pipelines = await models_1.Pipeline.count();
        const users = await models_1.User.count();
        const environments = await models_1.Environment.count();
        const buildTotal = await models_1.Build.count();
        const buildRunning = await models_1.Build.count({ where: { status: 'running' } });
        const buildSuccess = await models_1.Build.count({ where: { status: 'success' } });
        const buildFailed = await models_1.Build.count({ where: { status: 'failed' } });
        const buildSuccessRate = buildTotal > 0 ? Math.round((buildSuccess / buildTotal) * 100) : 0;
        (0, response_1.ok)(res, {
            projects,
            pipelines,
            users,
            environments,
            builds: {
                total: buildTotal,
                running: buildRunning,
                success: buildSuccess,
                failed: buildFailed,
                successRate: buildSuccessRate,
            },
        });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/recent-builds', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const rows = await models_1.Build.findAll({
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.Pipeline, as: 'pipeline', attributes: ['name'] },
                { model: models_1.User, as: 'triggerUser', attributes: ['username'] },
            ],
            order: [['id', 'DESC']],
            limit: 10,
            raw: true,
        });
        const items = rows.map((r) => {
            const plain = r.get({ plain: true });
            return {
                ...plain,
                project_name: plain.project?.name ?? null,
                pipeline_name: plain.pipeline?.name ?? null,
                trigger_by_name: plain.triggerUser?.username ?? null,
            };
        });
        (0, response_1.ok)(res, items);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/recent-projects', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const rows = await models_1.Project.findAll({
            include: [{ model: models_1.User, as: 'creator', attributes: ['username'] }],
            order: [['updated_at', 'DESC']],
            limit: 5,
            raw: true,
        });
        const items = rows.map((r) => {
            const plain = r.get({ plain: true });
            return { ...plain, creator_name: plain.creator?.username ?? null };
        });
        (0, response_1.ok)(res, items);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map