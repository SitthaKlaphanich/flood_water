import { Router, Request, Response } from 'express';
import { aggregator } from '../services/AggregatorService';

const router = Router();

router.get('/rainfall', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({
    status: state.status,
    lastUpdatedAt: state.lastUpdatedAt,
    count: state.rainfall.length,
    data: state.rainfall
  });
});

export default router;
