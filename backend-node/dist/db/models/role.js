"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Role extends sequelize_1.Model {
}
exports.Role = Role;
Role.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    level: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    is_system: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
    permissions: { type: sequelize_1.DataTypes.JSON, allowNull: false },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'roles',
});
//# sourceMappingURL=role.js.map