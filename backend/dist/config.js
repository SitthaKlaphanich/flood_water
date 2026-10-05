"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from backend or root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.config = {
    port: parseInt(process.env.PORT || '5001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dataRefreshInterval: parseInt(process.env.DATA_REFRESH_INTERVAL || '30000', 10),
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '30', 10),
    dbType: process.env.DB_TYPE || 'sqlite',
    dbPath: process.env.DB_PATH || path_1.default.resolve(__dirname, '../../database/bangkok_flood.sqlite'),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    bmaSedgisBase: 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted',
    bmaDirectusBase: 'https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1',
    bmaTrafficBase: 'http://www.bmatraffic.com'
};
