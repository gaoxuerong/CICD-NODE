"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Build = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Build extends sequelize_1.Model {
}
exports.Build = Build;
Build.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    build_number: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    pipeline_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    project_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    branch: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    commit_sha: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    commit_message: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    trigger_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    duration: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    logs: { type: sequelize_1.DataTypes.TEXT('long'), allowNull: true },
    started_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    finished_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    github_run_id: { type: sequelize_1.DataTypes.BIGINT, allowNull: true },
    github_run_url: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    github_workflow_id: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    github_workflow_name: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'builds',
});
//# sourceMappingURL=build.js.map