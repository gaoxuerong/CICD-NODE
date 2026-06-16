import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from './logger';
import { recordHttpRequest } from './metrics';

function getClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  const requestId = req.headers['x-request-id'];
  const id = typeof requestId === 'string' && requestId.trim() ? requestId : randomUUID();

  res.setHeader('X-Request-Id', id);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const durationSeconds = durationMs / 1000;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    recordHttpRequest(req, res, durationSeconds);

    logger[level]('http_request', {
      requestId: id,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user?.id,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

export function getRequestLogFields(req: Request) {
  return {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}
