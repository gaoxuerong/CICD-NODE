"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const response_1 = require("./response");
const auth_1 = require("./auth");
async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return (0, response_1.fail)(res, 401, '未提供有效的token');
    }
    const token = header.split(' ')[1];
    const payload = (0, auth_1.verifyToken)(token, 'access');
    if (!payload) {
        return (0, response_1.fail)(res, 401, '无效的令牌');
    }
    if (await (0, auth_1.isTokenBlacklisted)(token)) {
        return (0, response_1.fail)(res, 401, '令牌已被吊销');
    }
    const user = await (0, auth_1.loadUserFromPayload)(payload);
    if (!user) {
        return (0, response_1.fail)(res, 401, '用户不存在');
    }
    req.user = user;
    next();
}
//# sourceMappingURL=auth-middleware.js.map