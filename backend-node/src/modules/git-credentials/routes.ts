import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { encrypt, decrypt } from '../../common/crypto';
import { ok, fail, created, message } from '../../common/response';
import { GitCredential, User, AuditLog } from '../../db/models';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['ssh_key', 'token', 'password', 'oauth']),
  username: z.string().max(100).optional(),
  credential: z.string().min(1),
  description: z.string().max(500).optional(),
});

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const rows = await GitCredential.findAll({
      attributes: ['id', 'name', 'type', 'username', 'description', 'created_by', 'created_at', 'updated_at'],
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      order: [['id', 'DESC']],
      raw: true,
    });

    const masked = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        credential: '********',
        creator_name: (plain as any).creator?.username ?? null,
      };
    });

    ok(res, masked);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cred = await GitCredential.findByPk(req.params.id, {
      attributes: ['id', 'name', 'type', 'username', 'description', 'created_by', 'created_at', 'updated_at'],
      include: [{ model: User, as: 'creator', attributes: ['username'] }],
      raw: true,
    });

    if (!cred) return fail(res, 404, '凭证不存在');

    const plain = cred.get({ plain: true });
    ok(res, { ...plain, credential: '********', creator_name: (plain as any).creator?.username ?? null });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const { name, type, username, credential, description } = parsed.data;

    const encrypted = encrypt(credential);

    const cred = await GitCredential.create({
      name,
      type,
      username: username ?? null,
      credential: encrypted,
      description: description ?? null,
      created_by: req.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    created(res, { id: cred.id, name, type, username, description, credential: '********' });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const cred = await GitCredential.findByPk(req.params.id, { raw: true });
    if (!cred) return fail(res, 404, '凭证不存在');

    const updates: Record<string, unknown> = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.type !== undefined) updates.type = req.body.type;
    if (req.body.username !== undefined) updates.username = req.body.username;
    if (req.body.credential !== undefined) updates.credential = encrypt(req.body.credential);
    if (req.body.description !== undefined) updates.description = req.body.description;

    if (Object.keys(updates).length === 0) return fail(res, 400, '没有需要更新的字段');

    updates.updated_at = new Date();
    await GitCredential.update(updates, { where: { id: req.params.id } });
    message(res, '凭证已更新');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id/decrypt', authMiddleware, async (req, res) => {
  try {
    const cred = await GitCredential.findByPk(req.params.id, { attributes: ['id', 'name', 'type', 'username', 'credential'], raw: true });

    if (!cred) return fail(res, 404, '凭证不存在');

    const plain = decrypt(cred.credential);

    await AuditLog.create({
      user_id: req.user!.id,
      username: req.user!.username,
      action: 'decrypt_credential',
      target_type: 'git_credential',
      target_name: cred.name,
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      details: `Decrypted credential: ${cred.name}`,
      created_at: new Date(),
    });

    ok(res, { id: cred.id, name: cred.name, type: cred.type, username: cred.username, credential: plain });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const cred = await GitCredential.findByPk(req.params.id, { attributes: ['id', 'name'], raw: true });

    if (!cred) return fail(res, 404, '凭证不存在');

    await GitCredential.destroy({ where: { id: req.params.id } });
    message(res, '凭证已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
