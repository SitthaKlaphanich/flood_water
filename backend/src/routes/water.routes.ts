import { Router, Request, Response } from 'express';
import { aggregator } from '../services/AggregatorService';
import { repository } from '../database/repository';

const router = Router();

router.get('/water-levels', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({
    status: state.status,
    lastUpdatedAt: state.lastUpdatedAt,
    count: state.waterLevels.length,
    data: state.waterLevels
  });
});

router.get('/water-levels/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const state = aggregator.getState();
  const point = state.waterLevels.find(p => p.id === id || p.code === id);
  if (!point) {
    res.status(404).json({ error: 'Water level station not found' });
    return;
  }
  res.json({ data: point });
});

router.get('/water-levels/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const state = aggregator.getState();
  const point = state.waterLevels.find(p => p.id === id || p.code === id);
  const targetId = point ? point.id : id;

  const hours = parseInt(req.query.hours as string, 10) || 24;
  const { history, firstRecordedAt } = repository.getHistory(targetId, hours);
  const trend = repository.calculateTrend(targetId);

  res.json({
    stationId: targetId,
    periodHours: hours,
    trend,
    firstRecordedAt,
    count: history.length,
    hasEnoughData: history.length >= 2,
    data: history
  });
});

export default router;
