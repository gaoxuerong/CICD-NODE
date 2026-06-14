import { Router } from 'express';
import { authMiddleware } from '../../common/auth-middleware';
import { ok, fail, message } from '../../common/response';
import { SystemSetting } from '../../db/models';

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  'app.name': 'CICD Platform',
  'app.version': '1.0.0',
  'app.timezone': 'Asia/Shanghai',
  'auth.login_attempts_max': '5',
  'auth.lockout_duration_minutes': '30',
  'pipeline.default_timeout_minutes': '30',
  'pipeline.max_concurrent_builds': '3',
  'notification.enabled': 'true',
  'notification.types': 'build,deploy,system',
  'git.auto_sync': 'false',
  'git.sync_interval_minutes': '5',
  'ui.language': 'zh-CN',
  'ui.theme': 'light',
};

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const rows = await SystemSetting.findAll({
      attributes: ['id', 'key', 'value', 'updated_at'],
      order: [['key', 'ASC']],
      raw: true,
    });

    const settings: Record<string, string> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      settings[key] = DEFAULT_SETTINGS[key];
    }
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    ok(res, settings);
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const row = await SystemSetting.findOne({ where: { key: req.params.key }, attributes: ['id', 'key', 'value', 'updated_at'] });

    if (!row) {
      const def = DEFAULT_SETTINGS[req.params.key];
      if (def !== undefined) {
        return ok(res, { key: req.params.key, value: def, is_default: true });
      }
      return fail(res, 404, '设置项不存在');
    }

    ok(res, row);
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

    for (const [k, v] of Object.entries(settings)) {
      if (typeof v !== 'string') continue;
      await SystemSetting.upsert({ key: k, value: v, updated_at: new Date() });
    }

    message(res, '设置已更新');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.put('/:key', authMiddleware, async (req, res) => {
  try {
    const { value } = req.body ?? {};
    if (value === undefined) return fail(res, 400, '缺少 value');

    await SystemSetting.upsert({ key: req.params.key, value: String(value), updated_at: new Date() });

    message(res, '设置已更新');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

router.delete('/:key', authMiddleware, async (req, res) => {
  try {
    const deleted = await SystemSetting.destroy({ where: { key: req.params.key } });

    if (deleted === 0) {
      return fail(res, 404, '设置项不存在');
    }

    message(res, '设置已删除');
  } catch {
    fail(res, 500, '服务器内部错误');
  }
});

export default router;
