import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, ArrowUpRight, Clock, Waves, ChevronDown, ChevronRight, Info, RefreshCw } from 'lucide-react';
import { AlertItem, FloodPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';
import { formatDataAge, formatDateTime, formatTimeOnly } from '../utils/formatters';
import { STALE_THRESHOLD_SECONDS, getSourceStatusInfo, APP_CALCULATION_EXPLANATION } from '../config/flood.config';

interface AlertFeedProps {
  alerts: AlertItem[];
  floodPoints: FloodPoint[];
  onSelectStation: (station: FloodPoint) => void;
  onSelectAlert?: (alert: AlertItem) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  floodPoints,
  onSelectStation,
  onSelectAlert,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [staleOpen, setStaleOpen] = useState<boolean>(false);

  // Helper to determine if a flood point is fresh
  const isPointFresh = (f: FloodPoint) => {
    const measuredTime = new Date(f.measuredAt || '').getTime();
    const ageSeconds = !isNaN(measuredTime) 
      ? Math.max(0, (Date.now() - measuredTime) / 1000) 
      : f.dataAgeSeconds;

    const isStale = ageSeconds > STALE_THRESHOLD_SECONDS;
    const isMalfunction = f.sourceStatus === 'malfunction' || f.isOnline === false;

    return !isStale && !isMalfunction;
  };

  // 1. Fresh active flood points (water > 0cm AND within 3 hours AND device online)
  // Sorted strictly by: Highest severity / water level first -> Freshest timestamp first if tied
  const activeFreshFloods = floodPoints
    .filter(f => f.waterLevelCm > 0 && isPointFresh(f))
    .sort((a, b) => {
      if (b.waterLevelCm !== a.waterLevelCm) {
        return b.waterLevelCm - a.waterLevelCm;
      }
      const timeA = a.measuredAt ? new Date(a.measuredAt).getTime() : 0;
      const timeB = b.measuredAt ? new Date(b.measuredAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return (a.dataAgeSeconds || 0) - (b.dataAgeSeconds || 0);
    });

  // 2. Stale / offline points (water > 0cm BUT older than 3 hours or malfunctioning)
  const staleFloods = floodPoints
    .filter(f => f.waterLevelCm > 0 && !isPointFresh(f))
    .sort((a, b) => {
      if (b.waterLevelCm !== a.waterLevelCm) {
        return b.waterLevelCm - a.waterLevelCm;
      }
      return (a.dataAgeSeconds || 0) - (b.dataAgeSeconds || 0);
    });

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">การแจ้งเตือนน้ำท่วม (Flood Alerts)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              นับเฉพาะจุดตรวจวัดที่ส่งข้อมูลสด (ภายใน 3 ชม.)
            </p>
          </div>
        </div>

        {/* Badge counting ONLY fresh points */}
        <span 
          aria-label={`จำนวนจุดน้ำท่วมสด ${activeFreshFloods.length} จุด`}
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            activeFreshFloods.length > 0
              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
          }`}
        >
          {activeFreshFloods.length} จุดท่วมขัง
        </span>
      </div>

      {/* Explanatory banner on criteria */}
      <div className="my-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="leading-tight">
          <span>{APP_CALCULATION_EXPLANATION}</span>
          <span className="block text-slate-400 dark:text-slate-500 mt-0.5">• แยกชัดเจน: ป้ายประเมินจากเกณฑ์แอป vs สถานะที่ กทม. ส่งมา</span>
        </div>
      </div>

      {/* Content Area: Distinct States */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {/* 1. Loading State */}
        {isLoading && (
          <div className="space-y-3 py-4" aria-live="polite" aria-busy="true">
            <div className="flex items-center justify-center gap-2 text-xs text-rose-600 dark:text-rose-400 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดข้อมูลการแจ้งเตือนน้ำท่วม...</span>
            </div>
            {[1, 2, 3].map(n => (
              <div key={n} className="p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 animate-pulse">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Error State */}
        {!isLoading && error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center my-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1">
              ไม่สามารถโหลดข้อมูลการแจ้งเตือนได้
            </h4>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-3">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                aria-label="ลองโหลดข้อมูลการแจ้งเตือนใหม่อีกครั้ง"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !error && activeFreshFloods.length === 0 && alerts.length === 0 && staleFloods.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs my-4">
            <Waves className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">สถานการณ์ปกติ</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              ไม่พบจุดน้ำท่วมขังบนผิวจราจรในขณะนี้ ข้อมูลอัปเดตตรงจากเซ็นเซอร์ กทม.
            </p>
          </div>
        )}

        {/* 4. Active Data */}
        {!isLoading && !error && (
          <>
            {/* 1. Fresh Active Flood Points */}
            {activeFreshFloods.length > 0 ? (
              activeFreshFloods.map(f => {
                const conf = getSeverityConfig(f.calculatedSeverity);
                const sourceInfo = getSourceStatusInfo(f.sourceStatus);

                return (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectStation(f)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectStation(f);
                      }
                    }}
                    aria-label={`จุดน้ำท่วม ${f.name} ระดับน้ำ ${f.waterLevelCm} เซนติเมตร เกณฑ์แอป ${conf.label} สถานะ กทม. ${sourceInfo.label}`}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition cursor-pointer group shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {/* Top Row: Station Name + Water Depth (Single line, never broken) */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {f.name}
                      </h4>
                      <span 
                        aria-label={`ระดับน้ำ ${f.waterLevelCm} เซนติเมตร`}
                        className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 flex-shrink-0 whitespace-nowrap bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800"
                      >
                        {f.waterLevelCm} ซม.
                      </span>
                    </div>

                    {/* Middle Row: Two Distinct, Explicit Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* App Calculation */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${conf.badgeClass}`}
                        aria-label={`เกณฑ์แอปพลิเคชัน: ${conf.label}`}
                        title="เกณฑ์คำนวณตามความลึกของน้ำท่วม (0-5 / 5.1-15 / 15.1-30 / >30 ซม.)"
                      >
                        <span className="opacity-75 font-normal">เกณฑ์แอป:</span>
                        <span>{conf.label}</span>
                      </span>

                      {/* Source Raw Status */}
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
                        aria-label={`สถานะที่ กทม. ส่งมา: ${sourceInfo.label}`}
                        title="สถานะดิบที่รับมาจากระบบเซ็นเซอร์ของ กทม."
                      >
                        <span className="opacity-75 text-slate-400">ต้นทาง กทม.:</span>
                        <span className="font-semibold">{sourceInfo.label}</span>
                      </span>

                      {f.code && (
                        <span className="text-[10px] font-mono text-slate-400 ml-auto">
                          #{f.code}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Location & Freshness */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-1 border-t border-slate-100/80 dark:border-slate-800/80">
                      <span className="truncate max-w-[200px]">
                        {f.road ? f.road : 'ไม่ระบุถนน'} {f.district ? `• เขต${f.district}` : ''}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatDataAge(f.dataAgeSeconds)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 text-center text-xs text-emerald-700 dark:text-emerald-300">
                ✓ ไม่มีจุดน้ำท่วมสดในขณะนี้ (ข้อมูลย้อนหลัง 3 ชั่วโมง)
              </div>
            )}

            {/* 2. Collapsible Stale / Offline Group */}
            {staleFloods.length > 0 && (
              <div className="mt-3 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setStaleOpen(!staleOpen)}
                  aria-expanded={staleOpen}
                  aria-label={`รายการไม่ส่งค่าหรือข้อมูลเก่า ${staleFloods.length} จุด คลิกเพื่อ${staleOpen ? 'ซ่อน' : 'แสดง'}`}
                  className="w-full min-h-[44px] flex items-center justify-between p-3 text-left hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectStation(f)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectStation(f);
                            }
                          }}
                          aria-label={`จุดค้างค่า ${f.name} ค่าค้างที่ ${f.waterLevelCm} เซนติเมตร สถานะ ${sourceInfo.label}`}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAlert && onSelectAlert(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectAlert && onSelectAlert(a);
                        }
                      }}
                      aria-label={`รายงานเหตุการณ์ ${a.title} ระดับ ${conf.label}`}
                      className="p-3 mb-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 bg-white hover:bg-rose-50/20 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition cursor-pointer text-xs shadow-2xs group focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conf.badgeClass}`}>
                            {conf.label}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                            {a.title}
                          </span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors flex-shrink-0" />
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {a.detail}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span>{a.road || a.district ? `${a.road || ''} ${a.district ? 'เขต' + a.district : ''}` : 'พื้นที่ กทม.'}</span>
                        <span>{formatTimeOnly(a.measuredAt)}</span>
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
