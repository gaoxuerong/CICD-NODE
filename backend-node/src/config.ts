import path from 'node:path';

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing env ${key}`);
  }
  return value;
}

export const config = {
  port: Number(env('PORT', '8080')),
  host: env('HOST', '0.0.0.0'),
  nodeEnv: env('NODE_ENV', 'development'),
  jwtSecret: env('JWT_SECRET'),
  jwtAccessExpires: env('JWT_ACCESS_EXPIRES', '30m'),
  jwtRefreshExpires: env('JWT_REFRESH_EXPIRES', '7d'),
  dbHost: env('DB_HOST', 'localhost'),
  dbPort: Number(env('DB_PORT', '3306')),
  dbUser: env('DB_USER', 'root'),
  dbPassword: env('DB_PASSWORD', ''),
  dbName: env('DB_NAME', 'cicd'),
  corsOrigins: env('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  encryptionKey: env('ENCRYPTION_KEY'),
  githubToken: env('GITHUB_TOKEN', ''),
  githubWebhookSecret: env('GITHUB_WEBHOOK_SECRET', ''),
  webhookBaseUrl: env('WEBHOOK_BASE_URL', 'http://localhost:8080'),
  enableApiDocs: env('ENABLE_API_DOCS', process.env.NODE_ENV === 'production' ? 'false' : 'true') === 'true',
};

export const paths = {
  root: path.resolve(__dirname, '..', '..'),
  data: path.resolve(__dirname, '..', '..', 'data'),
};
