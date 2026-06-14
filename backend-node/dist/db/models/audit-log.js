"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class AuditLog extends sequelize_1.Model {
}
exports.AuditLog = AuditLog;
AuditLog.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    username: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    action: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    target_type: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    target_name: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    ip: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    details: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'audit_logs',
});
//# sourceMappingURL=audit-log.js.map