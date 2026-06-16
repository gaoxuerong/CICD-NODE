import { NextFunction, Request, Response } from 'express';
import { fail } from './response';
import { loadUserFromPayload, isTokenBlacklisted, verifyToken } from './auth';
import { Role } from '../db/models';

function parsePermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return fail(res, 401, '未提供有效的token');
  }

  const token = header.split(' ')[1];
  const payload = verifyToken(token, 'access');
  if (!payload) {
    return fail(res, 401, '无效的令牌');
  }

  if (await isTokenBlacklisted(token)) {
    return fail(res, 401, '令牌已被吊销');
  }

  const user = await loadUserFromPayload(payload);
  if (!user) {
    return fail(res, 401, '用户不存在');
  }

  req.user = user;
  next();
}

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return fail(res, 401, '未登录');
    }

    if (user.is_superuser) {
      return next();
    }

    const role = await Role.findOne({ where: { code: user.role }, attributes: ['permissions'] });
    const permissions = parsePermissions(role?.permissions);

    if (permissions.includes('*') || permissions.includes(permission)) {
      return next();
    }

    return fail(res, 403, '没有权限');
  };
}
