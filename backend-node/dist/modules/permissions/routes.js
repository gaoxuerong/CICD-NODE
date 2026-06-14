"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createPermSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(100),
    name: zod_1.z.string().min(1).max(100),
    resource: zod_1.z.string().min(1).max(50),
    action: zod_1.z.string().min(1).max(50),
    description: zod_1.z.string().max(500).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { resource } = req.query;
        const where = resource ? { resource } : undefined;
        const rows = await models_1.Permission.findAll({
            where,
            attributes: ['id', 'code', 'name', 'resource', 'action', 'description', 'created_at'],
            order: [['resource', 'ASC'], ['action', 'ASC']],
            raw: true,
        });
        (0, response_1.ok)(res, rows);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const perm = await models_1.Permission.findByPk(req.params.id, {
            attributes: ['id', 'code', 'name', 'resource', 'action', 'description', 'created_at'],
            raw: true,
        });
        if (!perm) {
            return (0, response_1.fail)(res, 404, '权限不存在');
        }
        (0, response_1.ok)(res, perm);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const parsed = createPermSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, response_1.fail)(res, 400, parsed.error.issues[0].message);
        }
        const { code, name, resource, action, description } = parsed.data;
        const exists = await models_1.Permission.findOne({ where: { code }, attributes: ['id'] });
        if (exists) {
            return (0, response_1.fail)(res, 409, '权限编码已存在');
        }
        const perm = await models_1.Permission.create({
            code,
            name,
            resource,
            action,
            description: description ?? null,
            created_at: new Date(),
        });
        (0, response_1.created)(res, { id: perm.id, code, name, resource, action, description });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const perm = await models_1.Permission.findByPk(req.params.id, { attributes: ['id', 'code'], raw: true });
        if (!perm) {
            return (0, response_1.fail)(res, 404, '权限不存在');
        }
        await models_1.Permission.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '权限已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map