import React from 'react';
import { RefreshCw, Activity, Sun, Moon, Server, AlertCircle } from 'lucide-react';
import { SystemStatusData } from '../types';
import { formatTimeOnly } from '../utils/formatters';

interface NavbarProps {
  systemStatus: SystemStatusData | null;
  lastUpdated: string | null;
  countdown: number;
  isRefreshing: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRefresh: () => void;
  onOpenSystemStatus: () => void;
  error?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  lastUpdated,
  countdown,
  isRefreshing,
  isDarkMode,
  onToggleDarkMode,
  onRefresh,
  onOpenSystemStatus,
  error
}) => {
  const status = systemStatus?.status || (error ? 'DELAYED' : 'LIVE');

  // Check actual data age: if data is older than 15 minutes, mark as DELAYED
  const lastUpdatedMs = lastUpdated ? new Date(lastUpdated).getTime() : 0;
  const isDataStale = !isNaN(lastUpdatedMs) && lastUpdatedMs > 0 && (Date.now() - lastUpdatedMs > 15 * 60 * 1000);
  const effectiveStatus = (status === 'LIVE' && isDataStale) ? 'DELAYED' : status;

  const getStatusBadge = () => {
    if (isRefreshing) {
      return (
        <span 
          role="status" 
          aria-label="กำลังอัปเดตข้อมูลระบบ"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          กำลังอัปเดตข้อมูล...
        </span>
      );
    }
    switch (effectiveStatus) {
      case 'LIVE':
        return (
          <span 
            role="status" 
            aria-label="สถานะข้อมูล: LIVE สดตรงจากระบบ กทม."
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </span>
        );
      case 'DELAYED':
        return (
          <span 
            role="status" 
            aria-label={`สถานะข้อมูล: ล่าช้า ${isDataStale ? '(ข้อมูลเกิน 15 นาที)' : '(ข้อมูลในแคช)'}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            {isDataStale ? 'DELAYED (ข้อมูลเกิน 15 น.)' : 'DELAYED (ข้อมูลแคช)'}
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span 
            role="status" 
            aria-label="สถานะข้อมูล: ออฟไลน์ ไม่สามารถติดต่อเซิร์ฟเวอร์ กทม. ได้"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            OFFLINE
          </span>
        );
    }
  };

  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-xl text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  Bangkok Flood Monitor
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  ข้อมูลจาก กทม.
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                ระบบติดตามสถานการณ์น้ำท่วมกรุงเทพมหานครจากข้อมูลจริงของรัฐ
              </p>
            </div>
          </div>

          {/* Right Controls (Touch targets >= 44px) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Indicator */}
            {getStatusBadge()}

            {/* Timestamp & Countdown */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ข้อมูลล่าสุด {formatTimeOnly(lastUpdated || undefined)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                รีเฟรชในอีก {countdown} วิ
              </span>
            </div>

            {/* Manual Refresh Button (Touch target >= 44px) */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="ดึงข้อมูลใหม่ทันที"
              title="ดึงข้อมูลใหม่ทันที"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* System Status Modal Button (Touch target >= 44px) */}
            <button
              onClick={onOpenSystemStatus}
              aria-label="ตรวจสอบสถานะ Data Sources และ API"
              title="ตรวจสอบสถานะ Data Sources / API"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Server className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle (Touch target >= 44px) */}
            <button
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              title={isDarkMode ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* Warning banner if running on cached fallback */}
      {error && (
        <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5 text-center">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </header>
  );
};
