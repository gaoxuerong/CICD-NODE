import client from 'prom-client';
import { Request, Response } from 'express';

client.collectDefaultMetrics({
  prefix: 'cicd_backend_',
});

const httpRequestsTotal = new client.Counter({
  name: 'cicd_backend_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'cicd_backend_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

function normalizeRoute(req: Request) {
  if (req.route?.path) {
    const routePath = Array.isArray(req.route.path) ? req.route.path.join('|') : req.route.path;
    return `${req.baseUrl}${routePath}`;
  }

  return req.baseUrl || req.path || 'unknown';
}

export function recordHttpRequest(req: Request, res: Response, durationSeconds: number) {
  const labels = {
    method: req.method,
    route: normalizeRoute(req),
    status_code: String(res.statusCode),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationSeconds.observe(labels, durationSeconds);
}

export async function getMetrics() {
  return client.register.metrics();
}

export function getMetricsContentType() {
  return client.register.contentType;
}
