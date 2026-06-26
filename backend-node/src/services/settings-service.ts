import { SystemSetting } from '../db/models';
import { decrypt, encrypt } from '../common/crypto';

const ENCRYPTED_SETTING_PREFIX = 'enc:v1:';
const SENSITIVE_SETTING_KEYS = new Set(['smtp.password', 'ai.api_key']);

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
  'ai.enabled': 'false',
  'ai.provider': 'openai',
  'ai.base_url': 'https://api.openai.com/v1',
  'ai.model': 'gpt-4o-mini',
  'ai.api_key': '',
};

export async function getSetting(key: string, fallback = '') {
  const row = await SystemSetting.findOne({ where: { key }, attributes: ['value'], raw: true });
  return normalizeSettingValue(key, row?.value ?? DEFAULT_SETTINGS[key] ?? fallback);
}

export async function getSettings(keys: string[]) {
  const rows = await SystemSetting.findAll({
    where: { key: keys },
    attributes: ['key', 'value'],
    raw: true,
  });

  const values = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(keys.map((key) => [key, normalizeSettingValue(key, values.get(key) ?? DEFAULT_SETTINGS[key] ?? '')]));
}

export function isEnabled(value: string | undefined) {
  return value === 'true';
}

export function isSensitiveSettingKey(key: string) {
  return SENSITIVE_SETTING_KEYS.has(key);
}

export function isEncryptedSettingValue(value: string) {
  return value.startsWith(ENCRYPTED_SETTING_PREFIX);
}

export function encryptSettingValue(key: string, value: string) {
  if (!isSensitiveSettingKey(key) || !value) return value;
  if (isEncryptedSettingValue(value)) return value;
  return `${ENCRYPTED_SETTING_PREFIX}${encrypt(value)}`;
}

export function decryptSettingValue(key: string, value: string) {
  if (!isSensitiveSettingKey(key) || !value) return value;
  if (!isEncryptedSettingValue(value)) return value;
  return decrypt(value.slice(ENCRYPTED_SETTING_PREFIX.length));
}

export function normalizeSettingValue(key: string, value: string) {
  try {
    return decryptSettingValue(key, value);
  } catch {
    return '';
  }
}

export function maskSettingValue(key: string, value: string) {
  if (!isSensitiveSettingKey(key)) return value;
  return null;
}

export function getMaskedSettingValue(key: string, value: string) {
  if (!hasSensitiveSettingValue(key, value)) return null;
  return '********';
}

export function hasSensitiveSettingValue(key: string, value: string) {
  return isSensitiveSettingKey(key) && Boolean(normalizeSettingValue(key, value));
}
