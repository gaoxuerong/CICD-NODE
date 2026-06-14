"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
exports.insert = insert;
exports.update = update;
const connection_1 = require("./connection");
async function query(sql, params) {
    const db = (0, connection_1.getDb)();
    const [rows] = await db.execute(sql, params || []);
    return rows;
}
async function queryOne(sql, params) {
    const rows = await query(sql, params);
    return rows[0] || null;
}
async function execute(sql, params) {
    const db = (0, connection_1.getDb)();
    const [result] = await db.execute(sql, params || []);
    return result;
}
async function insert(sql, params) {
    const result = await execute(sql, params);
    return result.insertId;
}
async function update(sql, params) {
    const result = await execute(sql, params);
    return result.affectedRows;
}
//# sourceMappingURL=query.js.map