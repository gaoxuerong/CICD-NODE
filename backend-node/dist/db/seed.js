"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("./models");
async function seed() {
    const userCount = await models_1.User.count();
    if (userCount > 0) {
        console.log('Seed: users table already has data, skipping seed.');
        return;
    }
    const now = new Date();
    const hash = bcryptjs_1.default.hashSync('admin123', 10);
    const userHash = bcryptjs_1.default.hashSync('user123', 10);
    await models_1.User.bulkCreate([
        { username: 'admin', email: 'admin@example.com', nickname: '系统管理员', password_hash: hash, role: 'admin', status: 'active', is_superuser: 1, created_at: now, updated_at: now },
        { username: 'user', email: 'user@example.com', nickname: '普通用户', password_hash: userHash, role: 'developer', status: 'active', is_superuser: 0, created_at: now, updated_at: now },
    ]);
    await models_1.Role.bulkCreate([
        { code: 'superadmin', name: '超级管理员', description: 'Full system access', level: 100, is_system: 1, permissions: '["*"]', created_at: now, updated_at: now },
        { code: 'admin', name: '系统管理员', description: 'Administrative access', level: 80, is_system: 1, permissions: '["dashboard.view","projects.view","projects.create","projects.manage","pipelines.view","pipelines.create","pipelines.manage","builds.view","builds.trigger","builds.manage","environments.view","environments.manage","users.view","users.manage","roles.view","roles.manage","permissions.view","permissions.manage","settings.view","settings.manage","audit.view","git.view","git.manage","notifications.view"]', created_at: now, updated_at: now },
        { code: 'manager', name: '项目管理者', description: 'Project manager access', level: 60, is_system: 1, permissions: '["dashboard.view","projects.view","projects.create","projects.manage","pipelines.view","pipelines.create","pipelines.manage","builds.view","builds.trigger","builds.manage","environments.view","environments.manage","notifications.view"]', created_at: now, updated_at: now },
        { code: 'user', name: '普通用户', description: 'Regular user access', level: 20, is_system: 1, permissions: '["dashboard.view","projects.view","notifications.view"]', created_at: now, updated_at: now },
        { code: 'developer', name: '开发者', description: 'Developer access', level: 40, is_system: 1, permissions: '["dashboard.view","projects.view","pipelines.view","pipelines.create","builds.view","builds.trigger","notifications.view"]', created_at: now, updated_at: now },
        { code: 'viewer', name: '访客', description: 'Read-only access', level: 10, is_system: 1, permissions: '["dashboard.view","projects.view","pipelines.view","builds.view","notifications.view"]', created_at: now, updated_at: now },
    ]);
    await models_1.Permission.bulkCreate([
        { code: 'dashboard.view', name: 'View Dashboard', resource: 'dashboard', action: 'view', description: 'View dashboard', created_at: now },
        { code: 'projects.view', name: 'View Projects', resource: 'projects', action: 'view', description: 'View project list and details', created_at: now },
        { code: 'projects.create', name: 'Create Projects', resource: 'projects', action: 'create', description: 'Create new projects', created_at: now },
        { code: 'projects.manage', name: 'Manage Projects', resource: 'projects', action: 'manage', description: 'Full project management', created_at: now },
        { code: 'pipelines.view', name: 'View Pipelines', resource: 'pipelines', action: 'view', description: 'View pipeline list', created_at: now },
        { code: 'pipelines.create', name: 'Create Pipelines', resource: 'pipelines', action: 'create', description: 'Create new pipelines', created_at: now },
        { code: 'pipelines.manage', name: 'Manage Pipelines', resource: 'pipelines', action: 'manage', description: 'Full pipeline management', created_at: now },
        { code: 'builds.view', name: 'View Builds', resource: 'builds', action: 'view', description: 'View build history and logs', created_at: now },
        { code: 'builds.trigger', name: 'Trigger Builds', resource: 'builds', action: 'trigger', description: 'Trigger pipeline builds', created_at: now },
        { code: 'builds.manage', name: 'Manage Builds', resource: 'builds', action: 'manage', description: 'Full build management', created_at: now },
        { code: 'users.view', name: 'View Users', resource: 'users', action: 'view', description: 'View user list', created_at: now },
        { code: 'users.manage', name: 'Manage Users', resource: 'users', action: 'manage', description: 'Full user management', created_at: now },
        { code: 'roles.view', name: 'View Roles', resource: 'roles', action: 'view', description: 'View role list', created_at: now },
        { code: 'roles.manage', name: 'Manage Roles', resource: 'roles', action: 'manage', description: 'Full role management', created_at: now },
        { code: 'settings.view', name: 'View Settings', resource: 'settings', action: 'view', description: 'View system settings', created_at: now },
        { code: 'settings.manage', name: 'Manage Settings', resource: 'settings', action: 'manage', description: 'Modify system settings', created_at: now },
        { code: 'environments.view', name: 'View Environments', resource: 'environments', action: 'view', description: 'View environments', created_at: now },
        { code: 'environments.manage', name: 'Manage Environments', resource: 'environments', action: 'manage', description: 'Manage environments', created_at: now },
        { code: 'notifications.view', name: 'View Notifications', resource: 'notifications', action: 'view', description: 'View notifications', created_at: now },
        { code: 'audit.view', name: 'View Audit Logs', resource: 'audit', action: 'view', description: 'View audit logs', created_at: now },
        { code: 'permissions.view', name: 'View Permissions', resource: 'permissions', action: 'view', description: 'View permission list', created_at: now },
        { code: 'permissions.manage', name: 'Manage Permissions', resource: 'permissions', action: 'manage', description: 'Full permission management', created_at: now },
        { code: 'git.view', name: 'View Git Credentials', resource: 'git', action: 'view', description: 'View git credentials', created_at: now },
        { code: 'git.manage', name: 'Manage Git Credentials', resource: 'git', action: 'manage', description: 'Manage git credentials', created_at: now },
    ]);
    const defaults = {
        'app.name': 'CICD Platform',
        'app.version': '1.0.0',
        'app.timezone': 'Asia/Shanghai',
        'auth.login_attempts_max': '5',
        'auth.lockout_duration_minutes': '30',
        'pipeline.default_timeout_minutes': '30',
        'pipeline.max_concurrent_builds': '3',
        'notification.enabled': 'true',
        'notification.types': 'build,deploy,system',
        'git.auto_sync': 'false',
        'git.sync_interval_minutes': '5',
        'ui.language': 'zh-CN',
        'ui.theme': 'light',
    };
    for (const [k, v] of Object.entries(defaults)) {
        await models_1.SystemSetting.create({ key: k, value: v, updated_at: now });
    }
    console.log('Seed: created admin/user accounts, default roles, permissions, and settings.');
}
if (require.main === module) {
    seed()
        .then(() => {
        console.log('Seed complete.');
        process.exit(0);
    })
        .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=seed.js.map