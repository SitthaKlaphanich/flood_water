import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { MapView } from './components/MapView';
import { LayerControl, LayerVisibility } from './components/LayerControl';
import { SearchBox } from './components/SearchBox';
import { NearMePanel } from './components/NearMePanel';
import { AlertFeed } from './components/AlertFeed';
import { StationModal } from './components/StationModal';
import { CanalStationModal } from './components/CanalStationModal';
import { CCTVModal } from './components/CCTVModal';
import { AlertModal } from './components/AlertModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { usePolling } from './hooks/usePolling';
import { useGeolocation } from './hooks/useGeolocation';
import { FloodPoint, WaterLevelPoint, CCTVPoint, AlertItem, NearbyAnalysis } from './types';
import { Map, AlertTriangle, Navigation, Camera, Layers, ShieldCheck } from 'lucide-react';

export function App() {
  // 1. Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 2. Data Polling Hook
  const {
    floodPoints,
    waterLevels,
    rainfall,
    cctv,
    alerts,
    weather,
    systemStatus,
    isRefreshing,
    error,
    lastUpdated,
    countdown,
    refetch
  } = usePolling(30000);

  // 3. User Geolocation Hook
  const {
    location: userCoords,
    loading: isLocating,
    error: locationError,
    requestLocation
  } = useGeolocation();

  // 4. Map & Layer States
  const [layers, setLayers] = useState<LayerVisibility>({
    flood: true,
    waterLevel: true,
    rainfall: true,
    cctv: true,
    canals: true,
    districts: true
  });

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [selectedFloodStation, setSelectedFloodStation] = useState<FloodPoint | null>(null);
  const [selectedCanalStation, setSelectedCanalStation] = useState<WaterLevelPoint | null>(null);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTVPoint | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [showSystemModal, setShowSystemModal] = useState<boolean>(false);
  const [nearbyData, setNearbyData] = useState<NearbyAnalysis | null>(null);

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState<'map' | 'alerts' | 'nearby'>('map');

  // Trigger nearby analysis when user location updates
  useEffect(() => {
    if (!userCoords) return;
    fetch(`/api/nearby?lat=${userCoords.latitude}&lng=${userCoords.longitude}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setNearbyData(data.data);
          setSelectedCoords({
            lat: userCoords.latitude,
            lng: userCoords.longitude,
            zoom: 14
          });
        }
      })
      .catch(err => console.error('Error fetching nearby data:', err));
  }, [userCoords]);

  // Handler when selecting location from Search
  const handleSelectLocation = useCallback((lat: number, lng: number, name: string) => {
    setSelectedCoords({ lat, lng, zoom: 14 });
    // Fetch nearby analysis for searched spot
    fetch(`/api/nearby?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setNearbyData(data.data);
      })
      .catch(err => console.error('Error fetching nearby data:', err));
  }, []);

  const handleSelectFloodPoint = useCallback((point: FloodPoint) => {
    setSelectedCanalStation(null);
    setSelectedFloodStation(point);
    setSelectedCoords({ lat: point.latitude, lng: point.longitude, zoom: 15 });
  }, []);

  const handleSelectWaterLevel = useCallback((point: WaterLevelPoint) => {
    setSelectedFloodStation(null);
    setSelectedCanalStation(point);
    setSelectedCoords({ lat: point.latitude, lng: point.longitude, zoom: 15 });
  }, []);

  const handleSelectCCTV = useCallback((point: CCTVPoint) => {
    setSelectedCCTV(point);
    setSelectedCoords({ lat: point.latitude, lng: point.longitude, zoom: 16 });
  }, []);

  const handleSelectAlert = useCallback((alert: AlertItem) => {
    setSelectedAlert(alert);
    const matching = floodPoints.find(f => 
      (alert.sensorCode && f.code === alert.sensorCode) ||
      (alert.road && f.road && f.road.includes(alert.road)) ||
      (alert.district && f.district && f.district.includes(alert.district))
    );
    if (matching) {
      setSelectedCoords({ lat: matching.latitude, lng: matching.longitude, zoom: 15 });
    }
  }, [floodPoints]);

  const handleSelectCategory = useCallback((category: 'flood' | 'waterLevel' | 'rainfall' | 'cctv') => {
    if (category === 'flood') {
      setLayers(prev => ({ ...prev, flood: true }));
      const active = floodPoints.find(f => f.waterLevelCm > 0);
      if (active) {
        handleSelectFloodPoint(active);
      } else if (floodPoints.length > 0) {
        handleSelectFloodPoint(floodPoints[0]);
      }
    } else if (category === 'waterLevel') {
      setLayers(prev => ({ ...prev, waterLevel: true }));
      const alertStation = waterLevels.find(w => w.calculatedSeverity !== 'NORMAL');
      if (alertStation) {
        handleSelectWaterLevel(alertStation);
      } else if (waterLevels.length > 0) {
        handleSelectWaterLevel(waterLevels[0]);
      }
    } else if (category === 'rainfall') {
      setLayers(prev => ({ ...prev, rainfall: true }));
      const raining = rainfall.find(r => r.rf1hr > 0);
      if (raining) {
        setSelectedCoords({ lat: raining.latitude, lng: raining.longitude, zoom: 14 });
      } else if (rainfall.length > 0) {
        setSelectedCoords({ lat: rainfall[0].latitude, lng: rainfall[0].longitude, zoom: 14 });
      }
    } else if (category === 'cctv') {
      setLayers(prev => ({ ...prev, cctv: true }));
      if (cctv.length > 0) {
        handleSelectCCTV(cctv[0]);
      }
    }
  }, [floodPoints, waterLevels, rainfall, cctv, handleSelectFloodPoint, handleSelectWaterLevel, handleSelectCCTV]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* Top Navbar */}
      <Navbar
        systemStatus={systemStatus}
        lastUpdated={lastUpdated}
        countdown={countdown}
        isRefreshing={isRefreshing}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onRefresh={refetch}
        onOpenSystemStatus={() => setShowSystemModal(true)}
        error={error}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4">
        
        {/* Metric Cards Banner */}
        <MetricCards
          floodPoints={floodPoints}
          waterLevels={waterLevels}
          rainfall={rainfall}
          cctv={cctv}
          weather={weather}
          onSelectCategory={handleSelectCategory}
        />

        {/* Search & Location Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchBox
            floodPoints={floodPoints}
            waterLevels={waterLevels}
            onSelectLocation={handleSelectLocation}
          />

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <NearMePanel
              onLocateUser={requestLocation}
              isLocating={isLocating}
              userCoords={userCoords}
              locationError={locationError}
              nearbyData={nearbyData}
              onSelectFloodPoint={handleSelectFloodPoint}
              onSelectWaterLevel={handleSelectWaterLevel}
              onSelectCCTV={handleSelectCCTV}
            />
          </div>
        </div>

        {/* Mobile Navigation Tabs (Section 20 of requirements) */}
        <div className="flex sm:hidden rounded-xl bg-slate-200 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'map' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>แผนที่</span>
          </button>
          <button
            onClick={() => setMobileTab('alerts')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'alerts' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>เตือนภัย ({alerts.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('nearby')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileTab === 'nearby' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>ใกล้ฉัน</span>
          </button>
        </div>

        {/* Dashboard Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          
          {/* Map Area */}
          <div className={`lg:col-span-8 flex flex-col relative h-[520px] lg:h-[620px] ${
            mobileTab !== 'map' ? 'hidden sm:flex' : 'flex'
          }`}>
            <MapView
              floodPoints={floodPoints}
              waterLevels={waterLevels}
              rainfall={rainfall}
              cctv={cctv}
              layers={layers}
              isDarkMode={isDarkMode}
              selectedCoordinates={selectedCoords}
              onSelectFloodPoint={handleSelectFloodPoint}
              onSelectWaterLevel={handleSelectWaterLevel}
              onSelectCCTV={handleSelectCCTV}
            />

            {/* Floating Layer Control on Top-Right of Map */}
            <div className="absolute top-3 right-3 z-10 max-w-[200px]">
              <LayerControl
                layers={layers}
                onChange={setLayers}
                counts={{
                  flood: floodPoints.length,
                  waterLevel: waterLevels.length,
                  rainfall: rainfall.length,
                  cctv: cctv.length
                }}
              />
            </div>
          </div>

          {/* Right Sidebar: Flood Alert Feed & Nearby Analysis */}
          <div className={`lg:col-span-4 flex flex-col gap-4 h-[520px] lg:h-[620px] ${
            mobileTab === 'map' ? 'hidden sm:flex' : 'flex'
          }`}>
            <AlertFeed
              alerts={alerts}
              floodPoints={floodPoints}
              onSelectStation={handleSelectFloodPoint}
              onSelectAlert={handleSelectAlert}
            />
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>เชื่อมต่อตรงกับสำนักการระบายน้ำ และสำนักการจราจรและขนส่ง กรุงเทพมหานคร (BMA)</span>
          </div>
          <div>
            Bangkok Flood Monitor • Real-time Public Service Dashboard
          </div>
        </div>
      </footer>

      {/* Modals */}
      <StationModal
        station={selectedFloodStation}
        onClose={() => setSelectedFloodStation(null)}
        cctvList={cctv}
        onSelectCCTV={(camera) => {
          setSelectedFloodStation(null);
          setSelectedCCTV(camera);
        }}
      />

      <CanalStationModal
        station={selectedCanalStation}
        onClose={() => setSelectedCanalStation(null)}
        cctvList={cctv}
        onSelectCCTV={(camera) => {
          setSelectedCanalStation(null);
          setSelectedCCTV(camera);
        }}
      />

      <CCTVModal
        cctv={selectedCCTV}
        onClose={() => setSelectedCCTV(null)}
      />

      {selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          matchingStation={floodPoints.find(f => 
            (selectedAlert.sensorCode && f.code === selectedAlert.sensorCode) ||
            (selectedAlert.district && f.district && f.district.includes(selectedAlert.district))
          )}
          onClose={() => setSelectedAlert(null)}
          onFocusStation={(station) => {
            setSelectedAlert(null);
            handleSelectFloodPoint(station);
          }}
        />
      )}

      {showSystemModal && (
        <SystemStatusModal
          status={systemStatus}
          onClose={() => setShowSystemModal(false)}
          onTriggerRefresh={refetch}
          isRefreshing={isRefreshing}
        />
      )}

    </div>
  );
}

export default App;
