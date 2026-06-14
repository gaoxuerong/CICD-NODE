import crypto from 'node:crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(config.encryptionKey, 'utf-8');
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 bytes');
  }
  return key.subarray(0, 32);
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, encryptedHex] = payload.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid credential payload');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8');
}
