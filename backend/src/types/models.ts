export type SeverityLevel = 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FloodPoint {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  district?: string;
  road?: string;
  waterLevelCm: number;
  sourceStatus: string;
  calculatedSeverity: SeverityLevel;
  mainRoad: boolean;
  source: string;
  sourceUrl: string;
  measuredAt?: string;
  fetchedAt: string;
  dataAgeSeconds: number;
  isOnline: boolean;
}

export interface GateDetail {
  gateNumber: number;
  openMeters: number | null;
}

export interface PumpDetail {
  pumpNumber: number;
  isOn: boolean;
}

export interface WaterLevelPoint {
  id: string;
  code: string;
  name: string;
  river?: string;
  district?: string;
  waterLevelM?: number;
  wlOut01?: number;
  wlOut02?: number;
  sourceStatus: string;
  calculatedSeverity: SeverityLevel;
  pumpCount: number;
  totalPumpOn: number;
  gateCount: number;
  gates?: GateDetail[];
  pumps?: PumpDetail[];
  latitude: number;
  longitude: number;
  waterUrl?: string;
  source: string;
  sourceUrl: string;
  measuredAt?: string;
  fetchedAt: string;
  dataAgeSeconds: number;
  isOnline: boolean;
  trend?: 'RISING' | 'STABLE' | 'FALLING';
}

export interface RainPoint {
  id: string;
  code: string;
  name: string;
  district?: string;
  rf5min: number;
  rf15min: number;
  rf30min: number;
  rf1hr: number;
  rf3hr: number;
  rf6hr: number;
  rf12hr: number;
  rf24hr: number;
  status: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceUrl: string;
  measuredAt?: string;
  fetchedAt: string;
  dataAgeSeconds: number;
  isOnline: boolean;
}

export interface CCTVPoint {
  id: string;
  name: string;
  nameEn?: string;
  latitude: number;
  longitude: number;
  district?: string;
  road?: string;
  streamType: 'snapshot' | 'iframe' | 'hls' | 'external';
  streamUrl?: string;
  snapshotUrl?: string;
  sourceUrl: string;
  lastCheckedAt: string;
  isOnline: boolean;
  source: string;
}

export interface AlertItem {
  id: string;
  title: string;
  detail: string;
  waterLevelCm?: number;
  sensorCode?: string;
  district?: string;
  road?: string;
  sourceStatus?: string;
  calculatedSeverity: SeverityLevel;
  measuredAt: string;
  source: string;
  sourceUrl: string;
}

export interface HistoricalRecord {
  stationId: string;
  stationType: 'flood' | 'water_level' | 'rain';
  value: number;
  timestamp: string;
}

export interface SourceHealth {
  name: string;
  key: string;
  status: 'online' | 'degraded' | 'offline';
  lastSuccessfulFetch: string | null;
  responseTimeMs: number;
  recordCount: number;
  error?: string;
  url: string;
}

export interface WeatherData {
  time: string;
  temperature: number;
  humidity: number;
  rain: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  source: string;
}

export interface NearbyAnalysis {
  userLocation: { latitude: number; longitude: number };
  floodPointsWithin1km: (FloodPoint & { distanceMeters: number })[];
  cctvWithin1km: (CCTVPoint & { distanceMeters: number })[];
  waterLevelsWithin5km: (WaterLevelPoint & { distanceMeters: number })[];
  rainWithin5km: (RainPoint & { distanceMeters: number })[];
  currentWeather?: WeatherData;
  summary: {
    maxFloodCm: number;
    highestSeverity: SeverityLevel;
    nearbyRain1hr: number;
    trend: 'RISING' | 'STABLE' | 'FALLING';
  };
}
