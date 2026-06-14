"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50),
    type: zod_1.z.enum(['development', 'staging', 'production', 'testing']),
    project_id: zod_1.z.number().int().positive(),
    deploy_url: zod_1.z.string().url().optional(),
    description: zod_1.z.string().max(500).optional(),
});
const updateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(50).optional(),
    deploy_url: zod_1.z.string().url().optional(),
    description: zod_1.z.string().max(500).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { project_id } = req.query;
        const where = project_id ? { project_id } : undefined;
        const rows = await models_1.Environment.findAll({
            where,
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.User, as: 'creator', attributes: ['username'] },
            ],
            order: [['id', 'DESC']],
            raw: true,
        });
        const items = rows.map((r) => {
            const plain = r.get({ plain: true });
            return {
                ...plain,
                project_name: plain.project?.name ?? null,
                creator_name: plain.creator?.username ?? null,
            };
        });
        (0, response_1.ok)(res, items);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const env = await models_1.Environment.findByPk(req.params.id, {
            include: [
                { model: models_1.Project, as: 'project', attributes: ['name'] },
                { model: models_1.User, as: 'creator', attributes: ['username'] },
            ],
            raw: true,
        });
        if (!env)
            return (0, response_1.fail)(res, 404, '环境不存在');
        const plain = env.get({ plain: true });
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
        const exists = await models_1.Environment.findOne({ where: { project_id: parsed.data.project_id, name: parsed.data.name } });
        if (exists)
            return (0, response_1.fail)(res, 409, '同项目下环境名称已存在');
        const env = await models_1.Environment.create({
            name: parsed.data.name,
            type: parsed.data.type,
            project_id: parsed.data.project_id,
            deploy_url: parsed.data.deploy_url ?? null,
            description: parsed.data.description ?? null,
            status: 'active',
            created_by: req.user.id,
            created_at: new Date(),
            updated_at: new Date(),
        });
        (0, response_1.created)(res, { id: env.id, ...parsed.data });
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
        const env = await models_1.Environment.findByPk(req.params.id, { raw: true });
        if (!env)
            return (0, response_1.fail)(res, 404, '环境不存在');
        const updates = {};
        const data = parsed.data;
        if (data.name !== undefined)
            updates.name = data.name;
        if (data.deploy_url !== undefined)
            updates.deploy_url = data.deploy_url;
        if (data.description !== undefined)
            updates.description = data.description;
        if (data.status !== undefined)
            updates.status = data.status;
        if (Object.keys(updates).length === 0)
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        updates.updated_at = new Date();
        await models_1.Environment.update(updates, { where: { id: req.params.id } });
        const updated = await models_1.Environment.findByPk(req.params.id, { raw: true });
        (0, response_1.ok)(res, updated);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const env = await models_1.Environment.findByPk(req.params.id, { raw: true });
        if (!env)
            return (0, response_1.fail)(res, 404, '环境不存在');
        await models_1.Environment.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '环境已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map