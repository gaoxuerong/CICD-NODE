"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Project extends sequelize_1.Model {
}
exports.Project = Project;
Project.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    git_url: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    language: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    source: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    github_owner: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    github_repo: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    github_default_branch: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    last_sync_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    created_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'projects',
});
//# sourceMappingURL=project.js.map