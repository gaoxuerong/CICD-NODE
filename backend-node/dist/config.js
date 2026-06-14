"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paths = exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
function env(key, fallback) {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`Missing env ${key}`);
    }
    return value;
}
exports.config = {
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
};
exports.paths = {
    root: node_path_1.default.resolve(__dirname, '..', '..'),
    data: node_path_1.default.resolve(__dirname, '..', '..', 'data'),
};
//# sourceMappingURL=config.js.map