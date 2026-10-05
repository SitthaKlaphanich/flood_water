import { Router, Request, Response } from 'express';
import { getNearbyAnalysis } from '../services/NearbyService';

const router = Router();

router.get('/nearby', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
    return;
  }

  // Bangkok roughly spans lat 13.4 - 14.0, lng 100.3 - 100.9
  if (lat < 13.0 || lat > 14.5 || lng < 99.8 || lng > 101.2) {
    res.status(400).json({ error: 'Coordinates are out of Bangkok metropolitan bounds' });
    return;
  }

  const analysis = getNearbyAnalysis(lat, lng);
  res.json({ data: analysis });
});

export default router;
