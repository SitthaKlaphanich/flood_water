"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistanceMeters = calculateDistanceMeters;
exports.getNearbyAnalysis = getNearbyAnalysis;
const AggregatorService_1 = require("./AggregatorService");
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
function getNearbyAnalysis(latitude, longitude) {
    const state = AggregatorService_1.aggregator.getState();
    // 1. Flood points within 1 km (1000m)
    const nearbyFloods = state.floodPoints
        .map(p => ({
        ...p,
        distanceMeters: calculateDistanceMeters(latitude, longitude, p.latitude, p.longitude)
    }))
        .filter(p => p.distanceMeters <= 1500)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    // 2. CCTV within 1.5 km
    const nearbyCCTVs = state.cctv
        .map(c => ({
        ...c,
        distanceMeters: calculateDistanceMeters(latitude, longitude, c.latitude, c.longitude)
    }))
        .filter(c => c.distanceMeters <= 1500)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    // 3. Water-level stations within 5 km (5000m)
    const nearbyWaterLevels = state.waterLevels
        .map(w => ({
        ...w,
        distanceMeters: calculateDistanceMeters(latitude, longitude, w.latitude, w.longitude)
    }))
        .filter(w => w.distanceMeters <= 5000)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    // 4. Rain stations within 5 km (5000m)
    const nearbyRain = state.rainfall
        .map(r => ({
        ...r,
        distanceMeters: calculateDistanceMeters(latitude, longitude, r.latitude, r.longitude)
    }))
        .filter(r => r.distanceMeters <= 5000)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    // Calculate summary metrics
    let maxFloodCm = 0;
    let highestSeverity = 'NORMAL';
    const severityRank = {
        NORMAL: 0,
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
    };
    nearbyFloods.forEach(f => {
        if (f.waterLevelCm > maxFloodCm)
            maxFloodCm = f.waterLevelCm;
        if (severityRank[f.calculatedSeverity] > severityRank[highestSeverity]) {
            highestSeverity = f.calculatedSeverity;
        }
    });
    const nearbyRain1hr = nearbyRain.length > 0 ? Math.max(...nearbyRain.map(r => r.rf1hr)) : 0;
    const trend = nearbyWaterLevels.length > 0 ? (nearbyWaterLevels[0].trend || 'STABLE') : 'STABLE';
    return {
        userLocation: { latitude, longitude },
        floodPointsWithin1km: nearbyFloods,
        cctvWithin1km: nearbyCCTVs,
        waterLevelsWithin5km: nearbyWaterLevels,
        rainWithin5km: nearbyRain,
        currentWeather: state.weather,
        summary: {
            maxFloodCm,
            highestSeverity,
            nearbyRain1hr,
            trend
        }
    };
}
