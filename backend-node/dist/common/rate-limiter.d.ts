export declare function rateLimit(key: string, maxRequests: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
};
export declare function checkLoginRateLimit(ip: string, userId?: number): void;
export declare function resetLoginRateLimit(ip: string, userId?: number): void;
//# sourceMappingURL=rate-limiter.d.ts.map