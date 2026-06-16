import { Request } from 'express';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from './types';
import { TokenBlacklist, User } from '../db/models';

export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export function createAccessToken(userId: number) {
  return jwt.sign({ sub: String(userId), type: 'access', jti: randomUUID() }, config.jwtSecret, {
    expiresIn: config.jwtAccessExpires as any,
  });
}

export function createRefreshToken(userId: number) {
  return jwt.sign({ sub: String(userId), type: 'refresh', jti: randomUUID() }, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpires as any,
  });
}

export function verifyToken(token: string, expectedType: 'access' | 'refresh'): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (payload.type !== expectedType) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const row = await TokenBlacklist.findOne({ where: { token }, attributes: ['id'] });
  return Boolean(row);
}

export async function blacklistToken(token: string, userId: number): Promise<void> {
  await TokenBlacklist.create({ token, user_id: userId, created_at: new Date() });
}

export function getUserFromRequest(req: Request): AuthUser {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function loadUserFromPayload(payload: TokenPayload): Promise<AuthUser | null> {
  const user = await User.findByPk(Number(payload.sub), {
    attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'created_at', 'updated_at'],
  });

  return user ? (user.get({ plain: true }) as unknown as AuthUser) : null;
}
