"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_1 = require("../config");
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
function getKey() {
    const key = Buffer.from(config_1.config.encryptionKey, 'utf-8');
    if (key.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 bytes');
    }
    return key.subarray(0, 32);
}
function encrypt(plain) {
    const iv = node_crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = node_crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}
function decrypt(payload) {
    const [ivHex, encryptedHex] = payload.split(':');
    if (!ivHex || !encryptedHex) {
        throw new Error('Invalid credential payload');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = node_crypto_1.default.createDecipheriv(ALGORITHM, getKey(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8');
}
//# sourceMappingURL=crypto.js.map