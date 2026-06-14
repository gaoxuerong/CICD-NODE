"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
exports.connectDb = connectDb;
exports.closeDb = closeDb;
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
exports.sequelize = new sequelize_1.Sequelize(config_1.config.dbName, config_1.config.dbUser, config_1.config.dbPassword, {
    host: config_1.config.dbHost,
    port: config_1.config.dbPort,
    dialect: 'mysql',
    logging: false,
    timezone: '+08:00',
    define: {
        freezeTableName: true,
        timestamps: false,
    },
    pool: {
        max: 10,
        min: 0,
        idle: 10000,
    },
});
async function connectDb() {
    await exports.sequelize.authenticate();
}
async function closeDb() {
    await exports.sequelize.close();
}
//# sourceMappingURL=sequelize.js.map