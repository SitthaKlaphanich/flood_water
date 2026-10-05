"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AggregatorService_1 = require("../services/AggregatorService");
const router = (0, express_1.Router)();
router.get('/rainfall', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: state.status,
        lastUpdatedAt: state.lastUpdatedAt,
        count: state.rainfall.length,
        data: state.rainfall
    });
});
exports.default = router;
