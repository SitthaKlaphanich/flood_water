import React, { useState, useMemo } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { FloodPoint, WaterLevelPoint } from '../types';

interface SearchItem {
  id: string;
  name: string;
  category: 'district' | 'road' | 'station';
  lat: number;
  lng: number;
  subtitle?: string;
}

// Comprehensive Bangkok Key Locations & Districts
const BANGKOK_LOCATIONS: SearchItem[] = [
  { id: 'loc_lkb', name: 'ลาดกระบัง (Lat Krabang)', category: 'district', lat: 13.7226, lng: 100.7826, subtitle: 'เขตลาดกระบัง' },
  { id: 'loc_bn', name: 'บางนา (Bang Na)', category: 'district', lat: 13.6682, lng: 100.6042, subtitle: 'เขตบางนา' },
  { id: 'loc_pr2', name: 'พระราม 2 (Rama 2)', category: 'road', lat: 13.6631, lng: 100.4350, subtitle: 'ถนนพระราม 2' },
  { id: 'loc_skv', name: 'สุขุมวิท (Sukhumvit)', category: 'road', lat: 13.7383, lng: 100.5604, subtitle: 'ถนนสุขุมวิท' },
  { id: 'loc_dd', name: 'ดินแดง (Din Daeng)', category: 'district', lat: 13.7697, lng: 100.5532, subtitle: 'เขตดินแดง' },
  { id: 'loc_cw', name: 'แจ้งวัฒนะ (Chaeng Watthana)', category: 'road', lat: 13.8906, lng: 100.5518, subtitle: 'ถนนแจ้งวัฒนะ / หลักสี่' },
  { id: 'loc_jj', name: 'จตุจักร (Chatuchak)', category: 'district', lat: 13.8286, lng: 100.5598, subtitle: 'เขตจตุจักร' },
  { id: 'loc_ptw', name: 'พญาไท (Phaya Thai)', category: 'district', lat: 13.7801, lng: 100.5427, subtitle: 'เขตพญาไท' },
  { id: 'loc_sl', name: 'สีลม (Silom)', category: 'road', lat: 13.7285, lng: 100.5312, subtitle: 'ถนนสีลม / บางรัก' },
  { id: 'loc_st', name: 'สาทร (Sathon)', category: 'district', lat: 13.7082, lng: 100.5262, subtitle: 'เขตสาทร' },
  { id: 'loc_wt', name: 'วัฒนา (Watthana)', category: 'district', lat: 13.7372, lng: 100.5847, subtitle: 'เขตวัฒนา' },
  { id: 'loc_bk', name: 'บางกะปิ (Bang Kapi)', category: 'district', lat: 13.7658, lng: 100.6477, subtitle: 'เขตบางกะปิ' },
  { id: 'loc_dm', name: 'ดอนเมือง (Don Mueang)', category: 'district', lat: 13.9132, lng: 100.5897, subtitle: 'เขตดอนเมือง' },
  { id: 'loc_pnk', name: 'พระนคร (Phra Nakhon)', category: 'district', lat: 13.7649, lng: 100.4987, subtitle: 'เขตพระนคร' },
  { id: 'loc_pw', name: 'ประเวศ (Prawet)', category: 'district', lat: 13.7171, lng: 100.6953, subtitle: 'เขตประเวศ' },
  { id: 'loc_th', name: 'ทองหล่อ (Thong Lo)', category: 'road', lat: 13.7348, lng: 100.5828, subtitle: 'สุขุมวิท 55' },
  { id: 'loc_as', name: 'อโศกมนตรี (Asok Montri)', category: 'road', lat: 13.7441, lng: 100.5630, subtitle: 'แยกอโศก' },
  { id: 'loc_rt', name: 'รัชดาภิเษก (Ratchadaphisek)', category: 'road', lat: 13.7712, lng: 100.5734, subtitle: 'ถนนรัชดาภิเษก' },
  { id: 'loc_vb', name: 'วิภาวดีรังสิต (Vibhavadi Rangsit)', category: 'road', lat: 13.8055, lng: 100.5562, subtitle: 'ถนนวิภาวดีรังสิต' }
];

interface SearchBoxProps {
  floodPoints: FloodPoint[];
  waterLevels: WaterLevelPoint[];
  onSelectLocation: (lat: number, lng: number, name: string) => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  floodPoints,
  waterLevels,
  onSelectLocation
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Combine predefined locations with active stations
  const searchableItems = useMemo<SearchItem[]>(() => {
    const list: SearchItem[] = [...BANGKOK_LOCATIONS];

    // Add road flood stations
    floodPoints.forEach(f => {
      if (f.name && f.latitude && f.longitude) {
        list.push({
          id: f.id,
          name: f.name,
          category: 'station',
          lat: f.latitude,
          lng: f.longitude,
          subtitle: `${f.road || ''} ${f.district ? 'เขต' + f.district : ''} (วัดน้ำท่วม)`
        });
      }
    });

    // Add water level stations
    waterLevels.forEach(w => {
      if (w.name && w.latitude && w.longitude) {
        list.push({
          id: w.id,
          name: w.name,
          category: 'station',
          lat: w.latitude,
          lng: w.longitude,
          subtitle: `${w.river || ''} ${w.district ? 'เขต' + w.district : ''} (วัดน้ำคลอง)`
        });
      }
    });

    return list;
  }, [floodPoints, waterLevels]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchableItems
      .filter(item => item.name.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, searchableItems]);

  const handleSelect = (item: SearchItem) => {
    setQuery(item.name);
    setIsOpen(false);
    onSelectLocation(item.lat, item.lng, item.name);
  };

  const handleQuickChip = (item: SearchItem) => {
    setQuery(item.name);
    onSelectLocation(item.lat, item.lng, item.name);
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="ค้นหาสถานที่, ถนน, เขต เช่น ลาดกระบัง, บางนา, สุขุมวิท..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-start gap-3 transition"
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.name}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.subtitle}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick Location Pills */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-400 text-[11px] whitespace-nowrap">ยอดนิยม:</span>
        {BANGKOK_LOCATIONS.slice(0, 6).map(loc => (
          <button
            key={loc.id}
            onClick={() => handleQuickChip(loc)}
            className="px-2 py-0.5 rounded-full bg-slate-200/70 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-900/40 dark:text-slate-300 dark:hover:text-blue-300 transition whitespace-nowrap text-[11px]"
          >
            {loc.name.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
};
