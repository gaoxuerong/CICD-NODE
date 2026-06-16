import { Router } from 'express';
import { getMetrics, getMetricsContentType } from '../../common/metrics';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.setHeader('Content-Type', getMetricsContentType());
    res.send(await getMetrics());
  } catch (err) {
    next(err);
  }
});

export default router;
