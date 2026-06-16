import nodemailer from 'nodemailer';
import { logger } from '../common/logger';
import { Build, Notification, Project, ProjectMember, User } from '../db/models';
import { getSettings, isEnabled } from './settings-service';

type NotifyBuildOptions = {
  buildId: number;
  status: string;
  reason?: string;
};

const FINAL_STATUSES = new Set(['success', 'failed', 'cancelled']);

function splitEmails(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStatusText(status: string) {
  const map: Record<string, string> = {
    success: '成功',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[status] ?? status;
}

async function createNotifications(userIds: number[], title: string, content: string) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;

  await Notification.bulkCreate(uniqueUserIds.map((userId) => ({
    user_id: userId,
    title,
    content,
    is_read: 0,
    created_at: new Date(),
  })));
}

async function getBuildNotificationUserIds(projectId: number, triggerBy: number | null) {
  const members = await ProjectMember.findAll({
    where: { project_id: projectId, role: ['owner', 'maintainer'] },
    attributes: ['user_id'],
    raw: true,
  });

  return [
    ...(triggerBy ? [triggerBy] : []),
    ...members.map((member) => member.user_id),
  ];
}

async function sendEmail(settings: Record<string, string>, subject: string, text: string) {
  const recipients = splitEmails(settings['notification.email_to'] ?? '');
  const host = settings['smtp.host'];
  const port = Number(settings['smtp.port'] || 587);
  const from = settings['smtp.from'];
  const user = settings['smtp.username'];
  const pass = settings['smtp.password'];

  if (recipients.length === 0 || !host || !from) {
    const details = {
      hasRecipients: recipients.length > 0,
      hasHost: Boolean(host),
      hasFrom: Boolean(from),
    };
    logger.warn('smtp_email_skipped_missing_config', details);
    throw new Error('SMTP 配置不完整：请填写告警收件人、SMTP 服务器和发件人邮箱');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user || pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to: recipients,
    subject,
    text,
  });
}

export async function sendTestEmail(username: string) {
  const settings = await getSettings([
    'notification.email_to',
    'smtp.host',
    'smtp.port',
    'smtp.from',
    'smtp.username',
    'smtp.password',
  ]);

  await sendEmail(
    settings,
    'CI/CD 平台测试邮件',
    [
      '这是一封 CI/CD 平台 SMTP 测试邮件。',
      `触发人：${username}`,
      `时间：${new Date().toISOString()}`,
    ].join('\n')
  );
}

export async function notifyBuildStatus(options: NotifyBuildOptions) {
  if (!FINAL_STATUSES.has(options.status)) return;

  const settings = await getSettings([
    'notification.enabled',
    'notification.email_enabled',
    'notification.email_to',
    'smtp.host',
    'smtp.port',
    'smtp.from',
    'smtp.username',
    'smtp.password',
  ]);

  if (!isEnabled(settings['notification.enabled'])) return;

  const build = await Build.findByPk(options.buildId, {
    include: [
      { model: Project, as: 'project', attributes: ['name'] },
      { model: User, as: 'triggerUser', attributes: ['username', 'email'] },
    ],
  });
  if (!build) return;

  const plain = build.get({ plain: true }) as any;
  const projectName = plain.project?.name ?? `项目 ${plain.project_id}`;
  const statusText = buildStatusText(options.status);
  const title = `构建${statusText}：${projectName} #${plain.build_number}`;
  const content = [
    `项目：${projectName}`,
    `构建编号：#${plain.build_number}`,
    `状态：${statusText}`,
    `分支：${plain.branch ?? '-'}`,
    `触发人：${plain.triggerUser?.username ?? '-'}`,
    plain.github_run_url ? `GitHub Actions：${plain.github_run_url}` : null,
    options.reason ? `原因：${options.reason}` : null,
  ].filter(Boolean).join('\n');

  const userIds = await getBuildNotificationUserIds(plain.project_id, plain.trigger_by);
  await createNotifications(userIds, title, content);

  if (!isEnabled(settings['notification.email_enabled'])) return;

  try {
    await sendEmail(settings, title, content);
  } catch (err) {
    logger.error('smtp_email_send_error', { buildId: options.buildId, status: options.status, error: err });
  }
}

export async function notifyProjectEvent(options: {
  projectId: number;
  triggerUserId?: number | null;
  title: string;
  content: string;
  email?: boolean;
}) {
  const settings = await getSettings([
    'notification.enabled',
    'notification.email_enabled',
    'notification.email_to',
    'smtp.host',
    'smtp.port',
    'smtp.from',
    'smtp.username',
    'smtp.password',
  ]);

  if (!isEnabled(settings['notification.enabled'])) return;

  const userIds = await getBuildNotificationUserIds(options.projectId, options.triggerUserId ?? null);
  await createNotifications(userIds, options.title, options.content);

  if (!options.email || !isEnabled(settings['notification.email_enabled'])) return;

  try {
    await sendEmail(settings, options.title, options.content);
  } catch (err) {
    logger.error('smtp_email_send_error', { projectId: options.projectId, title: options.title, error: err });
  }
}
