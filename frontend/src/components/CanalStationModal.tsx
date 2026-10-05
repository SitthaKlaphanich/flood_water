import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  Waves, 
  Clock, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Camera, 
  AlertTriangle, 
  Info, 
  Database,
  Copy,
  Check,
  Power,
  Gauge
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { WaterLevelPoint, HistoricalRecord, CCTVPoint } from '../types';
import { formatDateTime, formatDataAge, formatTimeOnly } from '../utils/formatters';

interface CanalStationModalProps {
  station: WaterLevelPoint | null;
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

export const CanalStationModal: React.FC<CanalStationModalProps> = ({
  station,
  onClose,
  cctvList = [],
  onSelectCCTV
}) => {
  const [history, setHistory] = useState<HistoricalRecord[]>([]);
  const [firstRecordedAt, setFirstRecordedAt] = useState<string | null>(null);
  const [periodHours, setPeriodHours] = useState<number>(24);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [trend, setTrend] = useState<'RISING' | 'STABLE' | 'FALLING' | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Fetch history for this water level station
  useEffect(() => {
    if (!station) return;
    setLoadingHistory(true);

    fetch(`/api/water-levels/${encodeURIComponent(station.id)}/history?hours=${periodHours}`)
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setHistory(data.data);
          setFirstRecordedAt(data.firstRecordedAt || null);
          setTrend(data.trend || null);
        } else {
          setHistory([]);
          setFirstRecordedAt(null);
          setTrend(null);
        }
      })
      .catch(err => {
        console.error('Error fetching canal station history:', err);
        setHistory([]);
        setFirstRecordedAt(null);
        setTrend(null);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [station?.id, periodHours]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!station) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [station, onClose]);

  // Copy coordinates to clipboard
  const handleCopyCoords = () => {
    if (!station?.latitude || !station?.longitude) return;
    const text = `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    });
  };

  // Nearby CCTVs within 3km
  const nearbyCCTVs = useMemo(() => {
    if (!station?.latitude || !station?.longitude || !cctvList.length) return [];
    return cctvList
      .map(c => ({
        camera: c,
        distanceM: getDistanceMeters(station.latitude, station.longitude, c.latitude, c.longitude)
      }))
      .filter(item => item.distanceM <= 3000)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 3);
  }, [station?.latitude, station?.longitude, cctvList]);

  if (!station) return null;

  // Stale check (> 30 mins = 1800s or status is 'ขัดข้อง')
  const isStale = (station.dataAgeSeconds !== undefined && station.dataAgeSeconds > 1800) || 
                  station.sourceStatus === 'ขัดข้อง' || 
                  station.sourceStatus === 'ออฟไลน์';

  // Status badge config strictly from upstream
  const getStatusBadge = (rawStatus: string) => {
    if (rawStatus.includes('วิกฤต')) {
      return {
        label: 'วิกฤต (กทม.)',
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      };
    }
    if (rawStatus.includes('เตือนภัย')) {
      return {
        label: 'เตือนภัย (กทม.)',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      };
    }
    if (rawStatus.includes('เฝ้าระวัง')) {
      return {
        label: 'เฝ้าระวัง (กทม.)',
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800'
      };
    }
    if (rawStatus === 'ขัดข้อง' || rawStatus === 'ออฟไลน์') {
      return {
        label: 'ขัดข้อง / ออฟไลน์ (กทม.)',
        badgeClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
      };
    }
    return {
      label: rawStatus || 'ปกติ (กทม.)',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    };
  };

  const statusBadge = getStatusBadge(station.sourceStatus);

  // Water level presentation in ม.รทก.
  const hasWaterLevel = station.waterLevelM !== undefined && station.waterLevelM !== null && !isNaN(station.waterLevelM);
  const waterLevelDisplay = hasWaterLevel ? `${station.waterLevelM} ม.รทก.` : 'ไม่มีข้อมูล';
  const isNegativeLevel = hasWaterLevel && (station.waterLevelM! < 0);

  // Outer water levels
  const hasOuterLevel = station.wlOut01 !== undefined && station.wlOut01 !== null && !isNaN(station.wlOut01);
  const outerLevelDisplay = hasOuterLevel ? `${station.wlOut01} ม.รทก.` : 'ไม่มีข้อมูล / ไม่มีหัววัดด้านนอก';

  // Format chart data
  const chartData = history.map(h => ({
    time: formatTimeOnly(h.timestamp),
    fullTime: formatDateTime(h.timestamp),
    value: h.value
  }));

  const initialRecordDisplay = firstRecordedAt
    ? formatDateTime(firstRecordedAt)
    : (station.measuredAt ? formatDateTime(station.measuredAt) : 'ไม่มีข้อมูล');

  // Trend badge rendering: strictly requires >= 3 points over >= 30 mins
  const renderTrendBadge = () => {
    if (!trend) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <Minus className="w-3.5 h-3.5 text-slate-400" />
          ไม่มีข้อมูลแนวโน้ม (ต้องมีข้อมูลย้อนหลังอย่างน้อย 3 จุด ในช่วง 30 นาทีขึ้นไป)
        </span>
      );
    }

    switch (trend) {
      case 'RISING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            แนวโน้มระดับน้ำในคลองเพิ่มขึ้น (Rising)
          </span>
        );
      case 'FALLING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            แนวโน้มระดับน้ำในคลองลดลง (Falling)
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Minus className="w-3.5 h-3.5" />
            ระดับน้ำในคลองทรงตัว (Stable)
          </span>
        );
    }
  };

  const officialUrl = station.waterUrl || station.sourceUrl || 'https://weather.bangkok.go.th/water/';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0 bg-cyan-600">
              <Waves className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  จุดวัดระดับน้ำในคลอง
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${statusBadge.badgeClass}`}>
                  {statusBadge.label}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                {station.name || 'ไม่ระบุชื่อสถานี'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>คลอง: {station.river || 'ไม่มีข้อมูล'}</span>
                <span>•</span>
                <span>เขต: {station.district ? `เขต${station.district}` : 'ไม่มีข้อมูล'}</span>
                <span>•</span>
                <span className="font-mono">รหัส: {station.code || station.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title="ปิดหน้าต่าง (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stale Warning Banner */}
        {isStale && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800/80 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>ข้อมูลไม่อัปเดต:</strong> สถานีนี้ไม่ได้ส่งข้อมูลใหม่เกิน 30 นาที หรือระบบต้นทางแจ้งสถานะขัดข้อง (อายุข้อมูล {formatDataAge(station.dataAgeSeconds || 0)})
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">

          {/* Section 1: Key Canal Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Canal Water Level (Inside) */}
            <div className="p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/60">
              <span className="text-[11px] font-medium text-cyan-800 dark:text-cyan-300 block">
                ระดับน้ำในคลอง (ด้านใน)
              </span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {waterLevelDisplay}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                หน่วย: ม.รทก. (เมตร ระดับทะเลปานกลาง)
              </span>
            </div>

            {/* 2. Source Status */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                สถานะจากระบบ กทม.
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {station.sourceStatus || 'ไม่มีข้อมูล'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ระดับตลิ่ง: ไม่มีข้อมูลจากต้นทาง
              </span>
            </div>

            {/* 3. Pumps & Flow summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                เครื่องสูบน้ำ / การไหล
              </span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {station.pumpCount > 0 
                  ? `เดินเครื่อง ${station.totalPumpOn} / ${station.pumpCount} ตัว` 
                  : 'ไม่มีเครื่องสูบน้ำ'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                อัตราการไหล: ไม่มีข้อมูล
              </span>
            </div>
          </div>

          {/* Negative Water Level Note */}
          {isNegativeLevel && (
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <Info className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <strong>หมายเหตุค่าระดับน้ำติดลบ:</strong> ค่าระดับน้ำติดลบหมายถึงระดับผิวน้ำอยู่ต่ำกว่าระดับน้ำทะเลปานกลาง (0.00 ม.รทก.) ซึ่งเกิดจากการเดินเครื่องสูบน้ำเพื่อพร่องน้ำในคลองเพื่อเตรียมรองรับน้ำฝน ไม่ใช่เซนเซอร์ขัดข้อง
              </div>
            </div>
          )}

          {/* Outer Water Level (If station is at sluice gate / river mouth) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ระดับน้ำด้านนอก ปตร. / ริมแม่น้ำ:
              </span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {outerLevelDisplay}
            </span>
          </div>

          {/* Section 2: Gate & Pump Operational Details */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5">
              <Power className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                สถานะการจัดการน้ำ (เครื่องสูบน้ำและประตูระบายน้ำ)
              </span>
            </div>

            {/* Pumps Detail */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                <span>
                  เครื่องสูบน้ำ: {station.pumpCount > 0 ? `${station.pumpCount} เครื่อง (เปิดทำงาน ${station.totalPumpOn} เครื่อง)` : 'ไม่มีเครื่องสูบน้ำ'}
                </span>
                {station.pumpCount > 0 && (
                  <span className="text-[11px] font-mono text-slate-400">
                    อัตราเปิดใช้งาน: {Math.round((station.totalPumpOn / station.pumpCount) * 100)}%
                  </span>
                )}
              </div>

              {station.pumps && station.pumps.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  {station.pumps.map(p => (
                    <span 
                      key={p.pumpNumber}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        p.isOn 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold'
                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.isOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      ปั๊ม {p.pumpNumber}: {p.isOn ? 'เดินเครื่อง' : 'ปิด'}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  {station.pumpCount > 0 ? 'ต้นทางไม่ส่งสถานะรายเครื่อง' : 'ไม่มีอุปกรณ์เครื่องสูบน้ำ'}
                </p>
              )}
            </div>

            {/* Gates Detail */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5">
                <span>
                  ประตูระบายน้ำ: {station.gateCount > 0 ? `${station.gateCount} บาน` : 'ไม่มีประตูระบายน้ำ'}
                </span>
              </div>

              {station.gates && station.gates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  {station.gates.map(g => (
                    <span 
                      key={g.gateNumber}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        g.openMeters !== null && g.openMeters > 0
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-bold'
                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      บาน {g.gateNumber}: {g.openMeters !== null ? (g.openMeters > 0 ? `ยก ${g.openMeters} ม.` : 'ปิดสนิท') : 'ไม่มีข้อมูล'}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  {station.gateCount > 0 ? 'ต้นทางไม่ส่งระยะยกบานประตู' : 'ไม่มีอุปกรณ์ประตูระบายน้ำ'}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Trend Analysis */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              การวิเคราะห์แนวโน้มระดับน้ำ (Trend):
            </span>
            <div>{renderTrendBadge()}</div>
          </div>

          {/* Section 4: Historical Graph */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-cyan-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  กราฟแสดงประวัติระดับน้ำในคลอง (ม.รทก.)
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
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Chart or Fallback */}
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
                    <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} unit=" ม." />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 rounded-lg bg-slate-900 text-white text-xs shadow-lg border border-slate-800">
                              <p className="font-semibold">{data.fullTime}</p>
                              <p className="text-cyan-400 mt-1">
                                ระดับน้ำในคลอง: {data.value} ม.รทก.
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
                      stroke="#0891b2"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                /* Fallback Banner */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center rounded-xl bg-white/70 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700">
                  <Database className="w-8 h-8 text-cyan-600 mb-2 opacity-80" />
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

          {/* Section 5: Full Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Station Code */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">รหัสสถานี (Station Code)</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                {station.code || station.id || 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* River / Canal */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">คลอง/ลำน้ำ (River/Canal)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                {station.river || 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* District */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เขต (District)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {station.district ? `เขต${station.district}` : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* Coordinates */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 block text-[10px]">พิกัด (Coordinates)</span>
                {station.latitude && station.longitude && (
                  <button 
                    onClick={handleCopyCoords} 
                    className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5"
                    title="คัดลอกพิกัด"
                  >
                    {copiedCoords ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copiedCoords ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                )}
              </div>
              <span className="font-mono text-slate-700 dark:text-slate-200 text-[11px] block mt-0.5">
                {station.latitude && station.longitude
                  ? `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`
                  : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* Measured At */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เวลาตรวจวัด (measuredAt)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 block truncate">
                {station.measuredAt ? formatDateTime(station.measuredAt) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* Fetched At */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">เวลาที่ดึงข้อมูล (fetchedAt)</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 block truncate">
                {station.fetchedAt ? formatDateTime(station.fetchedAt) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* Data Age */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">อายุของข้อมูล (Data Age)</span>
              <span className={`font-medium ${isStale ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                {station.dataAgeSeconds !== undefined ? formatDataAge(station.dataAgeSeconds) : 'ไม่มีข้อมูล'}
              </span>
            </div>

            {/* Bank Level / Threshold */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">ระดับตลิ่ง (Bank Level)</span>
              <span className="text-slate-500 dark:text-slate-400">
                ไม่มีข้อมูลจากต้นทาง
              </span>
            </div>

            {/* Flow Rate */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">อัตราการไหล (Flow Rate)</span>
              <span className="text-slate-500 dark:text-slate-400">
                ไม่มีข้อมูล
              </span>
            </div>
          </div>

          {/* Section 6: Nearby CCTV */}
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
                ไม่พบกล้อง CCTV สาธารณะในรัศมี 3 กิโลเมตรจากจุดตรวจวัดคลองนี้
              </p>
            )}
          </div>

        </div>

        {/* Footer Attribution & Deep Link */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            แหล่งข้อมูล: <span className="font-medium text-slate-700 dark:text-slate-300">{station.source || 'สำนักการระบายน้ำ กรุงเทพมหานคร'}</span>
          </div>

          {officialUrl ? (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <span>เปิดข้อมูลจากเว็บไซต์ทางการ กทม.</span>
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
