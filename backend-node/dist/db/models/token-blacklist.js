"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBlacklist = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class TokenBlacklist extends sequelize_1.Model {
}
exports.TokenBlacklist = TokenBlacklist;
TokenBlacklist.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    token: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'token_blacklist',
});
//# sourceMappingURL=token-blacklist.js.map