import { NextFunction, Request, Response } from 'express';
import { fail } from './response';
import { loadUserFromPayload, isTokenBlacklisted, verifyToken } from './auth';

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
