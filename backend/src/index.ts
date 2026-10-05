import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { aggregator } from './services/AggregatorService';

import floodRoutes from './routes/flood.routes';
import waterRoutes from './routes/water.routes';
import rainRoutes from './routes/rain.routes';
import cctvRoutes from './routes/cctv.routes';
import nearbyRoutes from './routes/nearby.routes';
import systemRoutes from './routes/system.routes';

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow embedding map tiles and CCTV previews
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const allowedOrigins = config.corsOrigin === '*' 
  ? '*' 
  : config.corsOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api', limiter);

app.use(express.json());

// Request logging in dev
if (config.nodeEnv !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });
}

// Mount Routes
app.use('/api', floodRoutes);
app.use('/api', waterRoutes);
app.use('/api', rainRoutes);
app.use('/api', cctvRoutes);
app.use('/api', nearbyRoutes);
app.use('/api', systemRoutes);

// Health check root
app.get('/health', (_req: Request, res: Response) => {
  const state = aggregator.getState();
  res.json({
    status: 'ok',
    systemStatus: state.status,
    lastUpdated: state.lastUpdatedAt,
    uptime: process.uptime()
  });
});

// Serve Frontend in Production / Standalone mode
import path from 'path';
import fs from 'fs';

const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Central Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start Server & Aggregator
const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` Bangkok Flood Monitor - Backend Server`);
  console.log(` Listening on port: ${config.port}`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(` Refresh Interval: ${config.dataRefreshInterval}ms`);
  console.log(`====================================================`);

  aggregator.startPolling();
});

// Graceful Shutdown
const shutdown = () => {
  console.log('\nShutting down gracefully...');
  aggregator.stopPolling();
  server.close(() => {
    console.log('Server closed. Goodbye.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
