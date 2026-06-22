import { Router } from 'express';
import { authMiddleware } from '../../common/auth-middleware';
import { writeAuditLog } from '../../common/audit';
import { ok, fail, message } from '../../common/response';
import { SystemSetting } from '../../db/models';
import { sendTestEmail } from '../../services/notification-service';

const router = Router();

type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'password';

type SettingDefinition = {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  defaultValue: string;
  options?: Array<{ label: string; value: string }>;
};

const SETTING_GROUPS: Array<{ code: string; name: string; description: string; settings: SettingDefinition[] }> = [
  {
    code: 'app',
    name: '基础设置',
    description: '平台名称、版本和时区。',
    settings: [
      { key: 'app.name', label: '系统名称', description: '显示在浏览器和页面中的平台名称。', type: 'string', defaultValue: 'CICD Platform' },
      { key: 'app.description', label: '系统描述', description: '平台说明文案。', type: 'string', defaultValue: '持续集成与持续交付平台' },
      { key: 'app.version', label: '系统版本', description: '当前平台版本。', type: 'string', defaultValue: '1.0.0' },
      { key: 'app.timezone', label: '系统时区', description: '日志和时间展示使用的默认时区。', type: 'select', defaultValue: 'Asia/Shanghai', options: [
        { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
        { label: 'UTC', value: 'UTC' },
      ] },
    ],
  },
  {
    code: 'auth',
    name: '安全设置',
    description: '登录失败限制、锁定策略和 Token 有效期。',
    settings: [
      { key: 'auth.login_attempts_max', label: '最大登录失败次数', description: '超过次数后可以触发锁定策略。', type: 'number', defaultValue: '5' },
      { key: 'auth.lockout_duration_minutes', label: '锁定时长（分钟）', description: '账号或 IP 被限制后的锁定时间。', type: 'number', defaultValue: '30' },
      { key: 'auth.access_token_minutes', label: '访问令牌有效期（分钟）', description: '前端访问接口使用的 access token 有效时间。', type: 'number', defaultValue: '30' },
      { key: 'auth.refresh_token_days', label: '刷新令牌有效期（天）', description: 'refresh token 的有效时间。', type: 'number', defaultValue: '7' },
    ],
  },
  {
    code: 'pipeline',
    name: '流水线设置',
    description: '构建超时、并发和默认分支。',
    settings: [
      { key: 'pipeline.default_timeout_minutes', label: '默认超时（分钟）', description: '流水线默认构建超时时间。', type: 'number', defaultValue: '30' },
      { key: 'pipeline.max_concurrent_builds', label: '最大并发构建数', description: '平台允许同时运行的构建数量。', type: 'number', defaultValue: '3' },
      { key: 'pipeline.default_branch', label: '默认分支', description: '创建项目或流水线时默认使用的分支。', type: 'string', defaultValue: 'main' },
      { key: 'pipeline.github_workflow_file', label: '默认 Workflow 文件', description: 'GitHub Actions 默认 workflow 文件名。', type: 'string', defaultValue: 'build.yml' },
    ],
  },
  {
    code: 'notification',
    name: '通知设置',
    description: '通知开关和邮件配置。',
    settings: [
      { key: 'notification.enabled', label: '启用通知', description: '是否启用平台通知。', type: 'boolean', defaultValue: 'true' },
      { key: 'notification.email_enabled', label: '启用邮件告警', description: '是否通过邮件发送告警。', type: 'boolean', defaultValue: 'false' },
      { key: 'notification.email_to', label: '告警收件人', description: '多个邮箱用英文逗号分隔。', type: 'string', defaultValue: '' },
      { key: 'smtp.host', label: 'SMTP 服务器', description: '邮件服务器地址。', type: 'string', defaultValue: '' },
      { key: 'smtp.port', label: 'SMTP 端口', description: '邮件服务器端口。', type: 'number', defaultValue: '587' },
      { key: 'smtp.from', label: '发件人邮箱', description: '告警邮件的发件人地址。', type: 'string', defaultValue: '' },
      { key: 'smtp.username', label: 'SMTP 用户名', description: 'SMTP 登录用户名。', type: 'string', defaultValue: '' },
      { key: 'smtp.password', label: 'SMTP 密码', description: 'SMTP 登录密码。', type: 'password', defaultValue: '' },
    ],
  },
  {
    code: 'git',
    name: 'Git 设置',
    description: '仓库同步和 Git Provider 默认配置。',
    settings: [
      // { key: 'git.auto_sync', label: '自动同步仓库', description: '是否周期性同步仓库元信息。', type: 'boolean', defaultValue: 'false' },
      { key: 'git.sync_interval_minutes', label: '同步间隔（分钟）', description: '自动同步仓库的间隔。', type: 'number', defaultValue: '5' },
      { key: 'git.default_provider', label: '默认 Git 平台', description: '创建项目时默认选择的平台。', type: 'select', defaultValue: 'github', options: [
        { label: 'GitHub', value: 'github' },
        { label: 'GitLab', value: 'gitlab' },
        { label: 'Gitee', value: 'gitee' },
      ] },
    ],
  },
  {
    code: 'ai',
    name: 'AI 助手',
    description: '帮助中心智能问答配置。',
    settings: [
      { key: 'ai.enabled', label: '启用 AI 助手', description: '是否在帮助中心启用智能问答。', type: 'boolean', defaultValue: 'false' },
      { key: 'ai.provider', label: 'AI Provider', description: '当前使用的 AI 服务商。', type: 'select', defaultValue: 'openai', options: [
        { label: 'OpenAI 兼容接口', value: 'openai' },
      ] },
      { key: 'ai.base_url', label: 'Base URL', description: 'OpenAI 兼容接口地址，例如 https://api.openai.com/v1。', type: 'string', defaultValue: 'https://api.openai.com/v1' },
      { key: 'ai.model', label: '模型', description: '帮助中心问答使用的模型名称。', type: 'string', defaultValue: 'gpt-4o-mini' },
      { key: 'ai.api_key', label: 'API Key', description: 'AI 服务访问密钥，仅保存在后端。', type: 'password', defaultValue: '' },
    ],
  },
  {
    code: 'ui',
    name: '界面设置',
    description: '界面语言和主题。',
    settings: [
      { key: 'ui.language', label: '界面语言', description: '前端默认语言。', type: 'select', defaultValue: 'zh-CN', options: [
        { label: '简体中文', value: 'zh-CN' },
        { label: 'English', value: 'en-US' },
      ] },
      { key: 'ui.theme', label: '主题', description: '默认界面主题。', type: 'select', defaultValue: 'light', options: [
        { label: '浅色', value: 'light' },
        { label: '深色', value: 'dark' },
      ] },
    ],
  },
];

const SETTING_DEFINITIONS = SETTING_GROUPS.flatMap((group) => group.settings);
const SETTING_MAP = new Map(SETTING_DEFINITIONS.map((setting) => [setting.key, setting]));

function validateSettingValue(definition: SettingDefinition, value: unknown): string {
  if (definition.type === 'boolean') {
    if (value === true || value === 'true') return 'true';
    if (value === false || value === 'false') return 'false';
    throw new Error(`${definition.label} 必须是布尔值`);
  }

  if (definition.type === 'number') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw new Error(`${definition.label} 必须是非负数字`);
    }
    return String(numberValue);
  }

  if (definition.type === 'select') {
    const stringValue = String(value ?? '');
    if (!definition.options?.some((option) => option.value === stringValue)) {
      throw new Error(`${definition.label} 不是有效选项`);
    }
    return stringValue;
  }

  return String(value ?? '');
}

async function getSettingsMap() {
  const rows = await SystemSetting.findAll({
    attributes: ['key', 'value', 'updated_at'],
    raw: true,
  });

  const settings: Record<string, { value: string; updated_at: Date | null; is_default: boolean }> = {};
  for (const definition of SETTING_DEFINITIONS) {
    settings[definition.key] = {
      value: definition.defaultValue,
      updated_at: null,
      is_default: true,
    };
  }

  for (const row of rows) {
    settings[row.key] = {
      value: row.value,
      updated_at: row.updated_at,
      is_default: false,
    };
  }

  return settings;
}

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const settings = await getSettingsMap();
    ok(res, {
      settings: Object.fromEntries(Object.entries(settings).map(([key, item]) => [key, item.value])),
      groups: SETTING_GROUPS.map((group) => ({
        ...group,
        settings: group.settings.map((setting) => ({
          ...setting,
          value: settings[setting.key]?.value ?? setting.defaultValue,
          updated_at: settings[setting.key]?.updated_at ?? null,
          is_default: settings[setting.key]?.is_default ?? true,
        })),
      })),
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body ?? {};
    if (!settings || typeof settings !== 'object') {
      return fail(res, 400, 'settings 必须为对象');
    }

    const updatedKeys: string[] = [];
    for (const [key, rawValue] of Object.entries(settings)) {
      const definition = SETTING_MAP.get(key);
      if (!definition) {
        return fail(res, 400, `未知配置项：${key}`);
      }

      let value: string;
      try {
        value = validateSettingValue(definition, rawValue);
      } catch (err) {
        return fail(res, 400, err instanceof Error ? err.message : '配置值不合法');
      }

      await SystemSetting.upsert({ key, value, updated_at: new Date() });
      updatedKeys.push(key);
    }

    await writeAuditLog(req, {
      action: 'settings.update',
      targetType: 'settings',
      targetName: 'system',
      details: { keys: updatedKeys },
    });

    message(res, '设置已更新');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.post('/test-email', authMiddleware, async (req, res) => {
  try {
    await sendTestEmail(req.user!.username);
    await writeAuditLog(req, {
      action: 'settings.test_email',
      targetType: 'settings',
      targetName: 'notification',
    });
    message(res, '测试邮件已发送');
  } catch (err) {
    fail(res, 400, err instanceof Error ? err.message : '测试邮件发送失败');
  }
});

router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const definition = SETTING_MAP.get(req.params.key);
    if (!definition) return fail(res, 404, '设置项不存在');

    const row = await SystemSetting.findOne({ where: { key: req.params.key }, attributes: ['id', 'key', 'value', 'updated_at'], raw: true });
    ok(res, {
      ...definition,
      value: row?.value ?? definition.defaultValue,
      updated_at: row?.updated_at ?? null,
      is_default: !row,
    });
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:key', authMiddleware, async (req, res) => {
  try {
    const definition = SETTING_MAP.get(req.params.key);
    if (!definition) return fail(res, 404, '设置项不存在');
    if (req.body?.value === undefined) return fail(res, 400, '缺少 value');

    let value: string;
    try {
      value = validateSettingValue(definition, req.body.value);
    } catch (err) {
      return fail(res, 400, err instanceof Error ? err.message : '配置值不合法');
    }

    await SystemSetting.upsert({ key: req.params.key, value, updated_at: new Date() });
    await writeAuditLog(req, {
      action: 'settings.update',
      targetType: 'settings',
      targetName: req.params.key,
    });

    message(res, '设置已更新');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:key', authMiddleware, async (req, res) => {
  try {
    const definition = SETTING_MAP.get(req.params.key);
    if (!definition) return fail(res, 404, '设置项不存在');

    const deleted = await SystemSetting.destroy({ where: { key: req.params.key } });
    if (deleted === 0) return fail(res, 404, '设置项不存在');

    await writeAuditLog(req, {
      action: 'settings.reset',
      targetType: 'settings',
      targetName: req.params.key,
    });

    message(res, '设置已恢复默认值');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
