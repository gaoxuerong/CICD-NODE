"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSetting = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class SystemSetting extends sequelize_1.Model {
}
exports.SystemSetting = SystemSetting;
SystemSetting.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    value: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'system_settings',
});
//# sourceMappingURL=system-setting.js.map