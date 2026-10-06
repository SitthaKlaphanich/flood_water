import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldAlert, Clock, MapPin, Waves, Navigation } from 'lucide-react';
import { AlertItem, FloodPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';
import { formatDateTime } from '../utils/formatters';

interface AlertModalProps {
  alert: AlertItem | null;
  matchingStation?: FloodPoint | null;
  onClose: () => void;
  onFocusStation?: (station: FloodPoint) => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  alert,
  matchingStation,
  onClose,
  onFocusStation
}) => {
  useEffect(() => {
    if (!alert) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alert, onClose]);

  if (!alert) return null;

  const severity = getSeverityConfig(alert.calculatedSeverity);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  รายละเอียดการแจ้งเตือน
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${severity.badgeClass}`}>
                  {severity.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>บันทึกเมื่อ: {formatDateTime(alert.measuredAt)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="ปิดหน้ารายละเอียดการแจ้งเตือน (ESC)"
            title="ปิดหน้ารายละเอียดการแจ้งเตือน (ESC)"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Title Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
              {alert.title}
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              {alert.detail}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 block text-[11px] mb-1">พื้นที่ / ถนน</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>
                  {alert.road || alert.district ? `${alert.road || ''} ${alert.district ? 'เขต' + alert.district : ''}` : 'พื้นที่กรุงเทพมหานคร'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 block text-[11px] mb-1">รหัสเซนเซอร์ตรวจวัด</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {alert.sensorCode || '-'}
              </span>
            </div>

            {alert.waterLevelCm !== undefined && (
              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                <span className="text-slate-400 block text-[11px] mb-1">ระดับน้ำท่วมขัง</span>
                <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 text-sm">
                  <Waves className="w-4 h-4" />
                  <span>{alert.waterLevelCm} ซม.</span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 block text-[11px] mb-1">สถานะจากต้นทาง</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {alert.sourceStatus || 'แจ้งเตือนเหตุการณ์'}
              </span>
            </div>
          </div>

          {/* Related Station Link if found */}
          {matchingStation && onFocusStation && (
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider block">
                  ตรวจพบจุดสถานีตรวจวัดที่ตรงกัน
                </span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {matchingStation.name}
                </p>
              </div>
              <button
                onClick={() => {
                  onFocusStation(matchingStation);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition flex-shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>ดูบนแผนที่</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
            แหล่งข้อมูล: {alert.source}
          </span>
          <a
            href={alert.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <span>เปิดหน้าเว็บไซต์ กทม.</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
