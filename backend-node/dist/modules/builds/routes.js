"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    pipeline_id: zod_1.z.number().int().positive().optional(),
    project_id: zod_1.z.number().int().positive(),
    branch: zod_1.z.string().max(100).optional().default('main'),
    commit_sha: zod_1.z.string().max(100).optional(),
    commit_message: zod_1.z.string().max(500).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { project_id, pipeline_id, status, page = '1', pageSize = '20' } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const offset = (p - 1) * ps;
        const where = {};
        if (project_id)
            where.project_id = project_id;
        if (pipeline_id)
            where.pipeline_id = pipeline_id;
        if (status)
            where.status = status;
        const { rows, count } = await models_1.Build.findAndCountAll({
            where: Object.keys(where).length ? where : undefined,
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.Pipeline, as: 'pipeline', attributes: ['name'] },
                { model: models_1.User, as: 'triggerUser', attributes: ['username'] },
            ],
            order: [['id', 'DESC']],
            limit: ps,
            offset,
        });
        const items = rows.map((row) => {
            const plain = row.get({ plain: true });
            return {
                ...plain,
                project_name: plain.project?.name ?? null,
                pipeline_name: plain.pipeline?.name ?? null,
                trigger_by_name: plain.triggerUser?.username ?? null,
            };
        });
        (0, response_1.ok)(res, { items, total: count, page: p, pageSize: ps });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const build = await models_1.Build.findByPk(req.params.id, {
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.Pipeline, as: 'pipeline', attributes: ['name'] },
                { model: models_1.User, as: 'triggerUser', attributes: ['username'] },
            ],
        });
        if (!build)
            return (0, response_1.fail)(res, 404, '构建不存在');
        const plain = build.get({ plain: true });
        (0, response_1.ok)(res, {
            ...plain,
            project_name: plain.project?.name ?? null,
            pipeline_name: plain.pipeline?.name ?? null,
            trigger_by_name: plain.triggerUser?.username ?? null,
        });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = createSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        const project = await models_1.Project.findByPk(parsed.data.project_id, { attributes: ['id'], raw: true });
        if (!project)
            return (0, response_1.fail)(res, 404, '项目不存在');
        const maxBuild = await models_1.Build.max('build_number', { where: { project_id: parsed.data.project_id } });
        const buildNumber = (maxBuild ?? 0) + 1;
        const build = await models_1.Build.create({
            build_number: buildNumber,
            pipeline_id: parsed.data.pipeline_id ?? null,
            project_id: parsed.data.project_id,
            branch: parsed.data.branch,
            commit_sha: parsed.data.commit_sha ?? null,
            commit_message: parsed.data.commit_message ?? null,
            status: 'running',
            trigger_by: req.user.id,
            started_at: new Date(),
            created_at: new Date(),
        });
        (0, response_1.created)(res, { id: build.id, build_number: buildNumber, status: 'running' });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/:id/cancel', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const build = await models_1.Build.findByPk(req.params.id, { attributes: ['id', 'status'], raw: true });
        if (!build)
            return (0, response_1.fail)(res, 404, '构建不存在');
        if (!['pending', 'running'].includes(build.status)) {
            return (0, response_1.fail)(res, 400, '当前状态不可取消');
        }
        await models_1.Build.update({ status: 'cancelled', finished_at: new Date() }, { where: { id: req.params.id } });
        (0, response_1.message)(res, '构建已取消');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/:id/retry', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const build = await models_1.Build.findByPk(req.params.id, { raw: true });
        if (!build)
            return (0, response_1.fail)(res, 404, '构建不存在');
        const maxBuild = await models_1.Build.max('build_number', { where: { project_id: build.project_id } });
        const buildNumber = (maxBuild ?? 0) + 1;
        const newBuild = await models_1.Build.create({
            build_number: buildNumber,
            pipeline_id: build.pipeline_id,
            project_id: build.project_id,
            branch: build.branch,
            commit_sha: build.commit_sha,
            commit_message: build.commit_message,
            status: 'running',
            trigger_by: req.user.id,
            started_at: new Date(),
            created_at: new Date(),
        });
        (0, response_1.created)(res, { id: newBuild.id, build_number: buildNumber, status: 'running' });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map