interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function cleanOlderThan(bucket: Bucket, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
}

export function rateLimit(key: string, maxRequests: number, windowMs: number) {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  cleanOlderThan(bucket, windowMs);
  const allowed = bucket.timestamps.length < maxRequests;
  if (allowed) {
    bucket.timestamps.push(Date.now());
  }
  buckets.set(key, bucket);
  return { allowed, remaining: Math.max(0, maxRequests - bucket.timestamps.length) };
}

export function checkLoginRateLimit(ip: string, userId?: number) {
  const ipWindow = 10 * 60 * 1000;
  const accountWindow = 30 * 60 * 1000;

  const ipResult = rateLimit(`login:${ip}`, 100, ipWindow);
  if (!ipResult.allowed) {
    throw new Error('登录请求过于频繁，请稍后再试');
  }

  if (userId) {
    const accountResult = rateLimit(`account:${userId}`, 5, accountWindow);
    if (!accountResult.allowed) {
      throw new Error('该账号登录尝试过多，请稍后再试');
    }
  }
}

export function resetLoginRateLimit(ip: string, userId?: number) {
  buckets.delete(`login:${ip}`);
  if (userId) {
    buckets.delete(`account:${userId}`);
  }
}
