"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NearbyService_1 = require("../services/NearbyService");
const router = (0, express_1.Router)();
router.get('/nearby', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
        return;
    }
    // Bangkok roughly spans lat 13.4 - 14.0, lng 100.3 - 100.9
    if (lat < 13.0 || lat > 14.5 || lng < 99.8 || lng > 101.2) {
        res.status(400).json({ error: 'Coordinates are out of Bangkok metropolitan bounds' });
        return;
    }
    const analysis = (0, NearbyService_1.getNearbyAnalysis)(lat, lng);
    res.json({ data: analysis });
});
exports.default = router;
