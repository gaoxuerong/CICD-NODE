import { Request } from 'express';
import { AuthUser } from './types';
export interface TokenPayload {
    sub: string;
    type: 'access' | 'refresh';
    jti?: string;
}
export declare function createAccessToken(userId: number): string;
export declare function createRefreshToken(userId: number): string;
export declare function verifyToken(token: string, expectedType: 'access' | 'refresh'): TokenPayload | null;
export declare function isTokenBlacklisted(token: string): Promise<boolean>;
export declare function blacklistToken(token: string, userId: number): Promise<void>;
export declare function getUserFromRequest(req: Request): AuthUser;
export declare function loadUserFromPayload(payload: TokenPayload): Promise<AuthUser | null>;
//# sourceMappingURL=auth.d.ts.map