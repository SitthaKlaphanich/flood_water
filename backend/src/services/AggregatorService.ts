import { config } from '../config';
import { BangkokFloodAdapter } from '../adapters/BangkokFloodAdapter';
import { BangkokWaterLevelAdapter } from '../adapters/BangkokWaterLevelAdapter';
import { BangkokRainfallAdapter } from '../adapters/BangkokRainfallAdapter';
import { BangkokCCTVAdapter } from '../adapters/BangkokCCTVAdapter';
import { BangkokAlertAdapter } from '../adapters/BangkokAlertAdapter';
import { WeatherAdapter } from '../adapters/WeatherAdapter';
import { BangkokGISAdapter, GISFeatureCollection } from '../adapters/BangkokGISAdapter';
import { repository } from '../database/repository';
import {
  FloodPoint,
  WaterLevelPoint,
  RainPoint,
  CCTVPoint,
  AlertItem,
  WeatherData,
  SourceHealth,
  HistoricalRecord
} from '../types/models';

export interface AggregatorState {
  status: 'LIVE' | 'UPDATING' | 'DELAYED' | 'OFFLINE';
  lastUpdatedAt: string;
  isUpdating: boolean;
  floodPoints: FloodPoint[];
  waterLevels: WaterLevelPoint[];
  rainfall: RainPoint[];
  cctv: CCTVPoint[];
  alerts: AlertItem[];
  weather?: WeatherData;
  gis: { districts: GISFeatureCollection; canals: GISFeatureCollection };
}

export class AggregatorService {
  private floodAdapter = new BangkokFloodAdapter();
  private waterLevelAdapter = new BangkokWaterLevelAdapter();
  private rainfallAdapter = new BangkokRainfallAdapter();
  private cctvAdapter = new BangkokCCTVAdapter();
  private alertAdapter = new BangkokAlertAdapter();
  private weatherAdapter = new WeatherAdapter();
  private gisAdapter = new BangkokGISAdapter();

  private state: AggregatorState = {
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

  private pollTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.restoreFromCache();
  }

  startPolling(): void {
    console.log(`[Aggregator] Starting polling loop every ${config.dataRefreshInterval}ms...`);
    // Initial fetch
    this.fetchAll();

    // Periodic schedule
    this.pollTimer = setInterval(() => {
      this.fetchAll();
    }, config.dataRefreshInterval);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async fetchAll(): Promise<void> {
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

  private async fetchFlood(): Promise<void> {
    try {
      const data = await this.floodAdapter.fetch();
      this.state.floodPoints = data;
      repository.setCachedSource(this.floodAdapter.key, data, data.length);

      // Save snapshots for historical graphs
      const now = new Date().toISOString();
      const snapshots: HistoricalRecord[] = data.map(d => ({
        stationId: d.id,
        stationType: 'flood',
        value: d.waterLevelCm,
        timestamp: d.measuredAt || now
      }));
      repository.saveSnapshots(snapshots);
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch flood points:', err.message);
      const cached = repository.getCachedSource<FloodPoint[]>(this.floodAdapter.key);
      if (cached && (!this.state.floodPoints || this.state.floodPoints.length === 0)) {
        this.state.floodPoints = cached.payload;
      }
    }
  }

  private async fetchWaterLevels(): Promise<void> {
    try {
      const data = await this.waterLevelAdapter.fetch();

      // Compute trends for stations
      const enriched = data.map(pt => ({
        ...pt,
        trend: repository.calculateTrend(pt.id) || undefined
      }));

      this.state.waterLevels = enriched;
      repository.setCachedSource(this.waterLevelAdapter.key, enriched, enriched.length);

      // Save snapshots for historical graphs
      const now = new Date().toISOString();
      const snapshots: HistoricalRecord[] = enriched
        .filter(d => d.waterLevelM !== undefined)
        .map(d => ({
          stationId: d.id,
          stationType: 'water_level',
          value: d.waterLevelM!,
          timestamp: d.measuredAt || now
        }));
      repository.saveSnapshots(snapshots);
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch water levels:', err.message);
      const cached = repository.getCachedSource<WaterLevelPoint[]>(this.waterLevelAdapter.key);
      if (cached && (!this.state.waterLevels || this.state.waterLevels.length === 0)) {
        this.state.waterLevels = cached.payload;
      }
    }
  }

  private async fetchRainfall(): Promise<void> {
    try {
      const data = await this.rainfallAdapter.fetch();
      this.state.rainfall = data;
      repository.setCachedSource(this.rainfallAdapter.key, data, data.length);

      const now = new Date().toISOString();
      const snapshots: HistoricalRecord[] = data.map(d => ({
        stationId: d.id,
        stationType: 'rain',
        value: d.rf1hr,
        timestamp: d.measuredAt || now
      }));
      repository.saveSnapshots(snapshots);
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch rainfall:', err.message);
      const cached = repository.getCachedSource<RainPoint[]>(this.rainfallAdapter.key);
      if (cached && (!this.state.rainfall || this.state.rainfall.length === 0)) {
        this.state.rainfall = cached.payload;
      }
    }
  }

  private async fetchCCTV(): Promise<void> {
    try {
      const data = await this.cctvAdapter.fetch();
      this.state.cctv = data;
      repository.setCachedSource(this.cctvAdapter.key, data, data.length);
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch CCTV:', err.message);
      const cached = repository.getCachedSource<CCTVPoint[]>(this.cctvAdapter.key);
      if (cached && (!this.state.cctv || this.state.cctv.length === 0)) {
        this.state.cctv = cached.payload;
      }
    }
  }

  private async fetchAlerts(): Promise<void> {
    try {
      const data = await this.alertAdapter.fetch();
      this.state.alerts = data;
      repository.setCachedSource(this.alertAdapter.key, data, data.length);
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch alerts:', err.message);
      const cached = repository.getCachedSource<AlertItem[]>(this.alertAdapter.key);
      if (cached && (!this.state.alerts || this.state.alerts.length === 0)) {
        this.state.alerts = cached.payload;
      }
    }
  }

  private async fetchWeather(): Promise<void> {
    try {
      const data = await this.weatherAdapter.fetch();
      this.state.weather = data;
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch weather:', err.message);
    }
  }

  private async fetchGIS(): Promise<void> {
    try {
      const data = await this.gisAdapter.fetch();
      this.state.gis = data;
    } catch (err: any) {
      console.error('[Aggregator] Failed to fetch GIS layers:', err.message);
    }
  }

  private evaluateSystemStatus(): void {
    const healths = this.getSourceHealths();
    const onlineCount = healths.filter(h => h.status === 'online').length;
    const total = healths.length;

    if (onlineCount === total) {
      this.state.status = 'LIVE';
    } else if (onlineCount > 0) {
      this.state.status = 'DELAYED';
    } else {
      this.state.status = 'OFFLINE';
    }
  }

  private restoreFromCache(): void {
    console.log('[Aggregator] Restoring cached data for instant cold start...');
    const flood = repository.getCachedSource<FloodPoint[]>(this.floodAdapter.key);
    if (flood) this.state.floodPoints = flood.payload;

    const water = repository.getCachedSource<WaterLevelPoint[]>(this.waterLevelAdapter.key);
    if (water) this.state.waterLevels = water.payload;

    const rain = repository.getCachedSource<RainPoint[]>(this.rainfallAdapter.key);
    if (rain) this.state.rainfall = rain.payload;

    const cctv = repository.getCachedSource<CCTVPoint[]>(this.cctvAdapter.key);
    if (cctv) this.state.cctv = cctv.payload;

    const alerts = repository.getCachedSource<AlertItem[]>(this.alertAdapter.key);
    if (alerts) this.state.alerts = alerts.payload;
  }

  getState(): AggregatorState {
    return this.state;
  }

  getSourceHealths(): SourceHealth[] {
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

export const aggregator = new AggregatorService();
