import { Router } from 'express';
import { sequelize } from '../../db/sequelize';
import { ok } from '../../common/response';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await sequelize.authenticate();
    ok(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch {
    ok(res, {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
