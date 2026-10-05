"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregator = exports.AggregatorService = void 0;
const config_1 = require("../config");
const BangkokFloodAdapter_1 = require("../adapters/BangkokFloodAdapter");
const BangkokWaterLevelAdapter_1 = require("../adapters/BangkokWaterLevelAdapter");
const BangkokRainfallAdapter_1 = require("../adapters/BangkokRainfallAdapter");
const BangkokCCTVAdapter_1 = require("../adapters/BangkokCCTVAdapter");
const BangkokAlertAdapter_1 = require("../adapters/BangkokAlertAdapter");
const WeatherAdapter_1 = require("../adapters/WeatherAdapter");
const BangkokGISAdapter_1 = require("../adapters/BangkokGISAdapter");
const repository_1 = require("../database/repository");
class AggregatorService {
    floodAdapter = new BangkokFloodAdapter_1.BangkokFloodAdapter();
    waterLevelAdapter = new BangkokWaterLevelAdapter_1.BangkokWaterLevelAdapter();
    rainfallAdapter = new BangkokRainfallAdapter_1.BangkokRainfallAdapter();
    cctvAdapter = new BangkokCCTVAdapter_1.BangkokCCTVAdapter();
    alertAdapter = new BangkokAlertAdapter_1.BangkokAlertAdapter();
    weatherAdapter = new WeatherAdapter_1.WeatherAdapter();
    gisAdapter = new BangkokGISAdapter_1.BangkokGISAdapter();
    state = {
        status: 'OFFLINE',
        lastUpdatedAt: new Date(0).toISOString(),
        isUpdating: false,
        floodPoints: [],
        waterLevels: [],
        rainfall: [],
        cctv: [],
        alerts: [],
        gis: { districts: { type: 'FeatureCollection', features: [] }, canals: { type: 'FeatureCollection', features: [] } }
    };
    pollTimer = null;
    constructor() {
        this.restoreFromCache();
    }
    startPolling() {
        console.log(`[Aggregator] Starting polling loop every ${config_1.config.dataRefreshInterval}ms...`);
        // Initial fetch
        this.fetchAll();
        // Periodic schedule
        this.pollTimer = setInterval(() => {
            this.fetchAll();
        }, config_1.config.dataRefreshInterval);
    }
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }
    async fetchAll() {
        if (this.state.isUpdating) {
            console.log('[Aggregator] Fetch already in progress, skipping duplicate tick.');
            return;
        }
        this.state.isUpdating = true;
        console.log('[Aggregator] Fetching fresh data from BMA public services...');
        const tasks = [
            this.fetchFlood(),
            this.fetchWaterLevels(),
            this.fetchRainfall(),
            this.fetchCCTV(),
            this.fetchAlerts(),
            this.fetchWeather(),
            this.fetchGIS()
        ];
        await Promise.allSettled(tasks);
        this.state.isUpdating = false;
        this.state.lastUpdatedAt = new Date().toISOString();
        this.evaluateSystemStatus();
        console.log(`[Aggregator] Updated: ${this.state.floodPoints.length} flood pts, ${this.state.waterLevels.length} water stations, ${this.state.rainfall.length} rain pts, ${this.state.cctv.length} cameras. Status: ${this.state.status}`);
    }
    async fetchFlood() {
        try {
            const data = await this.floodAdapter.fetch();
            this.state.floodPoints = data;
            repository_1.repository.setCachedSource(this.floodAdapter.key, data, data.length);
            // Save snapshots for historical graphs
            const now = new Date().toISOString();
            const snapshots = data.map(d => ({
                stationId: d.id,
                stationType: 'flood',
                value: d.waterLevelCm,
                timestamp: d.measuredAt || now
            }));
            repository_1.repository.saveSnapshots(snapshots);
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch flood points:', err.message);
            const cached = repository_1.repository.getCachedSource(this.floodAdapter.key);
            if (cached && (!this.state.floodPoints || this.state.floodPoints.length === 0)) {
                this.state.floodPoints = cached.payload;
            }
        }
    }
    async fetchWaterLevels() {
        try {
            const data = await this.waterLevelAdapter.fetch();
            // Compute trends for stations
            const enriched = data.map(pt => ({
                ...pt,
                trend: repository_1.repository.calculateTrend(pt.id) || undefined
            }));
            this.state.waterLevels = enriched;
            repository_1.repository.setCachedSource(this.waterLevelAdapter.key, enriched, enriched.length);
            // Save snapshots for historical graphs
            const now = new Date().toISOString();
            const snapshots = enriched
                .filter(d => d.waterLevelM !== undefined)
                .map(d => ({
                stationId: d.id,
                stationType: 'water_level',
                value: d.waterLevelM,
                timestamp: d.measuredAt || now
            }));
            repository_1.repository.saveSnapshots(snapshots);
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch water levels:', err.message);
            const cached = repository_1.repository.getCachedSource(this.waterLevelAdapter.key);
            if (cached && (!this.state.waterLevels || this.state.waterLevels.length === 0)) {
                this.state.waterLevels = cached.payload;
            }
        }
    }
    async fetchRainfall() {
        try {
            const data = await this.rainfallAdapter.fetch();
            this.state.rainfall = data;
            repository_1.repository.setCachedSource(this.rainfallAdapter.key, data, data.length);
            const now = new Date().toISOString();
            const snapshots = data.map(d => ({
                stationId: d.id,
                stationType: 'rain',
                value: d.rf1hr,
                timestamp: d.measuredAt || now
            }));
            repository_1.repository.saveSnapshots(snapshots);
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch rainfall:', err.message);
            const cached = repository_1.repository.getCachedSource(this.rainfallAdapter.key);
            if (cached && (!this.state.rainfall || this.state.rainfall.length === 0)) {
                this.state.rainfall = cached.payload;
            }
        }
    }
    async fetchCCTV() {
        try {
            const data = await this.cctvAdapter.fetch();
            this.state.cctv = data;
            repository_1.repository.setCachedSource(this.cctvAdapter.key, data, data.length);
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch CCTV:', err.message);
            const cached = repository_1.repository.getCachedSource(this.cctvAdapter.key);
            if (cached && (!this.state.cctv || this.state.cctv.length === 0)) {
                this.state.cctv = cached.payload;
            }
        }
    }
    async fetchAlerts() {
        try {
            const data = await this.alertAdapter.fetch();
            this.state.alerts = data;
            repository_1.repository.setCachedSource(this.alertAdapter.key, data, data.length);
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch alerts:', err.message);
            const cached = repository_1.repository.getCachedSource(this.alertAdapter.key);
            if (cached && (!this.state.alerts || this.state.alerts.length === 0)) {
                this.state.alerts = cached.payload;
            }
        }
    }
    async fetchWeather() {
        try {
            const data = await this.weatherAdapter.fetch();
            this.state.weather = data;
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch weather:', err.message);
        }
    }
    async fetchGIS() {
        try {
            const data = await this.gisAdapter.fetch();
            this.state.gis = data;
        }
        catch (err) {
            console.error('[Aggregator] Failed to fetch GIS layers:', err.message);
        }
    }
    evaluateSystemStatus() {
        const healths = this.getSourceHealths();
        const onlineCount = healths.filter(h => h.status === 'online').length;
        const total = healths.length;
        if (onlineCount === total) {
            this.state.status = 'LIVE';
        }
        else if (onlineCount > 0) {
            this.state.status = 'DELAYED';
        }
        else {
            this.state.status = 'OFFLINE';
        }
    }
    restoreFromCache() {
        console.log('[Aggregator] Restoring cached data for instant cold start...');
        const flood = repository_1.repository.getCachedSource(this.floodAdapter.key);
        if (flood)
            this.state.floodPoints = flood.payload;
        const water = repository_1.repository.getCachedSource(this.waterLevelAdapter.key);
        if (water)
            this.state.waterLevels = water.payload;
        const rain = repository_1.repository.getCachedSource(this.rainfallAdapter.key);
        if (rain)
            this.state.rainfall = rain.payload;
        const cctv = repository_1.repository.getCachedSource(this.cctvAdapter.key);
        if (cctv)
            this.state.cctv = cctv.payload;
        const alerts = repository_1.repository.getCachedSource(this.alertAdapter.key);
        if (alerts)
            this.state.alerts = alerts.payload;
    }
    getState() {
        return this.state;
    }
    getSourceHealths() {
        return [
            this.floodAdapter.getHealth(),
            this.waterLevelAdapter.getHealth(),
            this.rainfallAdapter.getHealth(),
            this.cctvAdapter.getHealth(),
            this.alertAdapter.getHealth(),
            this.weatherAdapter.getHealth(),
            this.gisAdapter.getHealth()
        ];
    }
}
exports.AggregatorService = AggregatorService;
exports.aggregator = new AggregatorService();
