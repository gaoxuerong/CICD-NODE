import { Router } from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { authMiddleware } from '../../common/auth-middleware';
import { decrypt } from '../../common/crypto';
import { logger } from '../../common/logger';
import { canAccessProject, getAccessibleProjectIds } from '../../common/project-access';
import { ok, fail, created, message } from '../../common/response';
import { Build, Environment, GitCredential, Project, Pipeline, User } from '../../db/models';
import {
  GithubApiError,
  GithubNetworkError,
  getLatestWorkflowRun,
  mapGithubRunStatus,
  triggerWorkflow,
} from '../../services/github-actions';
import { notifyProjectEvent } from '../../services/notification-service';

const router = Router();

const createSchema = z.object({
  pipeline_id: z.coerce.number().int().positive().optional(),
  project_id: z.coerce.number().int().positive(),
  branch: z.string().max(100).optional().default('main'),
  commit_sha: z.string().max(100).optional(),
  commit_message: z.string().max(500).optional(),
});

function normalizeBuildInput(body: any) {
  if (!body || typeof body !== 'object') return body;
  return {
    ...body,
    project_id: body.project_id ?? body.projectId,
    pipeline_id: body.pipeline_id ?? body.pipelineId,
    commit_sha: body.commit_sha ?? body.commitSha,
    commit_message: body.commit_message ?? body.commitMessage,
  };
}

function parsePipelineConfig(value: unknown): {
  provider?: string;
  workflow_id?: string;
  workflowId?: string;
  ref?: string;
  inputs?: Record<string, string>;
} {
  if (!value) return {};
  if (typeof value === 'object') return value as any;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string') {
      return parsePipelineConfig(parsed);
    }
    return parsed;
  } catch {
    return {};
  }
}

function toBuildStatus(runStatus: string | undefined, fallback = 'pending') {
  return runStatus ?? fallback;
}

async function notifyBuildTriggerFailure(projectId: number | undefined, triggerUserId: number | undefined, reason: string) {
  if (!projectId || !triggerUserId) return;

  const project = await Project.findByPk(projectId, { attributes: ['name'], raw: true });
  await notifyProjectEvent({
    projectId,
    triggerUserId,
    title: `构建触发失败：${project?.name ?? `项目 ${projectId}`}`,
    content: [
      `项目：${project?.name ?? projectId}`,
      `原因：${reason}`,
    ].join('\n'),
    email: true,
  });
}

/**
 * @swagger
 * /api/builds:
 *   get:
 *     tags: [Builds]
 *     summary: 获取构建列表（分页）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: 按项目筛选
 *       - in: query
 *         name: pipeline_id
 *         schema:
 *           type: integer
 *         description: 按流水线筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, success, failed, cancelled]
 *         description: 按状态筛选
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
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
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Build'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id, pipeline_id, status, page = '1', pageSize = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const where: any = {};
    if (project_id) where.project_id = project_id;
    if (pipeline_id) where.pipeline_id = pipeline_id;
    if (status) where.status = status;
    const accessibleProjectIds = await getAccessibleProjectIds(req.user!);
    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return ok(res, { items: [], total: 0, page: p, pageSize: ps });
    }
    if (accessibleProjectIds) {
      if (project_id && !accessibleProjectIds.includes(Number(project_id))) {
        return ok(res, { items: [], total: 0, page: p, pageSize: ps });
      }
      if (!project_id) {
        where.project_id = { [Op.in]: accessibleProjectIds };
      }
    }

    const { rows, count } = await Build.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: Environment, as: 'environment', attributes: ['name', 'type'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
      ],
      order: [['id', 'DESC']],
      limit: ps,
      offset,
    });

    const items = rows.map((row) => {
      const plain = row.get({ plain: true }) as any;
      return {
        ...plain,
        project_name: plain.project?.name ?? null,
        pipeline_name: plain.pipeline?.name ?? null,
        environment_name: plain.environment?.name ?? null,
        environment_type: plain.environment?.type ?? null,
        trigger_by_name: plain.triggerUser?.username ?? null,
      };
    });

    ok(res, { items, total: count, page: p, pageSize: ps });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/builds/{id}:
 *   get:
 *     tags: [Builds]
 *     summary: 获取构建详情
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
 *         description: 构建不存在
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Pipeline, as: 'pipeline', attributes: ['name'] },
        { model: Environment, as: 'environment', attributes: ['name', 'type'] },
        { model: User, as: 'triggerUser', attributes: ['username'] },
      ],
    });

    if (!build) return fail(res, 404, '构建不存在');
    const plain = build.get({ plain: true }) as any;
    if (!(await canAccessProject(req.user!, plain.project_id, 'view'))) {
      return fail(res, 403, '没有权限访问该构建');
    }
    ok(res, {
      ...plain,
      project_name: plain.project?.name ?? null,
      pipeline_name: plain.pipeline?.name ?? null,
      environment_name: plain.environment?.name ?? null,
      environment_type: plain.environment?.type ?? null,
      trigger_by_name: plain.triggerUser?.username ?? null,
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:id/logs', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, { attributes: ['id', 'project_id', 'logs'], raw: true });
    if (!build) return fail(res, 404, '构建不存在');
    if (!(await canAccessProject(req.user!, build.project_id, 'view'))) {
      return fail(res, 403, '没有权限访问该构建日志');
    }
    ok(res, build.logs ?? '');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/builds:
 *   post:
 *     tags: [Builds]
 *     summary: 触发构建
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [project_id]
 *             properties:
 *               project_id:
 *                 type: integer
 *               pipeline_id:
 *                 type: integer
 *               branch:
 *                 type: string
 *                 default: main
 *               commit_sha:
 *                 type: string
 *               commit_message:
 *                 type: string
 *     responses:
 *       201:
 *         description: 构建已触发
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 项目不存在
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(normalizeBuildInput(req.body));
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const project = await Project.findByPk(parsed.data.project_id, { raw: true });
    if (!project) return fail(res, 404, '项目不存在');
    if (!(await canAccessProject(req.user!, parsed.data.project_id, 'triggerBuild'))) {
      return fail(res, 403, '没有权限触发该项目构建');
    }

    if (project.source !== 'github') {
      return fail(res, 400, '当前版本只支持 source=github 的 GitHub Actions 构建');
    }

    const githubOwner = project.github_owner?.trim();
    const githubRepo = project.github_repo?.trim();

    if (!githubOwner || !githubRepo) {
      return fail(res, 400, '项目缺少 github_owner 或 github_repo');
    }

    if (!project.git_credential_id) {
      return fail(res, 400, '项目未绑定 GitHub Token 凭据');
    }

    const credential = await GitCredential.findByPk(project.git_credential_id, { raw: true });
    if (!credential) return fail(res, 400, 'Git 凭据不存在');
    if (credential.type !== 'token') return fail(res, 400, 'GitHub Actions 构建当前只支持 token 类型凭据');

    const pipeline = parsed.data.pipeline_id
      ? await Pipeline.findByPk(parsed.data.pipeline_id, { raw: true })
      : null;

    if (parsed.data.pipeline_id && !pipeline) {
      return fail(res, 404, '流水线不存在');
    }
    if (pipeline && pipeline.project_id !== parsed.data.project_id) {
      return fail(res, 400, '流水线不属于该项目');
    }
    if (pipeline && pipeline.status !== 'enabled') {
      return fail(res, 400, '流水线已禁用');
    }
    if (!pipeline?.environment_id) {
      return fail(res, 400, '流水线未绑定目标环境');
    }

    const environment = await Environment.findOne({
      where: { id: pipeline.environment_id, project_id: parsed.data.project_id },
      attributes: ['id', 'name', 'type'],
      raw: true,
    });
    if (!environment) return fail(res, 400, '目标环境不存在或不属于该项目');

    const pipelineConfig = parsePipelineConfig(pipeline?.config);
    const workflowId = (pipelineConfig.workflow_id ?? pipelineConfig.workflowId)?.trim();
    if (!workflowId) {
      return fail(res, 400, '流水线配置缺少 workflow_id，例如 build.yml');
    }

    const token = decrypt(credential.credential);
    const ref = (pipelineConfig.ref ?? parsed.data.branch ?? project.default_branch ?? 'main').trim();
    const inputs = {
      ...(pipelineConfig.inputs ?? {}),
      branch: parsed.data.branch ?? ref,
    };

    await triggerWorkflow({
      token,
      owner: githubOwner,
      repo: githubRepo,
      workflowId,
      ref,
      inputs,
    });

    // GitHub dispatch API returns 204 and no run id. Query the latest run after dispatch.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const run = await getLatestWorkflowRun({
      token,
      owner: githubOwner,
      repo: githubRepo,
      workflowId,
      ref,
      inputs,
    });

    const maxBuild = await Build.max('build_number', { where: { project_id: parsed.data.project_id } }) as number | null;
    const buildNumber = (maxBuild ?? 0) + 1;

    const build = await Build.create({
      build_number: buildNumber,
      pipeline_id: parsed.data.pipeline_id ?? null,
      project_id: parsed.data.project_id,
      environment_id: environment.id,
      branch: parsed.data.branch ?? ref,
      commit_sha: parsed.data.commit_sha ?? null,
      commit_message: parsed.data.commit_message ?? null,
      status: toBuildStatus(run ? mapGithubRunStatus(run) : undefined),
      trigger_by: req.user!.id,
      logs: run?.html_url ? `GitHub Actions: ${run.html_url}` : 'GitHub Actions workflow dispatched.',
      started_at: run?.run_started_at ? new Date(run.run_started_at) : new Date(),
      github_run_id: run?.id ?? null,
      github_run_url: run?.html_url ?? null,
      github_workflow_id: workflowId,
      github_workflow_name: run?.name ?? null,
      created_at: new Date(),
    });

    created(res, {
      id: build.id,
      build_number: buildNumber,
      status: build.status,
      environment_id: build.environment_id,
      environment_name: environment.name,
      environment_type: environment.type,
      github_run_id: build.github_run_id,
      github_run_url: build.github_run_url,
    });
  } catch (err) {
    logger.error('build_trigger_error', {
      userId: req.user?.id,
      body: normalizeBuildInput(req.body),
      error: err,
    });
    if (err instanceof GithubApiError) {
      if (err.status === 403) {
        await notifyBuildTriggerFailure(normalizeBuildInput(req.body)?.project_id, req.user?.id, 'GitHub Token 权限不足');
        return fail(res, 400, 'GitHub Token 权限不足：请确认该 Token 对此私有仓库有 Actions Read and write 权限');
      }
      if (err.status === 404) {
        await notifyBuildTriggerFailure(normalizeBuildInput(req.body)?.project_id, req.user?.id, 'GitHub 仓库或 workflow 不存在');
        return fail(res, 400, 'GitHub 仓库或 workflow 不存在：请检查 owner、repo、workflow_id、ref，以及 Token 是否有该私有仓库权限');
      }
      await notifyBuildTriggerFailure(normalizeBuildInput(req.body)?.project_id, req.user?.id, `GitHub API 调用失败：${err.status}`);
      return fail(res, 400, `GitHub API 调用失败：${err.status}`);
    }
    if (err instanceof GithubNetworkError) {
      logger.error('github_network_error', {
        path: err.path,
        method: err.method,
        causeMessage: err.causeMessage,
      });
      await notifyBuildTriggerFailure(normalizeBuildInput(req.body)?.project_id, req.user?.id, `GitHub 网络请求失败：${err.causeMessage}`);
      return fail(res, 400, `GitHub 网络请求失败：${err.causeMessage}`);
    }
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/builds/{id}/cancel:
 *   post:
 *     tags: [Builds]
 *     summary: 取消构建
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
 *         description: 取消成功
 *       400:
 *         description: 当前状态不可取消
 *       404:
 *         description: 构建不存在
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, { attributes: ['id', 'project_id', 'trigger_by', 'status'], raw: true });

    if (!build) return fail(res, 404, '构建不存在');
    const canCancelByProjectRole = await canAccessProject(req.user!, build.project_id, 'triggerBuild');
    if (!canCancelByProjectRole && build.trigger_by !== req.user!.id) {
      return fail(res, 403, '没有权限取消该构建');
    }
    if (!['pending', 'running'].includes(build.status)) {
      return fail(res, 400, '当前状态不可取消');
    }

    await Build.update({ status: 'cancelled', finished_at: new Date() }, { where: { id: req.params.id } });
    message(res, '构建已取消');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

/**
 * @swagger
 * /api/builds/{id}/retry:
 *   post:
 *     tags: [Builds]
 *     summary: 重试构建
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: 重试成功
 *       404:
 *         description: 构建不存在
 */
router.post('/:id/retry', authMiddleware, async (req, res) => {
  try {
    const build = await Build.findByPk(req.params.id, { raw: true });

    if (!build) return fail(res, 404, '构建不存在');
    const canRetryByProjectRole = await canAccessProject(req.user!, build.project_id, 'triggerBuild');
    if (!canRetryByProjectRole && build.trigger_by !== req.user!.id) {
      return fail(res, 403, '没有权限重试该构建');
    }

    const maxBuild = await Build.max('build_number', { where: { project_id: build.project_id } }) as number | null;
    const buildNumber = (maxBuild ?? 0) + 1;

    const newBuild = await Build.create({
      build_number: buildNumber,
      pipeline_id: build.pipeline_id,
      project_id: build.project_id,
      environment_id: build.environment_id,
      branch: build.branch,
      commit_sha: build.commit_sha,
      commit_message: build.commit_message,
      status: 'running',
      trigger_by: req.user!.id,
      started_at: new Date(),
      created_at: new Date(),
    });

    created(res, { id: newBuild.id, build_number: buildNumber, status: 'running' });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
