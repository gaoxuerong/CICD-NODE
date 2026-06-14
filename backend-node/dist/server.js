"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcast = broadcast;
require("dotenv/config");
const node_http_1 = __importDefault(require("node:http"));
const ws_1 = require("ws");
const config_1 = require("./config");
const sequelize_1 = require("./db/sequelize");
const migrate_1 = require("./db/migrate");
const seed_1 = require("./db/seed");
const app_1 = __importDefault(require("./app"));
let broadcastFn;
async function start() {
    await (0, sequelize_1.connectDb)();
    await (0, migrate_1.migrate)();
    await (0, seed_1.seed)();
    const server = node_http_1.default.createServer(app_1.default);
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
                }
            }
            catch {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
            }
        });
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
        });
        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
    });
    broadcastFn = (data) => {
        const msg = JSON.stringify(data);
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(msg);
            }
        });
    };
    const port = config_1.config.port;
    const host = config_1.config.host;
    server.listen(port, host, () => {
        console.log(`Server running at http://${host}:${port}`);
        console.log(`WebSocket available at ws://${host}:${port}/ws`);
    });
}
function broadcast(data) {
    if (broadcastFn) {
        broadcastFn(data);
    }
}
start();
//# sourceMappingURL=server.js.map