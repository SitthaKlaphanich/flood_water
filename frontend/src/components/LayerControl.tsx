import React, { useState } from 'react';
import { Layers, Waves, Droplets, CloudRain, Camera, Compass, X, RotateCcw } from 'lucide-react';

export interface LayerVisibility {
  flood: boolean;
  waterLevel: boolean;
  rainfall: boolean;
  cctv: boolean;
  canals: boolean;
  districts: boolean;
}

interface LayerControlProps {
  layers: LayerVisibility;
  onChange: (layers: LayerVisibility) => void;
  counts: {
    flood: number;
    waterLevel: number;
    rainfall: number;
    cctv: number;
  };
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onChange,
  counts
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (key: keyof LayerVisibility) => {
    onChange({
      ...layers,
      [key]: !layers[key]
    });
  };

  const resetToDefault = () => {
    onChange({
      flood: true,
      waterLevel: true,
      rainfall: false,
      cctv: false,
      canals: true,
      districts: true
    });
  };

  // Count active layers
  const activeCount = Object.values(layers).filter(Boolean).length;
  const totalCount = Object.keys(layers).length;

  return (
    <div className="text-slate-800 dark:text-slate-100 select-none pointer-events-auto">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          aria-label={`จัดการชั้นข้อมูลแผนที่ (เปิดอยู่ ${activeCount} จาก ${totalCount} ชั้น)`}
          title="จัดการชั้นข้อมูลแผนที่"
          className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md shadow-md border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Layers className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          <span>ชั้นข้อมูล</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {activeCount}/{totalCount}
          </span>
        </button>
      ) : (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 w-72 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>ชั้นข้อมูล (Map Layers)</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="ปิดแผงชั้นข้อมูล"
              title="ปิดแผงชั้นข้อมูล"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {/* Flood Points */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.flood}
                  onChange={() => toggle('flood')}
                  aria-label="เปิดปิดชั้นข้อมูลจุดน้ำท่วมถนน"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">จุดน้ำท่วมถนน</span>
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {counts.flood}
              </span>
            </label>

            {/* Water Level */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.waterLevel}
                  onChange={() => toggle('waterLevel')}
                  aria-label="เปิดปิดชั้นข้อมูลระดับน้ำในคลอง"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  <span className="font-medium">ระดับน้ำในคลอง</span>
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                {counts.waterLevel}
              </span>
            </label>

            {/* Rainfall */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.rainfall}
                  onChange={() => toggle('rainfall')}
                  aria-label="เปิดปิดชั้นข้อมูลสถานีวัดฝน"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium">จุดวัดฝน</span>
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {counts.rainfall}
              </span>
            </label>

            {/* CCTV */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.cctv}
                  onChange={() => toggle('cctv')}
                  aria-label="เปิดปิดชั้นข้อมูลกล้อง CCTV"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">กล้อง CCTV</span>
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {counts.cctv}
              </span>
            </label>

            <div className="border-t border-slate-200 dark:border-slate-800 my-1.5"></div>

            {/* Canals Vector */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.canals}
                  onChange={() => toggle('canals')}
                  aria-label="เปิดปิดเส้นแนวคลอง กทม."
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-cyan-500 rounded-full inline-block"></span>
                  <span className="font-medium">แนวคลอง กทม.</span>
                </span>
              </div>
            </label>

            {/* Districts Vector */}
            <label className="min-h-[40px] flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition select-none">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layers.districts}
                  onChange={() => toggle('districts')}
                  aria-label="เปิดปิดแนวเขต 50 เขต"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">เขตกรุงเทพฯ (50 เขต)</span>
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">เปิดอยู่ {activeCount}/{totalCount} ชั้น</span>
            <button
              onClick={resetToDefault}
              aria-label="คืนค่าชั้นข้อมูลแผนที่เริ่มต้น"
              className="min-h-[44px] px-2.5 py-1.5 flex items-center gap-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RotateCcw className="w-3 h-3" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
