"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const AggregatorService_1 = require("./services/AggregatorService");
const flood_routes_1 = __importDefault(require("./routes/flood.routes"));
const water_routes_1 = __importDefault(require("./routes/water.routes"));
const rain_routes_1 = __importDefault(require("./routes/rain.routes"));
const cctv_routes_1 = __importDefault(require("./routes/cctv.routes"));
const nearby_routes_1 = __importDefault(require("./routes/nearby.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const app = (0, express_1.default)();
// Security Middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Allow embedding map tiles and CCTV previews
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
// CORS Configuration
const allowedOrigins = config_1.config.corsOrigin === '*'
    ? '*'
    : config_1.config.corsOrigin.split(',').map(o => o.trim());
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: config_1.config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' }
});
app.use('/api', limiter);
app.use(express_1.default.json());
// Request logging in dev
if (config_1.config.nodeEnv !== 'production') {
    app.use((req, _res, next) => {
        console.log(`[HTTP] ${req.method} ${req.url}`);
        next();
    });
}
// Mount Routes
app.use('/api', flood_routes_1.default);
app.use('/api', water_routes_1.default);
app.use('/api', rain_routes_1.default);
app.use('/api', cctv_routes_1.default);
app.use('/api', nearby_routes_1.default);
app.use('/api', system_routes_1.default);
// Health check root
app.get('/health', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: 'ok',
        systemStatus: state.status,
        lastUpdated: state.lastUpdatedAt,
        uptime: process.uptime()
    });
});
// Serve Frontend in Production / Standalone mode
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const frontendDist = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/health')
            return next();
        res.sendFile(path_1.default.join(frontendDist, 'index.html'));
    });
}
// Central Error Handler
app.use((err, _req, res, _next) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: config_1.config.nodeEnv === 'production' ? 'An unexpected error occurred' : err.message
    });
});
// Start Server & Aggregator
const server = app.listen(config_1.config.port, () => {
    console.log(`====================================================`);
    console.log(` Bangkok Flood Monitor - Backend Server`);
    console.log(` Listening on port: ${config_1.config.port}`);
    console.log(` Environment: ${config_1.config.nodeEnv}`);
    console.log(` Refresh Interval: ${config_1.config.dataRefreshInterval}ms`);
    console.log(`====================================================`);
    AggregatorService_1.aggregator.startPolling();
});
// Graceful Shutdown
const shutdown = () => {
    console.log('\nShutting down gracefully...');
    AggregatorService_1.aggregator.stopPolling();
    server.close(() => {
        console.log('Server closed. Goodbye.');
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
