import 'dotenv/config';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { connectDb } from './db/sequelize';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import app from './app';
import { logger } from './common/logger';
import { startBuildStatusSync } from './services/build-sync';

let broadcastFn: (data: object) => void;

async function start() {
  await connectDb();
  await migrate();
  await seed();
  await startBuildStatusSync();

  const server = http.createServer(app);

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.info('websocket_connected');

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      logger.info('websocket_disconnected');
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
  });

  broadcastFn = (data: object) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };

  const port = config.port;
  const host = config.host;

  server.listen(port, host, () => {
    logger.info('server_started', {
      httpUrl: `http://${host}:${port}`,
      wsUrl: `ws://${host}:${port}/ws`,
    });
  });
}

export function broadcast(data: object) {
  if (broadcastFn) {
    broadcastFn(data);
  }
}

start();
