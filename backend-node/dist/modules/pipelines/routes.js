"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    project_id: zod_1.z.number().int().positive(),
    trigger_type: zod_1.z.enum(['manual', 'push', 'tag', 'schedule']).optional().default('manual'),
    branch_filter: zod_1.z.string().max(200).optional(),
    config: zod_1.z.string().max(10000).optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    trigger_type: zod_1.z.enum(['manual', 'push', 'tag', 'schedule']).optional(),
    branch_filter: zod_1.z.string().max(200).optional(),
    config: zod_1.z.string().max(10000).optional(),
    status: zod_1.z.enum(['enabled', 'disabled']).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { project_id, page = '1', pageSize = '20' } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const offset = (p - 1) * ps;
        const where = project_id ? { project_id } : undefined;
        const { rows, count } = await models_1.Pipeline.findAndCountAll({
            where,
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.User, as: 'creator', attributes: ['username'] },
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
                creator_name: plain.creator?.username ?? null,
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
        const row = await models_1.Pipeline.findByPk(req.params.id, {
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.User, as: 'creator', attributes: ['username'] },
            ],
        });
        if (!row)
            return (0, response_1.fail)(res, 404, '流水线不存在');
        const plain = row.get({ plain: true });
        (0, response_1.ok)(res, { ...plain, project_name: plain.project?.name ?? null, creator_name: plain.creator?.username ?? null });
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
        const pipeline = await models_1.Pipeline.create({
            name: parsed.data.name,
            project_id: parsed.data.project_id,
            trigger_type: parsed.data.trigger_type,
            branch_filter: parsed.data.branch_filter ?? null,
            config: parsed.data.config ?? null,
            status: 'enabled',
            created_by: req.user.id,
            created_at: new Date(),
            updated_at: new Date(),
        });
        (0, response_1.created)(res, { id: pipeline.id, ...parsed.data });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        const pipeline = await models_1.Pipeline.findByPk(req.params.id, { raw: true });
        if (!pipeline)
            return (0, response_1.fail)(res, 404, '流水线不存在');
        const updates = {};
        const data = parsed.data;
        if (data.name !== undefined)
            updates.name = data.name;
        if (data.trigger_type !== undefined)
            updates.trigger_type = data.trigger_type;
        if (data.branch_filter !== undefined)
            updates.branch_filter = data.branch_filter;
        if (data.config !== undefined)
            updates.config = data.config;
        if (data.status !== undefined)
            updates.status = data.status;
        if (Object.keys(updates).length === 0)
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        updates.updated_at = new Date();
        await models_1.Pipeline.update(updates, { where: { id: req.params.id } });
        const updated = await models_1.Pipeline.findByPk(req.params.id, { raw: true });
        (0, response_1.ok)(res, updated);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const pipeline = await models_1.Pipeline.findByPk(req.params.id, { raw: true });
        if (!pipeline)
            return (0, response_1.fail)(res, 404, '流水线不存在');
        await models_1.Pipeline.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '流水线已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map