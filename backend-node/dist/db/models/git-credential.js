"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCredential = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class GitCredential extends sequelize_1.Model {
}
exports.GitCredential = GitCredential;
GitCredential.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    username: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    credential: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    created_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'git_credentials',
});
//# sourceMappingURL=git-credential.js.map