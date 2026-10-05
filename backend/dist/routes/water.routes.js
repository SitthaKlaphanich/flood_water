"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AggregatorService_1 = require("../services/AggregatorService");
const repository_1 = require("../database/repository");
const router = (0, express_1.Router)();
router.get('/water-levels', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: state.status,
        lastUpdatedAt: state.lastUpdatedAt,
        count: state.waterLevels.length,
        data: state.waterLevels
    });
});
router.get('/water-levels/:id', (req, res) => {
    const { id } = req.params;
    const state = AggregatorService_1.aggregator.getState();
    const point = state.waterLevels.find(p => p.id === id || p.code === id);
    if (!point) {
        res.status(404).json({ error: 'Water level station not found' });
        return;
    }
    res.json({ data: point });
});
router.get('/water-levels/:id/history', (req, res) => {
    const { id } = req.params;
    const state = AggregatorService_1.aggregator.getState();
    const point = state.waterLevels.find(p => p.id === id || p.code === id);
    const targetId = point ? point.id : id;
    const hours = parseInt(req.query.hours, 10) || 24;
    const { history, firstRecordedAt } = repository_1.repository.getHistory(targetId, hours);
    const trend = repository_1.repository.calculateTrend(targetId);
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
exports.default = router;
