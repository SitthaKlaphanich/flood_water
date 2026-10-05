import React, { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import { FloodPoint, WaterLevelPoint, RainPoint, CCTVPoint } from '../types';
import { LayerVisibility } from './LayerControl';
import { getSeverityConfig } from '../utils/severity';

interface MapViewProps {
  floodPoints: FloodPoint[];
  waterLevels: WaterLevelPoint[];
  rainfall: RainPoint[];
  cctv: CCTVPoint[];
  layers: LayerVisibility;
  isDarkMode: boolean;
  selectedCoordinates?: { lat: number; lng: number; zoom?: number } | null;
  onSelectFloodPoint: (point: FloodPoint) => void;
  onSelectWaterLevel: (point: WaterLevelPoint) => void;
  onSelectCCTV: (point: CCTVPoint) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  floodPoints,
  waterLevels,
  rainfall,
  cctv,
  layers,
  isDarkMode,
  selectedCoordinates,
  onSelectFloodPoint,
  onSelectWaterLevel,
  onSelectCCTV
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Keep references to active markers to update cleanly
  const floodMarkersRef = useRef<Marker[]>([]);
  const waterMarkersRef = useRef<Marker[]>([]);
  const rainMarkersRef = useRef<Marker[]>([]);
  const cctvMarkersRef = useRef<Marker[]>([]);

  // Callback refs to prevent recreating hundreds of markers when parent renders
  const onSelectFloodPointRef = useRef(onSelectFloodPoint);
  onSelectFloodPointRef.current = onSelectFloodPoint;

  const onSelectWaterLevelRef = useRef(onSelectWaterLevel);
  onSelectWaterLevelRef.current = onSelectWaterLevel;

  const onSelectCCTVRef = useRef(onSelectCCTV);
  onSelectCCTVRef.current = onSelectCCTV;

  // 1. Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current) return;

    // CartoDB Positron / Dark Matter basemaps
    const styleUrl = isDarkMode
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [100.523186, 13.736717], // Bangkok center
      zoom: 11,
      minZoom: 9,
      maxZoom: 18
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
      }),
      'bottom-right'
    );

    map.on('load', () => {
      // Add District boundaries GeoJSON source & layer
      fetch('/api/gis/districts')
        .then(r => r.json())
        .then(geojson => {
          if (!geojson.features) return;
          if (map.getSource('districts-source')) return;

          map.addSource('districts-source', {
            type: 'geojson',
            data: geojson
          });

          map.addLayer({
            id: 'districts-fill',
            type: 'fill',
            source: 'districts-source',
            paint: {
              'fill-color': isDarkMode ? '#3b82f6' : '#2563eb',
              'fill-opacity': 0.04
            }
          });

          map.addLayer({
            id: 'districts-line',
            type: 'line',
            source: 'districts-source',
            paint: {
              'line-color': isDarkMode ? '#60a5fa' : '#3b82f6',
              'line-width': 1.2,
              'line-dasharray': [2, 2]
            }
          });
        })
        .catch(err => console.warn('Could not load districts vector layer:', err));

      // Add Canal lines GeoJSON source & layer
      fetch('/api/gis/canals')
        .then(r => r.json())
        .then(geojson => {
          if (!geojson.features || geojson.features.length === 0) return;
          if (map.getSource('canals-source')) return;

          map.addSource('canals-source', {
            type: 'geojson',
            data: geojson
          });

          map.addLayer({
            id: 'canals-line',
            type: 'line',
            source: 'canals-source',
            paint: {
              'line-color': '#06b6d4',
              'line-width': 2,
              'line-opacity': 0.7
            }
          });
        })
        .catch(err => console.warn('Could not load canals vector layer:', err));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isDarkMode]);

  // 2. Handle Vector Layer Visibility (Districts & Canals)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer('districts-fill')) {
      map.setLayoutProperty('districts-fill', 'visibility', layers.districts ? 'visible' : 'none');
    }
    if (map.getLayer('districts-line')) {
      map.setLayoutProperty('districts-line', 'visibility', layers.districts ? 'visible' : 'none');
    }
    if (map.getLayer('canals-line')) {
      map.setLayoutProperty('canals-line', 'visibility', layers.canals ? 'visible' : 'none');
    }
  }, [layers.districts, layers.canals]);

  // 3. Render Road Flood Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    floodMarkersRef.current.forEach(m => m.remove());
    floodMarkersRef.current = [];

    if (!layers.flood) return;

    floodPoints.forEach(f => {
      if (!f.latitude || !f.longitude) return;

      const conf = getSeverityConfig(f.calculatedSeverity);
      const isFlooded = f.waterLevelCm > 0;

      // Custom marker DOM
      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 select-none';
      el.style.cursor = 'pointer';
      el.setAttribute('title', `${f.name}: ${f.waterLevelCm} ซม.`);
      el.innerHTML = `
        <div style="background-color: ${conf.markerColor}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);" class="flex items-center justify-center rounded-full text-white font-bold text-[10px] ${
          isFlooded ? 'w-8 h-8 animate-bounce' : 'w-5 h-5 opacity-90'
        }">
          ${isFlooded ? `${f.waterLevelCm}c` : ''}
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectFloodPointRef.current(f);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([f.longitude, f.latitude])
        .addTo(map);

      floodMarkersRef.current.push(marker);
    });
  }, [floodPoints, layers.flood]);

  // 4. Render Water Level Stations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    waterMarkersRef.current.forEach(m => m.remove());
    waterMarkersRef.current = [];

    if (!layers.waterLevel) return;

    waterLevels.forEach(w => {
      if (!w.latitude || !w.longitude) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 select-none';
      el.style.cursor = 'pointer';
      el.setAttribute('title', `${w.name}: ${w.waterLevelM ?? '-'} ม.รทก.`);
      el.innerHTML = `
        <div style="background-color: #0891b2; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);" class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold">
          💧
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectWaterLevelRef.current(w);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([w.longitude, w.latitude])
        .addTo(map);

      waterMarkersRef.current.push(marker);
    });
  }, [waterLevels, layers.waterLevel]);

  // 5. Render Rain Stations
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    rainMarkersRef.current.forEach(m => m.remove());
    rainMarkersRef.current = [];

    if (!layers.rainfall) return;

    rainfall.forEach(r => {
      if (!r.latitude || !r.longitude) return;
      const isRaining = r.rf1hr > 0;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 select-none';
      el.style.cursor = 'pointer';
      el.setAttribute('title', `${r.name}: ฝน ${r.rf1hr} มม./ชม.`);
      el.innerHTML = `
        <div style="background-color: ${isRaining ? '#4f46e5' : '#94a3b8'}; border: 1.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);" class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
          🌧️
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([r.longitude, r.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setHTML(`
            <div class="p-2.5 text-xs text-slate-800 dark:text-slate-100">
              <strong class="block mb-1 font-bold text-sm">${r.name}</strong>
              <div class="space-y-0.5 text-slate-600 dark:text-slate-300">
                <div>ฝน 1 ชม.: <strong>${r.rf1hr} มม.</strong></div>
                <div>ฝน 24 ชม.: <strong>${r.rf24hr} มม.</strong></div>
                <div>สถานะ: ${r.status}</div>
              </div>
            </div>
          `)
        )
        .addTo(map);

      rainMarkersRef.current.push(marker);
    });
  }, [rainfall, layers.rainfall]);

  // 6. Render CCTV Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    cctvMarkersRef.current.forEach(m => m.remove());
    cctvMarkersRef.current = [];

    if (!layers.cctv) return;

    // Show sample of cameras if high density to keep UI smooth
    const camerasToRender = cctv.slice(0, 300);

    camerasToRender.forEach(c => {
      if (!c.latitude || !c.longitude) return;

      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-150 select-none';
      el.style.cursor = 'pointer';
      el.setAttribute('title', c.name);
      el.innerHTML = `
        <div style="background-color: #059669; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);" class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]">
          📷
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectCCTVRef.current(c);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.longitude, c.latitude])
        .addTo(map);

      cctvMarkersRef.current.push(marker);
    });
  }, [cctv, layers.cctv]);

  // 7. Pan / Zoom to Selected Location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCoordinates) return;

    map.flyTo({
      center: [selectedCoordinates.lng, selectedCoordinates.lat],
      zoom: selectedCoordinates.zoom || 15,
      essential: true,
      duration: 1500
    });
  }, [selectedCoordinates]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
