"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Environment extends sequelize_1.Model {
}
exports.Environment = Environment;
Environment.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    project_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    deploy_url: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    created_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'environments',
});
//# sourceMappingURL=environment.js.map