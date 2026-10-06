import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="text-slate-800 dark:text-slate-100 select-none pointer-events-auto">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="ดูคำอธิบายสัญลักษณ์แผนที่"
          title="ดูคำอธิบายสัญลักษณ์แผนที่"
          className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md shadow-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Info className="w-4 h-4 text-blue-500" />
          <span>สัญลักษณ์</span>
        </button>
      ) : (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-xs w-72 max-h-[380px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500" />
              <span>คำอธิบายสัญลักษณ์</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="ปิดคำอธิบายสัญลักษณ์แผนที่"
              title="ปิด"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-[11px]">
            {/* Road flood points */}
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <span>🌊 จุดน้ำท่วมถนน (วงกลม)</span>
              </div>
              <div className="space-y-1.5 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">ปกติ (0 ซม.)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">น้ำท่วมขัง (1–15 ซม.)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-rose-600 border border-white dark:border-slate-800 flex-shrink-0 flex items-center justify-center text-[8px] text-white font-bold animate-pulse">!</span>
                  <span className="text-slate-600 dark:text-slate-400">น้ำท่วมสูง (&gt;15 ซม.)</span>
                </div>
              </div>
            </div>

            {/* Canal Water Level */}
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <span>💧 ระดับน้ำในคลอง (สี่เหลี่ยมมน)</span>
              </div>
              <div className="space-y-1.5 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-cyan-600 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">ปกติ / ต่ำกว่าตลิ่ง</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-500 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">เฝ้าระวัง / เตือนภัย</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-400 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">ไม่มีข้อมูล</span>
                </div>
              </div>
            </div>

            {/* Rain & CCTV */}
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>🌧️ / 📷 ฝน และ CCTV</span>
              </div>
              <div className="space-y-1.5 pl-1">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">จุดวัดฝน (ม่วง: มีฝนตก)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white dark:border-slate-800 flex-shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">กล้อง CCTV กทม.</span>
                </div>
              </div>
            </div>

            {/* Clusters & Vectors */}
            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>กลุ่มจุด (Cluster) และแนวเส้น</span>
              </div>
              <div className="space-y-1.5 pl-1 text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[9px]">24</span>
                  <span>กลุ่มจุดรวม (คลิกเพื่อซูมเข้าไป)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 bg-cyan-500 inline-block" />
                  <span>แนวคลอง กทม.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-0.5 border-t border-dashed border-slate-400 inline-block" />
                  <span>ขอบเขต 50 เขต</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
