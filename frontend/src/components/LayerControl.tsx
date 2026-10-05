import React from 'react';
import { Layers, Waves, Droplets, CloudRain, Camera, Compass } from 'lucide-react';

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
  const toggle = (key: keyof LayerVisibility) => {
    onChange({
      ...layers,
      [key]: !layers[key]
    });
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
      <div className="flex items-center gap-1.5 font-bold mb-2 text-slate-800 dark:text-slate-100">
        <Layers className="w-4 h-4 text-blue-500" />
        <span>ชั้นข้อมูล (Map Layers)</span>
      </div>

      <div className="space-y-1.5">
        {/* Flood Points */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.flood}
              onChange={() => toggle('flood')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-blue-500" />
              <span>จุดน้ำท่วมถนน</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {counts.flood}
          </span>
        </label>

        {/* Water Level */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.waterLevel}
              onChange={() => toggle('waterLevel')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-500" />
              <span>ระดับน้ำในคลอง</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
            {counts.waterLevel}
          </span>
        </label>

        {/* Rainfall */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.rainfall}
              onChange={() => toggle('rainfall')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-indigo-500" />
              <span>จุดวัดฝน</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {counts.rainfall}
          </span>
        </label>

        {/* CCTV */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.cctv}
              onChange={() => toggle('cctv')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-500" />
              <span>กล้อง CCTV</span>
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {counts.cctv}
          </span>
        </label>

        <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>

        {/* Canals Vector */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.canals}
              onChange={() => toggle('canals')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-cyan-500 rounded-full inline-block"></span>
              <span>แนวคลอง กทม.</span>
            </span>
          </div>
        </label>

        {/* Districts Vector */}
        <label className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={layers.districts}
              onChange={() => toggle('districts')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              <span>เขตกรุงเทพฯ (50 เขต)</span>
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
