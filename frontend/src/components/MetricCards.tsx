import React from 'react';
import { Waves, Droplets, CloudRain, Camera, Thermometer, Wind } from 'lucide-react';
import { FloodPoint, WaterLevelPoint, RainPoint, CCTVPoint, WeatherData } from '../types';
import { STALE_THRESHOLD_SECONDS } from '../config/flood.config';

interface MetricCardsProps {
  floodPoints: FloodPoint[];
  waterLevels: WaterLevelPoint[];
  rainfall: RainPoint[];
  cctv: CCTVPoint[];
  weather: WeatherData | null;
  onFilterLayer?: (layerName: string) => void;
  onSelectCategory?: (category: 'flood' | 'waterLevel' | 'rainfall' | 'cctv') => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  floodPoints,
  waterLevels,
  rainfall,
  cctv,
  weather,
  onSelectCategory
}) => {
  const isFresh = (f: FloodPoint) => {
    const measuredTime = new Date(f.measuredAt || '').getTime();
    const ageSeconds = !isNaN(measuredTime) 
      ? Math.max(0, (Date.now() - measuredTime) / 1000) 
      : f.dataAgeSeconds;
    return ageSeconds <= STALE_THRESHOLD_SECONDS && f.sourceStatus !== 'malfunction' && f.isOnline !== false;
  };

  const activeFloods = floodPoints.filter(f => f.waterLevelCm > 0 && isFresh(f));
  const staleFloodsCount = floodPoints.filter(f => f.waterLevelCm > 0 && !isFresh(f)).length;
  const alertWaterLevels = waterLevels.filter(w => w.calculatedSeverity !== 'NORMAL');
  const maxRain1hr = rainfall.length > 0 ? Math.max(...rainfall.map(r => r.rf1hr)) : 0;
  const rainingStations = rainfall.filter(r => r.rf1hr > 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      
      {/* 1. Road Flood Points */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory && onSelectCategory('flood')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCategory && onSelectCategory('flood');
          }
        }}
        aria-label={`ข้อมูลน้ำท่วมถนน: พบน้ำท่วมสด ${activeFloods.length} จุด จากทั้งหมด ${floodPoints.length} จุด คลิกเพื่อดูรายละเอียด`}
        title="คลิกเพื่อดูจุดน้ำท่วมถนนบนแผนที่"
        className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          activeFloods.length > 0
            ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50'
            : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">น้ำท่วมถนน</span>
          <Waves className={`w-4 h-4 ${activeFloods.length > 0 ? 'text-rose-500' : 'text-blue-500'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {activeFloods.length}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            / {floodPoints.length} จุด
          </span>
        </div>
        <div className="mt-1 text-[11px]">
          {activeFloods.length > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              ⚠ สด {activeFloods.length} จุด {staleFloodsCount > 0 ? `(ข้อมูลเก่า ${staleFloodsCount})` : ''}
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ ปกติ {staleFloodsCount > 0 ? `(ไม่ส่งค่า ${staleFloodsCount} จุด)` : ''}
            </span>
          )}
        </div>
      </div>

      {/* 2. Canal Water Level Stations */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory && onSelectCategory('waterLevel')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCategory && onSelectCategory('waterLevel');
          }
        }}
        aria-label={`ข้อมูลระดับน้ำในคลอง: ทั้งหมด ${waterLevels.length} สถานี เฝ้าระวัง ${alertWaterLevels.length} จุด คลิกเพื่อดูรายละเอียด`}
        title="คลิกเพื่อดูระดับน้ำในคลองบนแผนที่"
        className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-all cursor-pointer hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">ระดับน้ำในคลอง</span>
          <Droplets className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {waterLevels.length}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            สถานี
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {alertWaterLevels.length > 0 ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              เฝ้าระวัง {alertWaterLevels.length} จุด
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-400">
              ครอบคลุม คลอง/ปตร. ทั่ว กทม.
            </span>
          )}
        </div>
      </div>

      {/* 3. Rainfall Stations */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory && onSelectCategory('rainfall')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCategory && onSelectCategory('rainfall');
          }
        }}
        aria-label={`ข้อมูลสถานีวัดฝน: ฝนสูงสุด ${maxRain1hr} มม./ชม. มีฝนตก ${rainingStations.length} จุด คลิกเพื่อดูรายละเอียด`}
        title="คลิกเพื่อดูสถานีวัดฝนบนแผนที่"
        className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-all cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">สถานีวัดฝน</span>
          <CloudRain className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {maxRain1hr}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            มม./ชม. (สูงสุด)
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {rainingStations.length > 0 ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              มีฝนตก {rainingStations.length} จุด
            </span>
          ) : (
            <span>ไม่มีฝนตก ณ ปัจจุบัน</span>
          )}
        </div>
      </div>

      {/* 4. Public CCTV Cameras */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => onSelectCategory && onSelectCategory('cctv')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectCategory && onSelectCategory('cctv');
          }
        }}
        aria-label={`ข้อมูลกล้อง CCTV สาธารณะ: ทั้งหมด ${cctv.length} กล้อง คลิกเพื่อดูรายละเอียด`}
        title="คลิกเพื่อดูกล้อง CCTV บนแผนที่"
        className="p-4 rounded-xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 transition-all cursor-pointer hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">กล้อง CCTV</span>
          <Camera className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {cctv.length}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            กล้อง
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          กล้องจราจรและตรวจน้ำท่วม
        </div>
      </div>

      {/* 5. Weather Overview */}
      <div className="col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-1 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200/50 dark:border-blue-900/30">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">อากาศกรุงเทพฯ</span>
          <Thermometer className="w-4 h-4 text-blue-500" />
        </div>
        {weather ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {weather.temperature}°C
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ชื้น {weather.humidity}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <Wind className="w-3 h-3 text-slate-400" />
              <span>ลม {weather.windSpeed} km/h</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">กำลังเชื่อมต่อ...</div>
        )}
      </div>

    </div>
  );
};
