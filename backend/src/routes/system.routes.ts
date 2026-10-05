import { Router, Request, Response } from 'express';
import { aggregator } from '../services/AggregatorService';
import { config } from '../config';

const router = Router();

router.get('/system/status', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  const sources = aggregator.getSourceHealths();
  const mem = process.memoryUsage();

  res.json({
    status: state.status,
    isUpdating: state.isUpdating,
    lastUpdatedAt: state.lastUpdatedAt,
    refreshIntervalMs: config.dataRefreshInterval,
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
    },
    counts: {
      floodPoints: state.floodPoints.length,
      waterLevels: state.waterLevels.length,
      rainfall: state.rainfall.length,
      cctv: state.cctv.length,
      alerts: state.alerts.length
    },
    sources
  });
});

router.get('/sources', (_req: Request, res: Response) => {
  const sources = aggregator.getSourceHealths();
  res.json({ data: sources });
});

router.post('/system/refresh', async (_req: Request, res: Response) => {
  try {
    await aggregator.fetchAll();
    res.json({ success: true, message: 'Data refresh initiated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/weather', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({ data: state.weather || null });
});

router.get('/gis/districts', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json(state.gis.districts);
});

router.get('/gis/canals', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json(state.gis.canals);
});

export default router;
