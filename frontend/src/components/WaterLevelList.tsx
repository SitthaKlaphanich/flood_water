import React, { useState, useMemo } from 'react';
import { Droplets, Search, AlertTriangle, ArrowUpRight, TrendingUp, TrendingDown, Minus, RefreshCw, X, Waves } from 'lucide-react';
import { WaterLevelPoint } from '../types';
import { getSeverityConfig } from '../utils/severity';
import { formatDataAge } from '../utils/formatters';

interface WaterLevelListProps {
  waterLevels: WaterLevelPoint[];
  onSelectStation: (station: WaterLevelPoint) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const WaterLevelList: React.FC<WaterLevelListProps> = ({
  waterLevels,
  onSelectStation,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'alert' | 'normal'>('all');

  const alertCount = useMemo(() => {
    return waterLevels.filter(w => w.calculatedSeverity !== 'NORMAL').length;
  }, [waterLevels]);

  const filteredStations = useMemo(() => {
    let result = [...waterLevels];

    // Filter by mode
    if (filterMode === 'alert') {
      result = result.filter(w => w.calculatedSeverity !== 'NORMAL');
    } else if (filterMode === 'normal') {
      result = result.filter(w => w.calculatedSeverity === 'NORMAL');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(w => 
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.river && w.river.toLowerCase().includes(q)) ||
        (w.district && w.district.toLowerCase().includes(q)) ||
        (w.code && w.code.toLowerCase().includes(q))
      );
    }

    // Sort: alert stations first, then by code/name
    return result.sort((a, b) => {
      const isAlertA = a.calculatedSeverity !== 'NORMAL' ? 1 : 0;
      const isAlertB = b.calculatedSeverity !== 'NORMAL' ? 1 : 0;
      if (isAlertB !== isAlertA) return isAlertB - isAlertA;
      return (a.name || '').localeCompare(b.name || '', 'th');
    });
  }, [waterLevels, filterMode, searchQuery]);

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'RISING':
        return <TrendingUp className="w-3.5 h-3.5 text-rose-500" />;
      case 'FALLING':
        return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">ระดับน้ำในคลอง (Canal Water Levels)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              สถานีตรวจวัดคลองและประตูระบายน้ำ สำนักการระบายน้ำ กทม.
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
          alertCount > 0
            ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
            : 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800'
        }`}>
          {alertCount > 0 ? `เฝ้าระวัง ${alertCount} จุด` : `ปกติ ${waterLevels.length} จุด`}
        </span>
      </div>

      {/* Search & Filter Controls */}
      <div className="my-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อคลอง, เขต, หรือสถานี..."
            aria-label="ค้นหาสถานีวัดระดับน้ำในคลอง"
            className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips (Touch targets >= 44px) */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="ตัวกรองสถานะสถานีคลอง">
          <button
            onClick={() => setFilterMode('all')}
            role="tab"
            aria-selected={filterMode === 'all'}
            aria-label={`แสดงสถานีทั้งหมด ${waterLevels.length} สถานี`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              filterMode === 'all'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="opacity-75 text-[10px]">({waterLevels.length})</span>
          </button>
          <button
            onClick={() => setFilterMode('alert')}
            role="tab"
            aria-selected={filterMode === 'alert'}
            aria-label={`แสดงเฉพาะสถานีเฝ้าระวัง ${alertCount} สถานี`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              filterMode === 'alert'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>เฝ้าระวัง</span>
            <span className="opacity-75 text-[10px]">({alertCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('normal')}
            role="tab"
            aria-selected={filterMode === 'normal'}
            aria-label={`แสดงสถานีปกติ ${waterLevels.length - alertCount} สถานี`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              filterMode === 'normal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>ปกติ</span>
            <span className="opacity-75 text-[10px]">({waterLevels.length - alertCount})</span>
          </button>
        </div>
      </div>

      {/* Content Area: Distinct States */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* 1. Loading State */}
        {isLoading && (
          <div className="space-y-3 py-4" aria-live="polite" aria-busy="true">
            <div className="flex items-center justify-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดข้อมูลสถานีวัดน้ำในคลอง...</span>
            </div>
            {[1, 2, 3, 4].map(n => (
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
              เกิดข้อผิดพลาดในการโหลดข้อมูลระดับน้ำ
            </h4>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-3">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                aria-label="ลองโหลดข้อมูลระดับน้ำอีกครั้ง"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Empty State (No records matched) */}
        {!isLoading && !error && filteredStations.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs my-4">
            <Waves className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              ไม่พบสถานีตรวจวัดตามเงื่อนไข
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {searchQuery ? `ไม่พบผลลัพธ์ที่ตรงกับ "${searchQuery}"` : 'ไม่มีสถานีในหมวดหมู่นี้'}
            </p>
          </div>
        )}

        {/* 4. Normal Data List */}
        {!isLoading && !error && filteredStations.length > 0 && (
          filteredStations.map(w => {
            const sev = getSeverityConfig(w.calculatedSeverity);
            const hasValue = w.waterLevelM !== undefined && w.waterLevelM !== null && !isNaN(w.waterLevelM);

            return (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStation(w)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStation(w);
                  }
                }}
                aria-label={`สถานีคลอง ${w.name || 'ไม่ระบุชื่อ'} ระดับน้ำ ${hasValue ? w.waterLevelM + ' ม.รทก.' : 'ไม่มีข้อมูล'} สถานะ ${sev.label}`}
                className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 bg-white dark:bg-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition cursor-pointer group shadow-2xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {/* Station Name & Water Level */}
                <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">
                      {w.name || 'ไม่ระบุชื่อสถานี'}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {w.river ? `คลอง${w.river}` : 'ไม่ระบุคลอง'} {w.district ? `• เขต${w.district}` : ''}
                    </p>
                  </div>

                  {/* Water Level Display */}
                  <div className="text-right flex-shrink-0">
                    {hasValue ? (
                      <span className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800 whitespace-nowrap">
                        {w.waterLevelM} ม.รทก.
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        ไม่มีข้อมูล
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges & Meta */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${sev.badgeClass}`}
                    aria-label={`สถานะ: ${sev.label}`}
                  >
                    <span>{sev.label}</span>
                  </span>

                  {/* Pumps running indicator */}
                  {w.totalPumpOn > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      ⚡ เครื่องสูบเดิน {w.totalPumpOn} เครื่อง
                    </span>
                  )}

                  {/* Trend Indicator */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 ml-auto">
                    {getTrendIcon(w.trend)}
                    <span className="text-[10px]">
                      {w.trend === 'RISING' ? 'ระดับน้ำเพิ่มขึ้น' : w.trend === 'FALLING' ? 'ระดับน้ำลดลง' : 'ระดับน้ำทรงตัว'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
