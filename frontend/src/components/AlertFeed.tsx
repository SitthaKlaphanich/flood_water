import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowUpRight, Clock, Waves, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { AlertItem, FloodPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';
import { formatDataAge, formatDateTime, formatTimeOnly } from '../utils/formatters';
import { STALE_THRESHOLD_SECONDS, getSourceStatusInfo, APP_CALCULATION_EXPLANATION } from '../config/flood.config';

interface AlertFeedProps {
  alerts: AlertItem[];
  floodPoints: FloodPoint[];
  onSelectStation: (station: FloodPoint) => void;
  onSelectAlert?: (alert: AlertItem) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  floodPoints,
  onSelectStation,
  onSelectAlert
}) => {
  const [staleOpen, setStaleOpen] = useState<boolean>(false);

  // Helper to determine if a flood point is fresh
  const isPointFresh = (f: FloodPoint) => {
    // Check if measuredAt is valid and within stale threshold
    const measuredTime = new Date(f.measuredAt || '').getTime();
    const ageSeconds = !isNaN(measuredTime) 
      ? Math.max(0, (Date.now() - measuredTime) / 1000) 
      : f.dataAgeSeconds;

    const isStale = ageSeconds > STALE_THRESHOLD_SECONDS;
    const isMalfunction = f.sourceStatus === 'malfunction' || f.isOnline === false;

    return !isStale && !isMalfunction;
  };

  // 1. Fresh active flood points (water > 0cm AND within 3 hours AND device online)
  const activeFreshFloods = floodPoints
    .filter(f => f.waterLevelCm > 0 && isPointFresh(f))
    .sort((a, b) => b.waterLevelCm - a.waterLevelCm);

  // 2. Stale / offline points (water > 0cm BUT older than 3 hours or malfunctioning)
  const staleFloods = floodPoints
    .filter(f => f.waterLevelCm > 0 && !isPointFresh(f))
    .sort((a, b) => a.dataAgeSeconds - b.dataAgeSeconds);

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">การแจ้งเตือนน้ำท่วม (Flood Alerts)</h3>
            <p className="text-[11px] text-slate-400">
              นับเฉพาะจุดตรวจวัดที่ส่งข้อมูลสด (ภายใน 3 ชม.)
            </p>
          </div>
        </div>

        {/* Badge counting ONLY fresh points */}
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          activeFreshFloods.length > 0
            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
            : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
        }`}>
          {activeFreshFloods.length} จุดท่วมขัง
        </span>
      </div>

      {/* Explanatory banner on criteria */}
      <div className="my-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <span>{APP_CALCULATION_EXPLANATION}</span>
          <span className="block text-slate-400 mt-0.5">• แยกแสดงสถานะจากต้นทางดิบ และป้ายระดับที่แอปคำนวณ</span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {activeFreshFloods.length === 0 && alerts.length === 0 && staleFloods.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <Waves className="w-8 h-8 text-emerald-500 mb-1" />
            <p className="font-medium text-slate-600 dark:text-slate-300">สถานการณ์ปกติ</p>
            <p className="text-[11px]">ไม่พบจุดน้ำท่วมขังบนผิวจราจรในขณะนี้</p>
          </div>
        ) : (
          <>
            {/* 1. Fresh Active Flood Points */}
            {activeFreshFloods.length > 0 ? (
              activeFreshFloods.map(f => {
                const conf = getSeverityConfig(f.calculatedSeverity);
                const sourceInfo = getSourceStatusInfo(f.sourceStatus);

                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectStation(f)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1. Source Status (Primary) */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                          ต้นทาง: {sourceInfo.label}
                        </span>

                        {/* 2. App-calculated Level Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${conf.badgeClass}`} title="คำนวณตามเกณฑ์ระดับความสูงของแอป">
                          เกณฑ์แอป: {conf.label}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400">
                          {f.code}
                        </span>
                      </div>

                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        {f.waterLevelCm} ซม.
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {f.name}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>
                        {f.road ? f.road : 'ไม่ระบุถนน'} {f.district ? `• เขต${f.district}` : ''}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {formatDataAge(f.dataAgeSeconds)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-center text-xs text-emerald-700 dark:text-emerald-300">
                ✓ ไม่มีจุดน้ำท่วมสดในขณะนี้ (ข้อมูลย้อนหลัง 3 ชั่วโมง)
              </div>
            )}

            {/* 2. Collapsible Stale / Offline Group */}
            {staleFloods.length > 0 && (
              <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setStaleOpen(!staleOpen)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>ไม่ส่งค่า / ข้อมูลเก่า ({staleFloods.length} จุด)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>{staleOpen ? 'ซ่อน' : 'แสดง'}</span>
                    {staleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {staleOpen && (
                  <div className="p-2 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 px-1">
                      * จุดเหล่านี้ไม่ได้ส่งค่าใหม่เกิน 3 ชม. หรือเซ็นเซอร์ขัดข้อง ทาง กทม. จึงค้างค่าเดิมไว้ ไม่นำมานับเป็นเหตุการณ์ปัจจุบัน
                    </p>

                    {staleFloods.map(f => {
                      const sourceInfo = getSourceStatusInfo(f.sourceStatus);
                      return (
                        <div
                          key={f.id}
                          onClick={() => onSelectStation(f)}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {f.name}
                            </span>
                            <span className="font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0">
                              ค้างที่ {f.waterLevelCm} ซม.
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {sourceInfo.label}
                            </span>
                            <span className="text-slate-400">
                              ค่าล่าสุดเมื่อ: {formatDateTime(f.measuredAt)} ({formatDataAge(f.dataAgeSeconds)})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. BMA Incident Log Notifications */}
            {alerts.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">
                  บันทึกรายงานสถานการณ์จาก กทม. ({alerts.length} รายการ)
                </div>

                {alerts.slice(0, 8).map(a => {
                  const conf = getSeverityConfig(a.calculatedSeverity);
                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelectAlert && onSelectAlert(a)}
                      className="p-3 mb-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 bg-white hover:bg-rose-50/20 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition cursor-pointer text-xs shadow-sm group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${conf.badgeClass}`}>
                          บันทึกเหตุการณ์ กทม.
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(a.measuredAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-rose-600 dark:group-hover:text-rose-400 transition line-clamp-2">
                        {a.detail}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{a.road || a.district ? `${a.road || ''} ${a.district ? 'เขต' + a.district : ''}` : 'กทม.'}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center gap-0.5">
                          <span>ดูรายละเอียด</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
