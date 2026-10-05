"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AggregatorService_1 = require("../services/AggregatorService");
const config_1 = require("../config");
const router = (0, express_1.Router)();
router.get('/system/status', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    const sources = AggregatorService_1.aggregator.getSourceHealths();
    const mem = process.memoryUsage();
    res.json({
        status: state.status,
        isUpdating: state.isUpdating,
        lastUpdatedAt: state.lastUpdatedAt,
        refreshIntervalMs: config_1.config.dataRefreshInterval,
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
router.get('/sources', (_req, res) => {
    const sources = AggregatorService_1.aggregator.getSourceHealths();
    res.json({ data: sources });
});
router.post('/system/refresh', async (_req, res) => {
    try {
        await AggregatorService_1.aggregator.fetchAll();
        res.json({ success: true, message: 'Data refresh initiated' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
router.get('/weather', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({ data: state.weather || null });
});
router.get('/gis/districts', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json(state.gis.districts);
});
router.get('/gis/canals', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json(state.gis.canals);
});
exports.default = router;
