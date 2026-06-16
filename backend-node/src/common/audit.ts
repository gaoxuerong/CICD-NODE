import type { Request } from 'express';
import { AuditLog, User } from '../db/models';
import { logger } from './logger';

type AuditInput = {
  action: string;
  targetType?: string | null;
  targetName?: string | null;
  details?: Record<string, unknown> | string | null;
};

export async function writeAuditLog(req: Request, input: AuditInput) {
  try {
    const userId = req.user?.id ?? null;
    const user = userId
      ? await User.findByPk(userId, { attributes: ['username'], raw: true })
      : null;

    await AuditLog.create({
      user_id: userId,
      username: user?.username ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_name: input.targetName ?? null,
      ip: req.ip ?? req.socket.remoteAddress ?? null,
      details: typeof input.details === 'string'
        ? input.details
        : input.details
          ? JSON.stringify(input.details)
          : null,
      created_at: new Date(),
    });
  } catch (err) {
    logger.error('audit_log_write_error', { error: err, action: input.action });
  }
}
