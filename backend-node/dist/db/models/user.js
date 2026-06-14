"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class User extends sequelize_1.Model {
}
exports.User = User;
User.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    username: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    email: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    nickname: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    password_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    avatar: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    role: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    status: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    is_superuser: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
    last_login_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'users',
});
//# sourceMappingURL=user.js.map