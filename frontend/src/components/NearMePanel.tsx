import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, Droplets, Camera, CloudRain, ChevronRight, ChevronDown, X, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { NearbyAnalysis, FloodPoint, WaterLevelPoint, CCTVPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';

interface NearMePanelProps {
  onLocateUser: () => void;
  isLocating: boolean;
  userCoords: { latitude: number; longitude: number } | null;
  locationError: string | null;
  nearbyData: NearbyAnalysis | null;
  locationName?: string | null;
  onSelectFloodPoint: (point: FloodPoint) => void;
  onSelectWaterLevel?: (point: WaterLevelPoint) => void;
  onSelectCCTV: (cctv: CCTVPoint) => void;
  onClose?: () => void;
}

export const NearMePanel: React.FC<NearMePanelProps> = ({
  onLocateUser,
  isLocating,
  userCoords,
  locationError,
  nearbyData,
  locationName,
  onSelectFloodPoint,
  onSelectWaterLevel,
  onSelectCCTV,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!userCoords && !nearbyData) {
    return (
      <button
        onClick={onLocateUser}
        disabled={isLocating}
        aria-label="ค้นหาตำแหน่งของฉันด้วย GPS"
        className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
        <span>{isLocating ? 'กำลังค้นหาตำแหน่ง...' : '📍 ใช้ตำแหน่งของฉัน'}</span>
      </button>
    );
  }

  const summary = nearbyData?.summary;
  const floods = nearbyData?.floodPointsWithin1km || [];
  const cctvs = nearbyData?.cctvWithin1km || [];
  const waterLevels = nearbyData?.waterLevelsWithin5km || [];
  const rain = nearbyData?.rainWithin5km || [];

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-w-sm w-full transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            {locationName ? <MapPin className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-bold text-sm">
              {locationName ? `สถานการณ์รอบ ${locationName}` : 'สถานการณ์รอบตัวคุณ'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              วิเคราะห์รัศมี 1 - 5 กม.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'ยุบแผงสถานการณ์ใกล้ฉัน' : 'ขยายแผงสถานการณ์ใกล้ฉัน'}
            title={isExpanded ? 'ยุบการ์ด' : 'ขยายการ์ด'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
          <button
            onClick={onLocateUser}
            disabled={isLocating}
            aria-label="อัปเดตตำแหน่ง GPS ของคุณ"
            title="อัปเดตตำแหน่ง"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="ปิดแผงสถานการณ์ใกล้ฉัน"
              title="ปิด"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Locating Spinner State */}
          {isLocating && (
            <div className="my-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังดึงพิกัด GPS และวิเคราะห์ข้อมูลรอบตัวคุณ...</span>
            </div>
          )}

          {/* Location Error State */}
          {locationError && (
            <div className="my-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>ไม่สามารถระบุตำแหน่งได้</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-2">
                {locationError}
              </p>
              <button
                onClick={onLocateUser}
                aria-label="ลองค้นหาตำแหน่ง GPS อีกครั้ง"
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          )}

          {/* Summary KPI Cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>ระดับน้ำสูงสุด</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {summary.maxFloodCm} <span className="text-xs font-normal text-slate-400">ซม.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-blue-500" />
                  <span>ฝนใน 1 ชม.</span>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {summary.nearbyRain1hr} <span className="text-xs font-normal text-slate-400">มม.</span>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Sections */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {/* Nearby Flood Points */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>จุดวัดน้ำท่วมถนน (ใน 1.5 กม.)</span>
                <span className="text-[11px] text-slate-400">{floods.length} จุด</span>
              </div>
              {floods.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">ไม่มีจุดตรวจวัดน้ำท่วมในระยะใกล้เคียง</p>
              ) : (
                <div className="space-y-1.5">
                  {floods.slice(0, 3).map(f => {
                    const conf = getSeverityConfig(f.calculatedSeverity);
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelectFloodPoint(f)}
                        aria-label={`จุดน้ำท่วม ${f.name} ห่าง ${f.distanceMeters} เมตร ระดับ ${f.waterLevelCm} ซม.`}
                        className="w-full min-h-[44px] text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/40 dark:hover:bg-blue-900/30 flex items-center justify-between transition group border border-slate-100 dark:border-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ห่าง {f.distanceMeters} ม. • {f.road || 'ในพื้นที่'}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conf.badgeClass}`}>
                            {f.waterLevelCm} ซม.
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nearby Water Level Stations */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>สถานีวัดระดับน้ำคลอง (ใน 5 กม.)</span>
                <span className="text-[11px] text-slate-400">{waterLevels.length} จุด</span>
              </div>
              {waterLevels.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">ไม่มีสถานีวัดระดับน้ำในระยะใกล้เคียง</p>
              ) : (
                <div className="space-y-1.5">
                  {waterLevels.slice(0, 3).map(w => {
                    const conf = getSeverityConfig(w.calculatedSeverity);
                    return (
                      <button
                        key={w.id}
                        onClick={() => onSelectWaterLevel && onSelectWaterLevel(w)}
                        aria-label={`สถานีคลอง ${w.name} ห่าง ${w.distanceMeters} เมตร ระดับ ${w.waterLevelM || '-'} ม.`}
                        className="w-full min-h-[44px] text-left p-2.5 rounded-xl bg-slate-50 hover:bg-cyan-50 dark:bg-slate-800/40 dark:hover:bg-cyan-950/30 flex items-center justify-between transition group border border-slate-100 dark:border-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <Droplets className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                              {w.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              ห่าง {w.distanceMeters} ม. • {w.river || 'คลอง'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {w.waterLevelM !== undefined && w.waterLevelM !== null && !isNaN(w.waterLevelM) ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conf.badgeClass}`}>
                              {w.waterLevelM} ม.รทก.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              <Minus className="w-2.5 h-2.5" />
                              ไม่มีข้อมูล
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nearby CCTV */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>กล้อง CCTV ใกล้คุณ</span>
                <span className="text-[11px] text-slate-400">{cctvs.length} กล้อง</span>
              </div>
              {cctvs.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">ไม่พบกล้องในระยะใกล้เคียง</p>
              ) : (
                <div className="space-y-1.5">
                  {cctvs.slice(0, 2).map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelectCCTV(c)}
                      aria-label={`กล้อง CCTV ${c.name} ห่าง ${c.distanceMeters} เมตร`}
                      className="w-full min-h-[44px] text-left p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/40 dark:hover:bg-emerald-950/30 flex items-center justify-between transition group border border-slate-100 dark:border-slate-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Camera className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ห่าง {c.distanceMeters} ม.
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
