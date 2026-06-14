"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../sequelize");
class Notification extends sequelize_1.Model {
}
exports.Notification = Notification;
Notification.init({
    id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    content: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    is_read: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
    created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'notifications',
});
//# sourceMappingURL=notification.js.map