"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.created = created;
exports.message = message;
exports.fail = fail;
exports.nextError = nextError;
function ok(res, data) {
    const payload = { code: 0, data };
    return res.json(payload);
}
function created(res, data) {
    const payload = { code: 0, data };
    return res.status(201).json(payload);
}
function message(res, msg) {
    return res.json({ code: 0, message: msg });
}
function fail(res, status, msg) {
    return res.status(status).json({ code: -1, message: msg });
}
function nextError(next, status, message) {
    const error = new Error(message);
    error.status = status;
    return next(error);
}
//# sourceMappingURL=response.js.map