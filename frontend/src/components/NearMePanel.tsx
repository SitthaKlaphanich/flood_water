import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, Droplets, Camera, CloudRain, ChevronRight, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NearbyAnalysis, FloodPoint, WaterLevelPoint, CCTVPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';

interface NearMePanelProps {
  onLocateUser: () => void;
  isLocating: boolean;
  userCoords: { latitude: number; longitude: number } | null;
  locationError: string | null;
  nearbyData: NearbyAnalysis | null;
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
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50"
      >
        <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
        <span>{isLocating ? 'กำลังค้นหาตำแหน่ง...' : '📍 ใช้ตำแหน่งของฉัน'}</span>
      </button>
    );
  }

  const summary = nearbyData?.summary;
  const floods = nearbyData?.floodPointsWithin1km || [];
  const cctvs = nearbyData?.cctvWithin1km || [];
  const waterLevels = nearbyData?.waterLevelsWithin5km || [];
  const rain = nearbyData?.rainWithin5km || [];

  const getTrendIcon = (t?: string) => {
    switch (t) {
      case 'RISING':
        return <TrendingUp className="w-3.5 h-3.5 text-rose-500" />;
      case 'FALLING':
        return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-w-sm w-full transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">สถานการณ์รอบตัวคุณ</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              วิเคราะห์รัศมี 1 - 5 กม.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onLocateUser}
            disabled={isLocating}
            title="อัปเดตตำแหน่ง"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {locationError && (
        <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {locationError}
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

      {/* Nearby Flood Points (within 1km) */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/40 dark:hover:bg-blue-900/30 flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ห่าง {f.distanceMeters} ม. • {f.road || 'ในพื้นที่'}
                      </div>
                    </div>
                    <div className="text-right">
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

        {/* Nearby Water Level Stations (within 5km) */}
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
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-cyan-50 dark:bg-slate-800/40 dark:hover:bg-cyan-950/30 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-2">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate max-w-[170px]">
                          {w.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ห่าง {w.distanceMeters} ม. • {w.river || 'คลอง'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conf.badgeClass}`}>
                        {w.waterLevelM ?? '-'} ม.
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nearby CCTV (within 1.5km) */}
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
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/40 dark:hover:bg-emerald-950/30 flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ห่าง {c.distanceMeters} ม.
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
