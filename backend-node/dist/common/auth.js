"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.verifyToken = verifyToken;
exports.isTokenBlacklisted = isTokenBlacklisted;
exports.blacklistToken = blacklistToken;
exports.getUserFromRequest = getUserFromRequest;
exports.loadUserFromPayload = loadUserFromPayload;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const models_1 = require("../db/models");
function createAccessToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: String(userId), type: 'access', jti: (0, node_crypto_1.randomUUID)() }, config_1.config.jwtSecret, {
        expiresIn: config_1.config.jwtAccessExpires,
    });
}
function createRefreshToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: String(userId), type: 'refresh', jti: (0, node_crypto_1.randomUUID)() }, config_1.config.jwtSecret, {
        expiresIn: config_1.config.jwtRefreshExpires,
    });
}
function verifyToken(token, expectedType) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        if (payload.type !== expectedType) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
async function isTokenBlacklisted(token) {
    const row = await models_1.TokenBlacklist.findOne({ where: { token }, attributes: ['id'] });
    return Boolean(row);
}
async function blacklistToken(token, userId) {
    await models_1.TokenBlacklist.create({ token, user_id: userId });
}
function getUserFromRequest(req) {
    const user = req.user;
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}
async function loadUserFromPayload(payload) {
    const user = await models_1.User.findByPk(Number(payload.sub), {
        attributes: ['id', 'username', 'email', 'nickname', 'avatar', 'role', 'status', 'is_superuser', 'created_at', 'updated_at'],
    });
    return user ? user.get({ plain: true }) : null;
}
//# sourceMappingURL=auth.js.map