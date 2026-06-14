"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../common/auth-middleware");
const crypto_1 = require("../../common/crypto");
const response_1 = require("../../common/response");
const models_1 = require("../../db/models");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['ssh_key', 'token', 'password', 'oauth']),
    username: zod_1.z.string().max(100).optional(),
    credential: zod_1.z.string().min(1),
    description: zod_1.z.string().max(500).optional(),
});
router.get('/', auth_middleware_1.authMiddleware, async (_req, res) => {
    try {
        const rows = await models_1.GitCredential.findAll({
            attributes: ['id', 'name', 'type', 'username', 'description', 'created_by', 'created_at', 'updated_at'],
            include: [{ model: models_1.User, as: 'creator', attributes: ['username'] }],
            order: [['id', 'DESC']],
            raw: true,
        });
        const masked = rows.map((r) => {
            const plain = r.get({ plain: true });
            return {
                ...plain,
                credential: '********',
                creator_name: plain.creator?.username ?? null,
            };
        });
        (0, response_1.ok)(res, masked);
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const cred = await models_1.GitCredential.findByPk(req.params.id, {
            attributes: ['id', 'name', 'type', 'username', 'description', 'created_by', 'created_at', 'updated_at'],
            include: [{ model: models_1.User, as: 'creator', attributes: ['username'] }],
            raw: true,
        });
        if (!cred)
            return (0, response_1.fail)(res, 404, '凭证不存在');
        const plain = cred.get({ plain: true });
        (0, response_1.ok)(res, { ...plain, credential: '********', creator_name: plain.creator?.username ?? null });
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
        const { name, type, username, credential, description } = parsed.data;
        const encrypted = (0, crypto_1.encrypt)(credential);
        const cred = await models_1.GitCredential.create({
            name,
            type,
            username: username ?? null,
            credential: encrypted,
            description: description ?? null,
            created_by: req.user.id,
            created_at: new Date(),
            updated_at: new Date(),
        });
        (0, response_1.created)(res, { id: cred.id, name, type, username, description, credential: '********' });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.put('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const cred = await models_1.GitCredential.findByPk(req.params.id, { raw: true });
        if (!cred)
            return (0, response_1.fail)(res, 404, '凭证不存在');
        const updates = {};
        if (req.body.name !== undefined)
            updates.name = req.body.name;
        if (req.body.type !== undefined)
            updates.type = req.body.type;
        if (req.body.username !== undefined)
            updates.username = req.body.username;
        if (req.body.credential !== undefined)
            updates.credential = (0, crypto_1.encrypt)(req.body.credential);
        if (req.body.description !== undefined)
            updates.description = req.body.description;
        if (Object.keys(updates).length === 0)
            return (0, response_1.fail)(res, 400, '没有需要更新的字段');
        updates.updated_at = new Date();
        await models_1.GitCredential.update(updates, { where: { id: req.params.id } });
        (0, response_1.message)(res, '凭证已更新');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.get('/:id/decrypt', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const cred = await models_1.GitCredential.findByPk(req.params.id, { attributes: ['id', 'name', 'type', 'username', 'credential'], raw: true });
        if (!cred)
            return (0, response_1.fail)(res, 404, '凭证不存在');
        const plain = (0, crypto_1.decrypt)(cred.credential);
        await models_1.AuditLog.create({
            user_id: req.user.id,
            username: req.user.username,
            action: 'decrypt_credential',
            target_type: 'git_credential',
            target_name: cred.name,
            ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
            details: `Decrypted credential: ${cred.name}`,
            created_at: new Date(),
        });
        (0, response_1.ok)(res, { id: cred.id, name: cred.name, type: cred.type, username: cred.username, credential: plain });
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
router.delete('/:id', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const cred = await models_1.GitCredential.findByPk(req.params.id, { attributes: ['id', 'name'], raw: true });
        if (!cred)
            return (0, response_1.fail)(res, 404, '凭证不存在');
        await models_1.GitCredential.destroy({ where: { id: req.params.id } });
        (0, response_1.message)(res, '凭证已删除');
    }
    catch {
        (0, response_1.fail)(res, 500, '服务器内部错误');
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map