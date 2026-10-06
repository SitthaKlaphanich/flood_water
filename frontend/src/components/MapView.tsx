import React, { useEffect, useRef, useMemo } from 'react';
import maplibregl, { Map as MapLibreMap, Marker, Popup } from 'maplibre-gl';
import Supercluster from 'supercluster';
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

  // Active markers currently mounted on the map
  const activeMarkersRef = useRef<Marker[]>([]);

  // Callback refs to always access latest callbacks without triggering re-render
  const onSelectFloodPointRef = useRef(onSelectFloodPoint);
  onSelectFloodPointRef.current = onSelectFloodPoint;

  const onSelectWaterLevelRef = useRef(onSelectWaterLevel);
  onSelectWaterLevelRef.current = onSelectWaterLevel;

  const onSelectCCTVRef = useRef(onSelectCCTV);
  onSelectCCTVRef.current = onSelectCCTV;

  // 1. Initialize MapLibre Map instance
  useEffect(() => {
    if (!mapContainer.current) return;

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
      // Add District boundaries GeoJSON source & subtle layers
      fetch('/api/gis/districts')
        .then(r => r.json())
        .then(geojson => {
          if (!geojson.features || map.getSource('districts-source')) return;

          map.addSource('districts-source', {
            type: 'geojson',
            data: geojson
          });

          // Very subtle fill
          map.addLayer({
            id: 'districts-fill',
            type: 'fill',
            source: 'districts-source',
            paint: {
              'fill-color': isDarkMode ? '#3b82f6' : '#2563eb',
              'fill-opacity': 0.02
            }
          });

          // Very subtle dashed boundary line (thin and light)
          map.addLayer({
            id: 'districts-line',
            type: 'line',
            source: 'districts-source',
            paint: {
              'line-color': isDarkMode ? '#64748b' : '#94a3b8',
              'line-width': 0.8,
              'line-opacity': 0.4,
              'line-dasharray': [2, 2]
            }
          });
        })
        .catch(err => console.warn('Could not load districts vector layer:', err));

      // Add Canal lines GeoJSON source & subtle layer
      fetch('/api/gis/canals')
        .then(r => r.json())
        .then(geojson => {
          if (!geojson.features || geojson.features.length === 0 || map.getSource('canals-source')) return;

          map.addSource('canals-source', {
            type: 'geojson',
            data: geojson
          });

          // Subtle canal line
          map.addLayer({
            id: 'canals-line',
            type: 'line',
            source: 'canals-source',
            paint: {
              'line-color': isDarkMode ? '#0891b2' : '#06b6d4',
              'line-width': 1.2,
              'line-opacity': 0.45
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

  // 2. Vector Layer Visibility (Districts & Canals)
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

  // 3. Supercluster Indices for each dataset
  const floodIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 45,
      maxZoom: 14, // Zoom >= 15 will split into individual markers
      map: (props) => ({ isFlooded: props.waterLevelCm > 0 ? 1 : 0, maxCm: props.waterLevelCm || 0 }),
      reduce: (acc, props) => {
        acc.isFlooded += props.isFlooded;
        acc.maxCm = Math.max(acc.maxCm, props.maxCm);
      }
    });

    const features = floodPoints
      .filter(f => f.latitude && f.longitude)
      .map(f => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [f.longitude, f.latitude] as [number, number]
        },
        properties: f
      }));

    index.load(features);
    return index;
  }, [floodPoints]);

  const waterIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 45,
      maxZoom: 14
    });

    const features = waterLevels
      .filter(w => w.latitude && w.longitude)
      .map(w => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [w.longitude, w.latitude] as [number, number]
        },
        properties: w
      }));

    index.load(features);
    return index;
  }, [waterLevels]);

  const rainIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 45,
      maxZoom: 14,
      map: (props) => ({ hasRain: props.rf1hr > 0 ? 1 : 0 }),
      reduce: (acc, props) => {
        acc.hasRain += props.hasRain;
      }
    });

    const features = rainfall
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [r.longitude, r.latitude] as [number, number]
        },
        properties: r
      }));

    index.load(features);
    return index;
  }, [rainfall]);

  const cctvIndex = useMemo(() => {
    const index = new Supercluster({
      radius: 50,
      maxZoom: 14
    });

    const features = cctv
      .filter(c => c.latitude && c.longitude)
      .map(c => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [c.longitude, c.latitude] as [number, number]
        },
        properties: c
      }));

    index.load(features);
    return index;
  }, [cctv]);

  // 4. Render Markers & Clusters dynamically based on current viewport
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderMarkers = () => {
      // Clear existing markers
      activeMarkersRef.current.forEach(m => m.remove());
      activeMarkersRef.current = [];

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ];
      const zoom = Math.floor(map.getZoom());
      const newMarkers: Marker[] = [];

      // A. Road Flood Points & Clusters
      if (layers.flood) {
        const clusters = floodIndex.getClusters(bbox, zoom);
        for (const f of clusters) {
          const [lng, lat] = f.geometry.coordinates;
          const isCluster = f.properties.cluster;

          if (isCluster) {
            const count = f.properties.point_count;
            const clusterId = f.properties.cluster_id;
            const hasFloodInCluster = (f.properties.isFlooded || 0) > 0;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-110 active:scale-95 transition select-none';
            el.setAttribute('title', `กลุ่มจุดน้ำท่วมถนน: ${count} จุด (คลิกเพื่อขยาย)`);
            el.innerHTML = `
              <div style="background-color: ${hasFloodInCluster ? '#e11d48' : '#2563eb'}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);" 
                   class="h-8 px-2 min-w-[32px] rounded-full flex items-center justify-center text-white text-[11px] font-bold gap-1 ${
                     hasFloodInCluster ? 'ring-2 ring-rose-400 ring-offset-1 animate-pulse' : ''
                   }">
                <span>🌊</span>
                <span>${count}</span>
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const expZoom = floodIndex.getClusterExpansionZoom(clusterId);
              map.easeTo({
                center: [lng, lat],
                zoom: Math.min(expZoom, 16),
                duration: 500
              });
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          } else {
            // Single unclustered flood point
            const point = f.properties as FloodPoint;
            const conf = getSeverityConfig(point.calculatedSeverity);
            const isFlooded = point.waterLevelCm > 0;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-125 transition duration-150 select-none';
            el.setAttribute('title', `${point.name}: ${point.waterLevelCm} ซม.`);
            el.innerHTML = `
              <div style="background-color: ${conf.markerColor}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);" 
                   class="flex items-center justify-center rounded-full text-white font-bold text-[10px] ${
                     isFlooded ? 'w-8 h-8 animate-bounce' : 'w-5 h-5 opacity-90'
                   }">
                ${isFlooded ? `${point.waterLevelCm}c` : ''}
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              onSelectFloodPointRef.current(point);
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          }
        }
      }

      // B. Canal Water Level Points & Clusters
      if (layers.waterLevel) {
        const clusters = waterIndex.getClusters(bbox, zoom);
        for (const w of clusters) {
          const [lng, lat] = w.geometry.coordinates;
          const isCluster = w.properties.cluster;

          if (isCluster) {
            const count = w.properties.point_count;
            const clusterId = w.properties.cluster_id;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-110 active:scale-95 transition select-none';
            el.setAttribute('title', `กลุ่มจุดวัดคลอง: ${count} จุด (คลิกเพื่อขยาย)`);
            el.innerHTML = `
              <div style="background-color: #0891b2; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);" 
                   class="h-7 px-2 min-w-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-bold gap-1">
                <span>💧</span>
                <span>${count}</span>
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const expZoom = waterIndex.getClusterExpansionZoom(clusterId);
              map.easeTo({
                center: [lng, lat],
                zoom: Math.min(expZoom, 16),
                duration: 500
              });
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          } else {
            // Single unclustered canal station
            const point = w.properties as WaterLevelPoint;
            const hasValue = point.waterLevelM !== undefined && point.waterLevelM !== null && !isNaN(point.waterLevelM);

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-125 transition duration-150 select-none';
            el.setAttribute('title', `${point.name}: ${hasValue ? `${point.waterLevelM} ม.รทก.` : 'ไม่มีข้อมูล'}`);
            el.innerHTML = `
              <div style="background-color: ${hasValue ? '#0891b2' : '#64748b'}; border: 2px solid ${hasValue ? '#ffffff' : '#cbd5e1'}; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);" 
                   class="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold">
                💧
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              onSelectWaterLevelRef.current(point);
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          }
        }
      }

      // C. Rainfall Stations & Clusters
      if (layers.rainfall) {
        const clusters = rainIndex.getClusters(bbox, zoom);
        for (const r of clusters) {
          const [lng, lat] = r.geometry.coordinates;
          const isCluster = r.properties.cluster;

          if (isCluster) {
            const count = r.properties.point_count;
            const clusterId = r.properties.cluster_id;
            const hasRain = (r.properties.hasRain || 0) > 0;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-110 active:scale-95 transition select-none';
            el.setAttribute('title', `กลุ่มจุดวัดฝน: ${count} จุด (คลิกเพื่อขยาย)`);
            el.innerHTML = `
              <div style="background-color: ${hasRain ? '#4f46e5' : '#64748b'}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);" 
                   class="h-7 px-2 min-w-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-bold gap-1">
                <span>🌧️</span>
                <span>${count}</span>
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const expZoom = rainIndex.getClusterExpansionZoom(clusterId);
              map.easeTo({
                center: [lng, lat],
                zoom: Math.min(expZoom, 16),
                duration: 500
              });
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          } else {
            // Single unclustered rain station
            const point = r.properties as RainPoint;
            const isRaining = point.rf1hr > 0;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-125 transition duration-150 select-none';
            el.setAttribute('title', `${point.name}: ฝน ${point.rf1hr} มม./ชม.`);
            el.innerHTML = `
              <div style="background-color: ${isRaining ? '#4f46e5' : '#94a3b8'}; border: 1.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);" 
                   class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                🌧️
              </div>
            `;

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .setPopup(
                new maplibregl.Popup({ offset: 12 }).setHTML(`
                  <div class="p-2.5 text-xs text-slate-800 dark:text-slate-100">
                    <strong class="block mb-1 font-bold text-sm">${point.name}</strong>
                    <div class="space-y-0.5 text-slate-600 dark:text-slate-300">
                      <div>ฝน 1 ชม.: <strong>${point.rf1hr} มม.</strong></div>
                      <div>ฝน 24 ชม.: <strong>${point.rf24hr} มม.</strong></div>
                      <div>สถานะ: ${point.status}</div>
                    </div>
                  </div>
                `)
              )
              .addTo(map);
            newMarkers.push(marker);
          }
        }
      }

      // D. CCTV Cameras & Clusters
      if (layers.cctv) {
        const clusters = cctvIndex.getClusters(bbox, zoom);
        for (const c of clusters) {
          const [lng, lat] = c.geometry.coordinates;
          const isCluster = c.properties.cluster;

          if (isCluster) {
            const count = c.properties.point_count;
            const clusterId = c.properties.cluster_id;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-110 active:scale-95 transition select-none';
            el.setAttribute('title', `กลุ่มกล้อง CCTV: ${count} ตัว (คลิกเพื่อขยาย)`);
            el.innerHTML = `
              <div style="background-color: #059669; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);" 
                   class="h-7 px-2 min-w-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-bold gap-1">
                <span>📷</span>
                <span>${count}</span>
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const expZoom = cctvIndex.getClusterExpansionZoom(clusterId);
              map.easeTo({
                center: [lng, lat],
                zoom: Math.min(expZoom, 16),
                duration: 500
              });
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          } else {
            // Single unclustered camera
            const point = c.properties as CCTVPoint;

            const el = document.createElement('div');
            el.className = 'cursor-pointer transform hover:scale-125 transition duration-150 select-none';
            el.setAttribute('title', point.name);
            el.innerHTML = `
              <div style="background-color: #059669; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);" 
                   class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]">
                📷
              </div>
            `;

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              onSelectCCTVRef.current(point);
            });

            const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
            newMarkers.push(marker);
          }
        }
      }

      activeMarkersRef.current = newMarkers;
    };

    // Render immediately when dependencies change
    renderMarkers();

    // Re-render when map viewport moves or zooms
    map.on('moveend', renderMarkers);

    return () => {
      map.off('moveend', renderMarkers);
      activeMarkersRef.current.forEach(m => m.remove());
      activeMarkersRef.current = [];
    };
  }, [floodIndex, waterIndex, rainIndex, cctvIndex, layers]);

  // 5. Pan / Zoom to Selected Location
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
