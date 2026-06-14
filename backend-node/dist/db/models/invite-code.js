"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteCode = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class InviteCode extends sequelize_1.Model {
}
exports.InviteCode = InviteCode;
InviteCode.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    used: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
    used_by: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    used_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    expires_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'invite_codes',
});
//# sourceMappingURL=invite-code.js.map