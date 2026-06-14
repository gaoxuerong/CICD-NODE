"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./modules/health/routes"));
const routes_2 = __importDefault(require("./modules/auth/routes"));
const routes_3 = __importDefault(require("./modules/users/routes"));
const routes_4 = __importDefault(require("./modules/roles/routes"));
const routes_5 = __importDefault(require("./modules/permissions/routes"));
const routes_6 = __importDefault(require("./modules/projects/routes"));
const routes_7 = __importDefault(require("./modules/pipelines/routes"));
const routes_8 = __importDefault(require("./modules/builds/routes"));
const routes_9 = __importDefault(require("./modules/environments/routes"));
const routes_10 = __importDefault(require("./modules/notifications/routes"));
const routes_11 = __importDefault(require("./modules/dashboard/routes"));
const routes_12 = __importDefault(require("./modules/audit-logs/routes"));
const routes_13 = __importDefault(require("./modules/git-credentials/routes"));
const routes_14 = __importDefault(require("./modules/settings/routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/health', routes_1.default);
app.use('/api/auth', routes_2.default);
app.use('/api/users', routes_3.default);
app.use('/api/roles', routes_4.default);
app.use('/api/permissions', routes_5.default);
app.use('/api/projects', routes_6.default);
app.use('/api/pipelines', routes_7.default);
app.use('/api/builds', routes_8.default);
app.use('/api/environments', routes_9.default);
app.use('/api/notifications', routes_10.default);
app.use('/api/dashboard', routes_11.default);
app.use('/api/audit-logs', routes_12.default);
app.use('/api/git-credentials', routes_13.default);
app.use('/api/settings', routes_14.default);
app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    const message = err.message ?? '服务器内部错误';
    res.status(status).json({ code: -1, message });
});
exports.default = app;
//# sourceMappingURL=app.js.map