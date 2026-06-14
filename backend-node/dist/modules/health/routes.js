"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sequelize_1 = require("../../db/sequelize");
const response_1 = require("../../common/response");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        await sequelize_1.sequelize.authenticate();
        (0, response_1.ok)(res, {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
        });
    }
    catch {
        (0, response_1.ok)(res, {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
        });
    }
});
exports.default = router;
//# sourceMappingURL=routes.js.map