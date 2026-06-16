import { decrypt } from '../common/crypto';
import { logger } from '../common/logger';
import { Build, GitCredential, Project } from '../db/models';
import { getWorkflowRun, mapGithubRunStatus } from './github-actions';
import { Op } from 'sequelize';
import { notifyBuildStatus } from './notification-service';
import { getSettings } from './settings-service';

let timer: NodeJS.Timeout | null = null;
let syncing = false;

export async function startBuildStatusSync() {
  if (timer) return;
  const settings = await getSettings(['git.sync_interval_minutes']);
  const intervalMinutes = Math.max(1, Number(settings['git.sync_interval_minutes'] || 5));
  timer = setInterval(() => {
    syncGithubBuilds().catch((err) => {
      logger.error('build_status_sync_error', { error: err });
    });
  }, intervalMinutes * 60_000);
  logger.info('build_status_sync_started', { intervalMinutes });
}

async function syncGithubBuilds() {
  if (syncing) return;
  syncing = true;

  try {
    const builds = await Build.findAll({
      where: { status: { [Op.in]: ['pending', 'running'] } },
      limit: 20,
      order: [['id', 'ASC']],
    });

    for (const build of builds) {
      const plain = build.get({ plain: true });
      if (!plain.github_run_id) continue;

      const project = await Project.findByPk(plain.project_id, { raw: true });
      const githubOwner = project?.github_owner?.trim();
      const githubRepo = project?.github_repo?.trim();
      if (!project || project.source !== 'github' || !githubOwner || !githubRepo || !project.git_credential_id) {
        continue;
      }

      const credential = await GitCredential.findByPk(project.git_credential_id, { raw: true });
      if (!credential || credential.type !== 'token') continue;

      const run = await getWorkflowRun({
        token: decrypt(credential.credential),
        owner: githubOwner,
        repo: githubRepo,
        runId: Number(plain.github_run_id),
      });

      const status = mapGithubRunStatus(run);
      const previousStatus = plain.status;
      const startedAt = run.run_started_at ? new Date(run.run_started_at) : plain.started_at;
      const finishedAt = run.status === 'completed' && run.updated_at ? new Date(run.updated_at) : null;
      const duration = startedAt && finishedAt ? Math.max(0, Math.round((finishedAt.getTime() - new Date(startedAt).getTime()) / 1000)) : plain.duration;

      await Build.update({
        status,
        github_run_url: run.html_url,
        github_workflow_name: run.name,
        started_at: startedAt,
        finished_at: finishedAt,
        duration,
        logs: `${plain.logs ?? ''}\nGitHub status: ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ''}\n${run.html_url}`.trim(),
      }, { where: { id: plain.id } });

      if (status !== previousStatus && ['success', 'failed', 'cancelled'].includes(status) && plain.notified_status !== status) {
        await notifyBuildStatus({ buildId: plain.id, status });
        await Build.update({ notified_status: status }, { where: { id: plain.id } });
      }
    }
  } finally {
    syncing = false;
  }
}
