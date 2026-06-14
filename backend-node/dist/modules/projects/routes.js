"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const sequelize_1 = require("sequelize");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(1000).optional(),
    git_url: zod_1.z.string().url().optional(),
    language: zod_1.z.string().max(50).optional(),
    source: zod_1.z.enum(['local', 'github']).optional().default('local'),
    github_owner: zod_1.z.string().optional(),
    github_repo: zod_1.z.string().optional(),
    github_default_branch: zod_1.z.string().optional().default('main'),
});
const updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(1000).optional(),
    git_url: zod_1.z.string().url().optional(),
    language: zod_1.z.string().max(50).optional(),
    status: zod_1.z.enum(['active', 'archived']).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { page = '1', pageSize = '20', keyword } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
        const offset = (p - 1) * ps;
        const where = keyword
            ? { [sequelize_1.Op.or]: [{ name: { [sequelize_1.Op.like]: `%${keyword}%` } }, { description: { [sequelize_1.Op.like]: `%${keyword}%` } }] }
            : undefined;
        const { rows, count } = await models_1.Project.findAndCountAll({
            where,
            include: [{ model: models_1.User, as: 'creator', attributes: ['username'] }],
            order: [['id', 'DESC']],
            limit: ps,
            offset,
            raw: true,
        });
        const items = rows.map((r) => {
            const plain = r.get({ plain: true });
            return { ...plain, creator_name: plain.creator?.username ?? null };
        });
        (0, response_1.ok)(res, { items, total: count, page: p, pageSize: ps });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const project = await models_1.Project.findByPk(req.params.id, {
            include: [{ model: models_1.User, as: 'creator', attributes: ['username'] }],
            raw: true,
        });
        if (!project) {
            return (0, response_1.fail)(res, 404, '项目不存在');
        }
        const members = await models_1.ProjectMember.findAll({
            where: { project_id: req.params.id },
            include: [{ model: models_1.User, as: 'user', attributes: ['username', 'nickname', 'avatar'] }],
            raw: true,
        });
        const plain = project.get({ plain: true });
        (0, response_1.ok)(res, { ...plain, creator_name: plain.creator?.username ?? null, members });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = createProjectSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const { name, description, git_url, language, source, github_owner, github_repo, github_default_branch } = parsed.data;
        const exists = await models_1.Project.findOne({ where: { name }, attributes: ['id'] });
        if (exists) {
            return (0, response_1.fail)(res, 409, '项目名称已存在');
        }
        const project = await models_1.Project.create({
            name,
            description: description ?? null,
            git_url: git_url ?? null,
            language: language ?? null,
            status: 'active',
            source,
            github_owner: github_owner ?? null,
            github_repo: github_repo ?? null,
            github_default_branch,
            created_by: req.user.id,
            created_at: new Date(),
            updated_at: new Date(),
        });
        await models_1.ProjectMember.create({
            project_id: project.id,
            user_id: req.user.id,
            role: 'owner',
            joined_at: new Date(),
        });
        (0, response_1.created)(res, { id: project.id, name, description, source });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = updateProjectSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const project = await models_1.Project.findByPk(req.params.id, { raw: true });
        if (!project) {
            return (0, response_1.fail)(res, 404, '项目不存在');
        }
        const updates = {};
        if (parsed.data.name !== undefined)
            updates.name = parsed.data.name;
        if (parsed.data.description !== undefined)
            updates.description = parsed.data.description;
        if (parsed.data.git_url !== undefined)
            updates.git_url = parsed.data.git_url;
        if (parsed.data.language !== undefined)
            updates.language = parsed.data.language;
        if (parsed.data.status !== undefined)
            updates.status = parsed.data.status;
        if (Object.keys(updates).length === 0) {
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        }
        updates.updated_at = new Date();
        await models_1.Project.update(updates, { where: { id: req.params.id } });
        const updated = await models_1.Project.findByPk(req.params.id, { raw: true });
        (0, response_1.ok)(res, updated);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const project = await models_1.Project.findByPk(req.params.id, { raw: true });
        if (!project) {
            return (0, response_1.fail)(res, 404, '项目不存在');
        }
        await models_1.Project.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '项目已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id/members', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const members = await models_1.ProjectMember.findAll({
            where: { project_id: req.params.id },
            include: [{ model: models_1.User, as: 'user', attributes: ['username', 'nickname', 'avatar'] }],
            raw: true,
        });
        (0, response_1.ok)(res, members);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/:id/members', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { user_id, role = 'developer' } = req.body ?? {};
        if (!user_id) {
            return (0, response_1.fail)(res, 400, '缺少 user_id');
        }
        const project = await models_1.Project.findByPk(req.params.id, { raw: true });
        if (!project) {
            return (0, response_1.fail)(res, 404, '项目不存在');
        }
        const user = await models_1.User.findByPk(user_id, { raw: true });
        if (!user) {
            return (0, response_1.fail)(res, 404, '用户不存在');
        }
        const exists = await models_1.ProjectMember.findOne({ where: { project_id: req.params.id, user_id } });
        if (exists) {
            return (0, response_1.fail)(res, 409, '用户已是项目成员');
        }
        await models_1.ProjectMember.create({
            project_id: Number(req.params.id),
            user_id,
            role,
            joined_at: new Date(),
        });
        (0, response_1.message)(res, '成员已添加');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id/members/:userId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const member = await models_1.ProjectMember.findOne({
            where: { project_id: req.params.id, user_id: req.params.userId },
            attributes: ['id', 'role'],
        });
        if (!member) {
            return (0, response_1.fail)(res, 404, '成员不存在');
        }
        if (member.role === 'owner') {
            return (0, response_1.fail)(res, 403, '不能移除项目所有者');
        }
        await models_1.ProjectMember.destroy({ where: { project_id: req.params.id, user_id: req.params.userId } });
        (0, response_1.message)(res, '成员已移除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/:id/transfer', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { user_id } = req.body ?? {};
        if (!user_id) {
            return (0, response_1.fail)(res, 400, '缺少 user_id');
        }
        const projectId = req.params.id;
        const currentOwner = await models_1.ProjectMember.findOne({ where: { project_id: projectId, user_id: req.user.id, role: 'owner' } });
        if (!currentOwner) {
            return (0, response_1.fail)(res, 403, '只有项目所有者可以转让所有权');
        }
        const targetMember = await models_1.ProjectMember.findOne({ where: { project_id: projectId, user_id } });
        if (!targetMember) {
            return (0, response_1.fail)(res, 404, '目标用户不是项目成员');
        }
        await models_1.ProjectMember.update({ role: 'developer' }, { where: { project_id: projectId, user_id: req.user.id } });
        await models_1.ProjectMember.update({ role: 'owner' }, { where: { project_id: projectId, user_id } });
        (0, response_1.message)(res, '项目所有权已转让');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map