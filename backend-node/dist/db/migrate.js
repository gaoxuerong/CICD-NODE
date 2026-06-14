"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
const sequelize_1 = require("./sequelize");
async function migrate() {
    await sequelize_1.sequelize.sync({ alter: false });
    console.log('Migration complete.');
}
//# sourceMappingURL=migrate.js.map