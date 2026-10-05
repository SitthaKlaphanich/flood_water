"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AggregatorService_1 = require("../services/AggregatorService");
const repository_1 = require("../database/repository");
const router = (0, express_1.Router)();
router.get('/flood-points', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: state.status,
        lastUpdatedAt: state.lastUpdatedAt,
        count: state.floodPoints.length,
        data: state.floodPoints
    });
});
router.get('/flood-points/:id', (req, res) => {
    const { id } = req.params;
    const state = AggregatorService_1.aggregator.getState();
    const point = state.floodPoints.find(p => p.id === id || p.code === id);
    if (!point) {
        res.status(404).json({ error: 'Flood point not found' });
        return;
    }
    res.json({ data: point });
});
router.get('/flood-points/:id/history', (req, res) => {
    const { id } = req.params;
    const hours = parseInt(req.query.hours, 10) || 24;
    const { history, firstRecordedAt } = repository_1.repository.getHistory(id, hours);
    const trend = repository_1.repository.calculateTrend(id);
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
router.get('/flood-alerts', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: state.status,
        lastUpdatedAt: state.lastUpdatedAt,
        count: state.alerts.length,
        data: state.alerts
    });
});
exports.default = router;
