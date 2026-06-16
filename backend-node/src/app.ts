import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { swaggerSpec, swaggerUi } from './config/swagger';
import { logger } from './common/logger';
import { requestLogger } from './common/request-logger';

import healthRoutes from './modules/health/routes';
import metricsRoutes from './modules/metrics/routes';
import authRoutes from './modules/auth/routes';
import usersRoutes from './modules/users/routes';
import rolesRoutes from './modules/roles/routes';
import permissionsRoutes from './modules/permissions/routes';
import projectsRoutes from './modules/projects/routes';
import pipelinesRoutes from './modules/pipelines/routes';
import buildsRoutes from './modules/builds/routes';
import environmentsRoutes from './modules/environments/routes';
import notificationsRoutes from './modules/notifications/routes';
import dashboardRoutes from './modules/dashboard/routes';
import auditLogsRoutes from './modules/audit-logs/routes';
import gitCredentialsRoutes from './modules/git-credentials/routes';
import settingsRoutes from './modules/settings/routes';

const app = express();

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CI/CD Platform API',
}));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/metrics', metricsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/pipelines', pipelinesRoutes);
app.use('/api/builds', buildsRoutes);
app.use('/api/environments', environmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/git-credentials', gitCredentialsRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? 500;
  const message = err.message ?? '服务器内部错误';
  logger.error('unhandled_request_error', {
    method: _req.method,
    path: _req.originalUrl,
    status,
    error: err,
  });
  res.status(status).json({ code: -1, message });
});

export default app;
