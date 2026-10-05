import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Activity, Clock, MapPin, TrendingUp, TrendingDown, Minus, Camera, AlertCircle, Info, Database } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FloodPoint, WaterLevelPoint, HistoricalRecord, CCTVPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';
import { formatDateTime, formatDataAge, formatTimeOnly } from '../utils/formatters';
import { getSourceStatusInfo, APP_CALCULATION_EXPLANATION } from '../config/flood.config';

interface StationModalProps {
  station: FloodPoint | WaterLevelPoint | null;
  onClose: () => void;
  cctvList?: CCTVPoint[];
  onSelectCCTV?: (cctv: CCTVPoint) => void;
}

// Haversine formula to compute distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const StationModal: React.FC<StationModalProps> = ({
  station,
  onClose,
  cctvList = [],
  onSelectCCTV
}) => {
  const [history, setHistory] = useState<HistoricalRecord[]>([]);
  const [firstRecordedAt, setFirstRecordedAt] = useState<string | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState<boolean>(false);
  const [periodHours, setPeriodHours] = useState<number>(24);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [trend, setTrend] = useState<'RISING' | 'STABLE' | 'FALLING' | null>(null);

  const isRoadFlood = station && 'waterLevelCm' in station;
  const isCanal = station && 'waterLevelM' in station;

  useEffect(() => {
    if (!station) return;
    setLoadingHistory(true);

    const historyEndpoint = isRoadFlood
      ? `/api/flood-points/${encodeURIComponent(station.id)}/history?hours=${periodHours}`
      : `/api/water-levels/${encodeURIComponent(station.id)}/history?hours=${periodHours}`;

    fetch(historyEndpoint)
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setHistory(data.data);
          setFirstRecordedAt(data.firstRecordedAt || null);
          setHasEnoughData(data.hasEnoughData ?? data.data.length >= 2);
          setTrend(data.trend || null);
        } else {
          setHistory([]);
          setFirstRecordedAt(null);
          setHasEnoughData(false);
          setTrend(null);
        }
      })
      .catch(err => {
        console.error('Error fetching station history:', err);
        setHistory([]);
        setFirstRecordedAt(null);
        setHasEnoughData(false);
        setTrend(null);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [station?.id, periodHours, isRoadFlood]);

  // Handle escape key
  useEffect(() => {
    if (!station) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [station, onClose]);

  if (!station) return null;

  const severity = getSeverityConfig(station.calculatedSeverity);
  const sourceInfo = getSourceStatusInfo(station.sourceStatus);

  const valueDisplay = isRoadFlood 
    ? `${(station as FloodPoint).waterLevelCm !== undefined ? (station as FloodPoint).waterLevelCm : 'ไม่มีข้อมูล'} ซม. (cm)`
    : `${(station as WaterLevelPoint).waterLevelM !== undefined && (station as WaterLevelPoint).waterLevelM !== null ? `${(station as WaterLevelPoint).waterLevelM} ม.รทก. (m)` : 'ไม่มีข้อมูล'}`;

  // Find nearby CCTVs within 3km
  const nearbyCCTVs = (station.latitude && station.longitude && cctvList.length > 0)
    ? cctvList
        .map(c => ({
          camera: c,
          distanceM: getDistanceMeters(station.latitude, station.longitude, c.latitude, c.longitude)
        }))
        .filter(item => item.distanceM <= 3000)
        .sort((a, b) => a.distanceM - b.distanceM)
        .slice(0, 3)
    : [];

  const renderTrendBadge = () => {
    if (!hasEnoughData || !trend) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <Minus className="w-3 h-3 text-slate-400" />
          ข้อมูลไม่พอสำหรับวิเคราะห์แนวโน้ม
        </span>
      );
    }

    switch (trend) {
      case 'RISING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            แนวโน้มระดับน้ำเพิ่มขึ้น (Rising)
          </span>
        );
      case 'FALLING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            แนวโน้มระดับน้ำลดลง (Falling)
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Minus className="w-3.5 h-3.5" />
            ระดับน้ำทรงตัว (Stable)
          </span>
        );
    }
  };

  // Format chart data
  const chartData = history.map(h => ({
    time: formatTimeOnly(h.timestamp),
    fullTime: formatDateTime(h.timestamp),
    value: h.value
  }));

  const initialRecordDisplay = firstRecordedAt
    ? formatDateTime(firstRecordedAt)
    : (station.measuredAt ? formatDateTime(station.measuredAt) : 'ไม่มีข้อมูล');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 ${
              isRoadFlood ? 'bg-blue-600' : 'bg-cyan-600'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  {station.name || 'ไม่มีข้อมูลชื่อสถานี'}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${severity.badgeClass}`}>
                  เกณฑ์แอป: {severity.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  ถนน: {'road' in station && station.road ? station.road : 'ไม่มีข้อมูล'} • เขต: {station.district ? `เขต${station.district}` : 'ไม่มีข้อมูล'}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {/* Key Metric Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Current Value */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                ระดับน้ำปัจจุบัน
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {valueDisplay}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isRoadFlood ? 'ระดับน้ำท่วมขังบนผิวถนน' : 'ระดับน้ำในคลองเทียบ รทก.'}
              </span>
            </div>

            {/* 2. Source Status (Raw) */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                สถานะจากระบบต้นทาง
              </span>
              <span className={`text-sm font-bold mt-1 block ${
                sourceInfo.isError ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
              }`}>
                {sourceInfo.label}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                ค่าดิบ: {station.sourceStatus || 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 3. App Calculated Level */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                ระดับที่แอปคำนวณ (เกณฑ์แอป)
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                {severity.label}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {APP_CALCULATION_EXPLANATION}
              </span>
            </div>
          </div>

          {/* Trend Section */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              การวิเคราะห์แนวโน้มระดับน้ำ (Trend):
            </span>
            <div>{renderTrendBadge()}</div>
          </div>

          {/* Historical Graph Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  กราฟแสดงประวัติระดับน้ำย้อนหลัง
                </span>
              </div>

              {/* Period Selectors */}
              <div className="flex items-center gap-1 text-[11px]">
                {[
                  { label: '1 ชม.', h: 1 },
                  { label: '3 ชม.', h: 3 },
                  { label: '6 ชม.', h: 6 },
                  { label: '12 ชม.', h: 12 },
                  { label: '24 ชม.', h: 24 },
                  { label: '7 วัน', h: 168 }
                ].map(p => (
                  <button
                    key={p.h}
                    onClick={() => setPeriodHours(p.h)}
                    className={`px-2 py-0.5 rounded-md font-medium transition ${
                      periodHours === p.h
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Chart or Not-Enough-Data Banner */}
            <div className="h-56 w-full">
              {loadingHistory ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  กำลังโหลดข้อมูลกราฟประวัติ...
                </div>
              ) : chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2 rounded-lg bg-slate-900 text-white text-xs shadow-lg border border-slate-800">
                              <p className="font-semibold">{data.fullTime}</p>
                              <p className="text-blue-400 mt-0.5">
                                ระดับน้ำ: {data.value} {isRoadFlood ? 'ซม.' : 'ม.'}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={isRoadFlood ? '#3b82f6' : '#06b6d4'}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                /* Clear requirement: When data is insufficient, show starting message - DO NOT leave empty */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded-xl bg-white/70 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700">
                  <Database className="w-8 h-8 text-blue-500 mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    เริ่มเก็บข้อมูลเมื่อ {initialRecordDisplay}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    กราฟจะเต็มเมื่อระบบเก็บข้อมูลครบตามช่วงเวลา (ปัจจุบันบันทึกได้ {chartData.length} จุดข้อมูล ซึ่งต้องการอย่างน้อย 2 จุดเพื่อวาดเส้นกราฟ)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Full Detailed Station Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {/* 1. Station Code */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">รหัสสถานี (Station Code)</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                {station.code || station.id || 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 2. Station Name */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">ชื่อสถานี (Station Name)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                {station.name || 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 3. Road */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">ถนน (Road)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {'road' in station && station.road ? station.road : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 4. District */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เขต (District)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {station.district ? `เขต${station.district}` : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 5. Coordinates */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">พิกัด (Coordinates)</span>
              <span className="font-mono text-slate-700 dark:text-slate-200">
                {station.latitude && station.longitude
                  ? `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`
                  : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 6. Measured At */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เวลาตรวจวัด (measuredAt)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {station.measuredAt ? formatDateTime(station.measuredAt) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 7. Fetched At */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เวลาที่ดึงข้อมูล (fetchedAt)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {station.fetchedAt ? formatDateTime(station.fetchedAt) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 8. Data Age */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">อายุของข้อมูล (Data Age)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {station.dataAgeSeconds !== undefined ? formatDataAge(station.dataAgeSeconds) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* 9. Canal specific attributes if applicable */}
            {isCanal && (
              <>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">คลอง/ลำน้ำ (River/Canal)</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {(station as WaterLevelPoint).river || 'ไม่มีข้อมูล'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">เครื่องสูบน้ำ (Pumps)</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {(station as WaterLevelPoint).pumpCount !== undefined
                      ? `เดินเครื่อง ${(station as WaterLevelPoint).totalPumpOn || 0} / ${(station as WaterLevelPoint).pumpCount} เครื่อง`
                      : 'ไม่มีข้อมูล'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Nearby CCTV Section (Render only when enough data) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                กล้อง CCTV สาธารณะใกล้เคียง (รัศมี 3 กม.)
              </span>
            </div>

            {nearbyCCTVs.length > 0 ? (
              <div className="space-y-1.5">
                {nearbyCCTVs.map(({ camera, distanceM }) => (
                  <div
                    key={camera.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                        {camera.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ระยะห่าง: ~{Math.round(distanceM)} เมตร {camera.road ? `(${camera.road})` : ''}
                      </span>
                    </div>

                    {onSelectCCTV && (
                      <button
                        onClick={() => onSelectCCTV(camera)}
                        className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-medium transition"
                      >
                        ดูภาพกล้อง
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-1">
                ไม่พบกล้อง CCTV สาธารณะในรัศมี 3 กิโลเมตรจากจุดตรวจวัดนี้
              </p>
            )}
          </div>

        </div>

        {/* Footer Attribution & Source Link */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            แหล่งข้อมูล: <span className="font-medium text-slate-700 dark:text-slate-300">{station.source || 'ไม่มีข้อมูล'}</span>
          </div>

          {station.sourceUrl ? (
            <a
              href={station.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
            >
              <span>ดูข้อมูลจากเว็บไซต์ต้นทาง</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-slate-400 text-xs">ไม่มีลิงก์ต้นทาง</span>
          )}
        </div>

      </div>
    </div>
  );
};
