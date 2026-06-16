import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, created, message } from '../../common/response';
import { Permission } from '../../db/models';

const router = Router();

const createPermSchema = z.object({
  code: z.string().min(2).max(100),
  name: z.string().min(1).max(100),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: 获取权限列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: 按资源筛选
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 0
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       resource:
 *                         type: string
 *                       action:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { resource } = req.query as any;

    const where = resource ? { resource } : undefined;

    const rows = await Permission.findAll({
      where,
      attributes: ['id', 'code', 'name', 'resource', 'action', 'description', 'created_at'],
      order: [['resource', 'ASC'], ['action', 'ASC']],
      raw: true,
    });

    ok(res, rows);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: 获取权限详情
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *       404:
 *         description: 权限不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await Permission.findByPk(req.params.id, {
      attributes: ['id', 'code', 'name', 'resource', 'action', 'description', 'created_at'],
      raw: true,
    });

    if (!perm) {
      return fail(res, 404, '权限不存在');
    }

    ok(res, perm);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: 创建权限
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, resource, action]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: project:create
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: 创建项目
 *               resource:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: project
 *               action:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: create
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 权限编码已存在
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createPermSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, parsed.error.issues[0].message);
    }

    const { code, name, resource, action, description } = parsed.data;

    const exists = await Permission.findOne({ where: { code }, attributes: ['id'] });
    if (exists) {
      return fail(res, 409, '权限编码已存在');
    }

    const perm = await Permission.create({
      code,
      name,
      resource,
      action,
      description: description ?? null,
      created_at: new Date(),
    });

    created(res, { id: perm.id, code, name, resource, action, description });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     tags: [Permissions]
 *     summary: 删除权限
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 权限不存在
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const perm = await Permission.findByPk(req.params.id, { attributes: ['id', 'code'], raw: true });

    if (!perm) {
      return fail(res, 404, '权限不存在');
    }

    await Permission.destroy({ where: { id: req.params.id } });
    message(res, '权限已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
