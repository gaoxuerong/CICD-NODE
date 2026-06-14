"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Pipeline extends sequelize_1.Model {
}
exports.Pipeline = Pipeline;
Pipeline.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    project_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    trigger_type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    branch_filter: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    config: { type: sequelize_1.DataTypes.JSON, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    last_build_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    created_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'pipelines',
});
//# sourceMappingURL=pipeline.js.map