import React, { useState, useMemo } from 'react';
import { Camera, Search, AlertTriangle, RefreshCw, X, Video, ExternalLink, MapPin } from 'lucide-react';
import { CCTVPoint } from '../types';

interface CCTVListProps {
  cctv: CCTVPoint[];
  onSelectCCTV: (camera: CCTVPoint) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const CCTVList: React.FC<CCTVListProps> = ({
  cctv,
  onSelectCCTV,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'traffic' | 'flood'>('all');

  const filteredCameras = useMemo(() => {
    let result = [...cctv];

    if (filterSource === 'traffic') {
      result = result.filter(c => (c.source || '').includes('จราจร') || c.id.startsWith('cctv_bma'));
    } else if (filterSource === 'flood') {
      result = result.filter(c => (c.source || '').includes('น้ำท่วม') || c.id.startsWith('cctv_dds'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.road && c.road.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q))
      );
    }

    return result;
  }, [cctv, filterSource, searchQuery]);

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">กล้อง CCTV สาธารณะ (Public CCTV)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              กล้องจราจรและตรวจน้ำท่วมของหน่วยงาน กทม.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
          {cctv.length} กล้อง
        </span>
      </div>

      {/* Search & Filter */}
      <div className="my-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อแยก, ถนน, หรือเขต..."
            aria-label="ค้นหากล้อง CCTV ตามชื่อแยกหรือถนน"
            className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="ล้างการค้นหากล้อง CCTV"
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Source Filter Tabs (Touch target >= 44px) */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="ตัวกรองแหล่งที่มาของกล้อง">
          <button
            onClick={() => setFilterSource('all')}
            role="tab"
            aria-selected={filterSource === 'all'}
            aria-label={`แสดงกล้องทั้งหมด ${cctv.length} ตัว`}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              filterSource === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="opacity-75 text-[10px]">({cctv.length})</span>
          </button>
          <button
            onClick={() => setFilterSource('traffic')}
            role="tab"
            aria-selected={filterSource === 'traffic'}
            aria-label="แสดงเฉพาะกล้องจราจร กทม."
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              filterSource === 'traffic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>กล้องจราจร</span>
          </button>
          <button
            onClick={() => setFilterSource('flood')}
            role="tab"
            aria-selected={filterSource === 'flood'}
            aria-label="แสดงเฉพาะกล้องศูนย์ระบายน้ำ"
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              filterSource === 'flood'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span>กล้องตรวจน้ำท่วม</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* 1. Loading State */}
        {isLoading && (
          <div className="space-y-3 py-4" aria-live="polite" aria-busy="true">
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังโหลดข้อมูลกล้อง CCTV สาธารณะ...</span>
            </div>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 animate-pulse">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-14"></div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
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
              ไม่สามารถโหลดข้อมูลกล้อง CCTV ได้
            </h4>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mb-3">
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                aria-label="ลองโหลดข้อมูลกล้อง CCTV ใหม่อีกครั้ง"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Empty State */}
        {!isLoading && !error && filteredCameras.length === 0 && (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs my-4">
            <Video className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              ไม่พบกล้อง CCTV ตามเงื่อนไข
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {searchQuery ? `ไม่พบกล้องที่ตรงกับ "${searchQuery}"` : 'ไม่มีกล้องในหมวดหมู่นี้'}
            </p>
          </div>
        )}

        {/* 4. Camera List */}
        {!isLoading && !error && filteredCameras.length > 0 && (
          filteredCameras.map(c => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCCTV(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCCTV(c);
                }
              }}
              aria-label={`กล้อง CCTV ${c.name} ถนน ${c.road || 'ไม่ระบุ'} เขต ${c.district || 'ไม่ระบุ'}`}
              className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800 transition cursor-pointer group shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {c.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>{c.road ? `${c.road}` : 'ไม่ระบุถนน'} {c.district ? `• เขต${c.district}` : ''}</span>
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                  <Camera className="w-3 h-3" />
                  <span>ดูภาพ</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                <span className="truncate max-w-[200px]">
                  {c.source || 'สำนักการจราจรและขนส่ง กทม.'}
                </span>
                <span className="font-mono">#{c.id.replace('cctv_', '')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
