import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend or root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  dataRefreshInterval: parseInt(process.env.DATA_REFRESH_INTERVAL || '30000', 10),
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '30', 10),
  dbType: process.env.DB_TYPE || 'sqlite',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../database/bangkok_flood.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  bmaSedgisBase: 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted',
  bmaDirectusBase: 'https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1',
  bmaTrafficBase: 'http://www.bmatraffic.com'
};
