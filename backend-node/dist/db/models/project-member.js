"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMember = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class ProjectMember extends sequelize_1.Model {
}
exports.ProjectMember = ProjectMember;
ProjectMember.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    project_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    joined_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'project_members',
});
//# sourceMappingURL=project-member.js.map