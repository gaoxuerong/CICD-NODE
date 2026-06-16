# Docker Compose Deployment With Observability

This deployment is intended for a small internal production environment on one Linux server.

## Components

- `frontend`: Nginx serving the built Vue app and proxying `/api`, `/ws`, and `/metrics`.
- `backend-node`: Node/Express API.
- `mysql`: MySQL 8.4 with persistent data volume.
- `prometheus`: Metrics scraping and alert rule evaluation.
- `grafana`: Dashboards and log exploration.
- `loki`: Log storage.
- `promtail`: Docker container log collection.
- `alertmanager`: Email alert delivery.

## First Run

Copy the example environment file and edit all secrets:

```bash
cp .env.example .env
```

Required production values:

- `JWT_SECRET`: long random string.
- `ENCRYPTION_KEY`: application encryption key.
- `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD`: database passwords.
- `GRAFANA_ADMIN_PASSWORD`: Grafana admin password.
- `SMTP_*`, `ALERT_EMAIL_TO`: email alert settings.
- `CORS_ORIGINS`, `WEBHOOK_BASE_URL`: production URLs.

Start the stack:

```bash
docker compose up -d --build
```

Check service status:

```bash
docker compose ps
docker compose logs -f backend-node
```

## URLs

- App: `http://<server>:${APP_PORT}`
- Health check: `http://<server>:${APP_PORT}/api/health`
- Backend metrics through Nginx: `http://<server>:${APP_PORT}/metrics`
- Prometheus: `http://<server>:${PROMETHEUS_PORT}`. The local example uses `19090` to avoid common proxy conflicts on `9090`.
- Alertmanager: `http://<server>:${ALERTMANAGER_PORT}`
- Grafana: `http://<server>:${GRAFANA_PORT}`
- Loki API: `http://<server>:${LOKI_PORT}`

For production, expose only the app port publicly. Restrict Prometheus, Alertmanager, Grafana, and Loki to the internal network or VPN.

## Logs

The backend writes JSON logs to stdout. Docker rotates logs with:

- `max-size: 50m`
- `max-file: 5`

Quick local checks:

```bash
docker compose logs -f backend-node
docker compose logs --since 1h backend-node
```

Grafana has a Loki data source provisioned automatically. Use Explore with queries such as:

```logql
{service="backend-node"}
{service="backend-node"} |= "auth_refresh_failed"
{service="backend-node"} |= "http_request" |= "\"statusCode\":500"
```

Promtail reads Docker container logs from `/var/lib/docker/containers` and uses the Docker socket for service labels. This is designed for a Linux Docker host. On Docker Desktop, file paths can differ.

## Metrics

The backend exposes Prometheus metrics at `/metrics`.

Important metrics:

- `cicd_backend_http_requests_total`
- `cicd_backend_http_request_duration_seconds`
- `cicd_backend_process_resident_memory_bytes`
- Node.js default metrics prefixed with `cicd_backend_`

Grafana provisions:

- Prometheus data source
- Loki data source
- `CICD Backend` dashboard

## Alerts

Prometheus loads alert rules from:

```text
deploy/observability/prometheus/rules/cicd-alerts.yml
```

Current alerts:

- `BackendDown`: Prometheus cannot scrape backend metrics.
- `BackendHighErrorRate`: backend 5xx rate above 5% for 5 minutes.
- `AuthRefreshFailures`: sustained failures on `/api/auth/refresh`.
- `BackendSlowRequests`: route P95 latency above 2 seconds for 5 minutes.

Alertmanager renders email settings from `.env` at container startup.

Test email settings by temporarily lowering an alert threshold or stopping the backend:

```bash
docker compose stop backend-node
```

Then restore it:

```bash
docker compose start backend-node
```

## Health Checks

Docker health checks use:

- Backend: `GET /api/health`
- Frontend: `GET /`
- MySQL: `mysqladmin ping`

Prometheus also scrapes backend metrics. The `/api/health` endpoint remains useful for load balancers and simple uptime checks.

## Common Operations

Restart only backend:

```bash
docker compose up -d --build backend-node
```

Reload Prometheus configuration after rule changes:

```bash
curl -X POST http://localhost:${PROMETHEUS_PORT}/-/reload
```

Stop the stack:

```bash
docker compose down
```

Stop and remove data volumes:

```bash
docker compose down -v
```

## Local Development Mode

The default `docker-compose.yml` runs a production-style stack: frontend assets are built into Nginx and backend code runs from `dist`.

For local development with live code updates, use the dev override:

```bash
APP_PORT=3000 docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

In dev mode:

- Backend source is mounted into the container and runs `npm run dev`.
- Backend changes trigger `tsx watch` restart.
- Frontend source is mounted into the container and runs Vite dev server.
- Frontend changes use Vite HMR.
- App URL is `http://localhost:3000` when `APP_PORT=3000`.

Return to production-style local mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose up -d --build
```
