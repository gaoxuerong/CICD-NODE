import { SystemSetting } from '../db/models';

const DEFAULT_SETTINGS: Record<string, string> = {
  'notification.enabled': 'true',
  'notification.email_enabled': 'false',
  'notification.email_to': '',
  'smtp.host': '',
  'smtp.port': '587',
  'smtp.from': '',
  'smtp.username': '',
  'smtp.password': '',
  'git.auto_sync': 'false',
  'git.sync_interval_minutes': '5',
  'git.default_provider': 'github',
};

export async function getSetting(key: string, fallback = '') {
  const row = await SystemSetting.findOne({ where: { key }, attributes: ['value'], raw: true });
  return row?.value ?? DEFAULT_SETTINGS[key] ?? fallback;
}

export async function getSettings(keys: string[]) {
  const rows = await SystemSetting.findAll({
    where: { key: keys },
    attributes: ['key', 'value'],
    raw: true,
  });

  const values = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(keys.map((key) => [key, values.get(key) ?? DEFAULT_SETTINGS[key] ?? '']));
}

export function isEnabled(value: string | undefined) {
  return value === 'true';
}
