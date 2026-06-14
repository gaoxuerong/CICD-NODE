"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Permission extends sequelize_1.Model {
}
exports.Permission = Permission;
Permission.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    resource: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    action: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'permissions',
});
//# sourceMappingURL=permission.js.map