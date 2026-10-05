import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FloodPoint,
  WaterLevelPoint,
  RainPoint,
  CCTVPoint,
  AlertItem,
  WeatherData,
  SystemStatusData
} from '../types';

interface PollingData {
  floodPoints: FloodPoint[];
  waterLevels: WaterLevelPoint[];
  rainfall: RainPoint[];
  cctv: CCTVPoint[];
  alerts: AlertItem[];
  weather: WeatherData | null;
  systemStatus: SystemStatusData | null;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
  countdown: number;
  refetch: () => Promise<void>;
}

export function usePolling(intervalMs: number = 30000): PollingData {
  const [floodPoints, setFloodPoints] = useState<FloodPoint[]>([]);
  const [waterLevels, setWaterLevels] = useState<WaterLevelPoint[]>([]);
  const [rainfall, setRainfall] = useState<RainPoint[]>([]);
  const [cctv, setCctv] = useState<CCTVPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(Math.floor(intervalMs / 1000));

  const intervalSec = Math.floor(intervalMs / 1000);
  const isFetchingRef = useRef<boolean>(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsRefreshing(true);

    try {
      const [
        floodRes,
        waterRes,
        rainRes,
        cctvRes,
        alertsRes,
        weatherRes,
        statusRes
      ] = await Promise.all([
        fetch('/api/flood-points').then(r => r.json()),
        fetch('/api/water-levels').then(r => r.json()),
        fetch('/api/rainfall').then(r => r.json()),
        fetch('/api/cctv').then(r => r.json()),
        fetch('/api/flood-alerts').then(r => r.json()),
        fetch('/api/weather').then(r => r.json()).catch(() => ({ data: null })),
        fetch('/api/system/status').then(r => r.json()).catch(() => null)
      ]);

      if (floodRes.data) setFloodPoints(floodRes.data);
      if (waterRes.data) setWaterLevels(waterRes.data);
      if (rainRes.data) setRainfall(rainRes.data);
      if (cctvRes.data) setCctv(cctvRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (weatherRes.data) setWeather(weatherRes.data);
      if (statusRes) setSystemStatus(statusRes);

      setLastUpdated(floodRes.lastUpdatedAt || new Date().toISOString());
      setError(null);
    } catch (err: any) {
      console.error('[usePolling] Fetch error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กำลังแสดงข้อมูลล่าสุดในแคช');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
      setCountdown(intervalSec);
    }
  }, [intervalSec]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Countdown timer & auto-fetch
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData, intervalSec]);

  return {
    floodPoints,
    waterLevels,
    rainfall,
    cctv,
    alerts,
    weather,
    systemStatus,
    loading,
    isRefreshing,
    error,
    lastUpdated,
    countdown,
    refetch: fetchData
  };
}
