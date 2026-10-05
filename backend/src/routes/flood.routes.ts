import { Router, Request, Response } from 'express';
import { aggregator } from '../services/AggregatorService';
import { repository } from '../database/repository';

const router = Router();

router.get('/flood-points', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({
    status: state.status,
    lastUpdatedAt: state.lastUpdatedAt,
    count: state.floodPoints.length,
    data: state.floodPoints
  });
});

router.get('/flood-points/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const state = aggregator.getState();
  const point = state.floodPoints.find(p => p.id === id || p.code === id);
  if (!point) {
    res.status(404).json({ error: 'Flood point not found' });
    return;
  }
  res.json({ data: point });
});

router.get('/flood-points/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const hours = parseInt(req.query.hours as string, 10) || 24;
  const { history, firstRecordedAt } = repository.getHistory(id, hours);
  const trend = repository.calculateTrend(id);

  res.json({
    stationId: id,
    periodHours: hours,
    trend,
    firstRecordedAt,
    count: history.length,
    hasEnoughData: history.length >= 2,
    data: history
  });
});

router.get('/flood-alerts', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({
    status: state.status,
    lastUpdatedAt: state.lastUpdatedAt,
    count: state.alerts.length,
    data: state.alerts
  });
});

export default router;
