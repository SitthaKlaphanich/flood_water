import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { MapView } from './components/MapView';
import { LayerControl, LayerVisibility } from './components/LayerControl';
import { MapLegend } from './components/MapLegend';
import { SearchBox } from './components/SearchBox';
import { NearMePanel } from './components/NearMePanel';
import { AlertFeed } from './components/AlertFeed';
import { WaterLevelList } from './components/WaterLevelList';
import { CCTVList } from './components/CCTVList';
import { StationModal } from './components/StationModal';
import { CanalStationModal } from './components/CanalStationModal';
import { CCTVModal } from './components/CCTVModal';
import { AlertModal } from './components/AlertModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { usePolling } from './hooks/usePolling';
import { useGeolocation } from './hooks/useGeolocation';
import { FloodPoint, WaterLevelPoint, CCTVPoint, AlertItem, NearbyAnalysis } from './types';
import { Map, AlertTriangle, Navigation, Camera, Droplets, ShieldCheck } from 'lucide-react';

export type DashboardTab = 'map' | 'alerts' | 'nearby' | 'waterLevel' | 'cctv';
export type DesktopSidebarTab = 'alerts' | 'nearby' | 'waterLevel' | 'cctv';

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
    loading,
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

  // 4. Map & Layer States (Step 2: rainfall and cctv off by default)
  const [layers, setLayers] = useState<LayerVisibility>({
    flood: true,
    waterLevel: true,
    rainfall: false, // Default OFF to prevent clutter
    cctv: false,     // Default OFF to prevent 700+ cameras clutter
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
  const [locationName, setLocationName] = useState<string | null>(null);
  const [showNearMe, setShowNearMe] = useState<boolean>(false);

  // Mobile navigation tab (Sequence: แผนที่ -> Flood Alerts -> รอบฉัน/ค้นหา -> ระดับน้ำ -> CCTV)
  const [mobileTab, setMobileTab] = useState<DashboardTab>('map');
  // Desktop sidebar active tab
  const [desktopTab, setDesktopTab] = useState<DesktopSidebarTab>('alerts');

  // Trigger nearby analysis when user location updates
  useEffect(() => {
    if (!userCoords) return;
    fetch(`/api/nearby?lat=${userCoords.latitude}&lng=${userCoords.longitude}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setNearbyData(data.data);
          setLocationName(null);
          setShowNearMe(true);
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
    setLocationName(name);
    setShowNearMe(true);
    setSelectedCoords({ lat, lng, zoom: 14 });
    setMobileTab('nearby');
    setDesktopTab('nearby');
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
      setMobileTab('alerts');
      setDesktopTab('alerts');
      const active = floodPoints.find(f => f.waterLevelCm > 0);
      if (active) {
        handleSelectFloodPoint(active);
      } else if (floodPoints.length > 0) {
        handleSelectFloodPoint(floodPoints[0]);
      }
    } else if (category === 'waterLevel') {
      setLayers(prev => ({ ...prev, waterLevel: true }));
      setMobileTab('waterLevel');
      setDesktopTab('waterLevel');
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
      setMobileTab('cctv');
      setDesktopTab('cctv');
      if (cctv.length > 0) {
        handleSelectCCTV(cctv[0]);
      }
    }
  }, [floodPoints, waterLevels, rainfall, cctv, handleSelectFloodPoint, handleSelectWaterLevel, handleSelectCCTV]);

  // Render Right Sidebar Content (Shared between desktop sidebar and mobile views)
  const renderSidebarContent = (activeTab: DashboardTab | DesktopSidebarTab) => {
    switch (activeTab) {
      case 'alerts':
        return (
          <AlertFeed
            alerts={alerts}
            floodPoints={floodPoints}
            onSelectStation={handleSelectFloodPoint}
            onSelectAlert={handleSelectAlert}
            isLoading={loading}
            error={error}
            onRetry={refetch}
          />
        );
      case 'nearby':
        return (
          <NearMePanel
            onLocateUser={() => {
              setLocationName(null);
              requestLocation();
            }}
            isLocating={isLocating}
            userCoords={userCoords}
            locationError={locationError}
            nearbyData={nearbyData}
            locationName={locationName}
            onSelectFloodPoint={handleSelectFloodPoint}
            onSelectWaterLevel={handleSelectWaterLevel}
            onSelectCCTV={handleSelectCCTV}
            onClose={() => setShowNearMe(false)}
          />
        );
      case 'waterLevel':
        return (
          <WaterLevelList
            waterLevels={waterLevels}
            onSelectStation={handleSelectWaterLevel}
            isLoading={loading}
            error={error}
            onRetry={refetch}
          />
        );
      case 'cctv':
        return (
          <CCTVList
            cctv={cctv}
            onSelectCCTV={handleSelectCCTV}
            isLoading={loading}
            error={error}
            onRetry={refetch}
          />
        );
      default:
        return null;
    }
  };

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
            <button
              onClick={() => {
                setLocationName(null);
                setShowNearMe(true);
                setMobileTab('nearby');
                setDesktopTab('nearby');
                requestLocation();
              }}
              disabled={isLocating}
              aria-label="ค้นหาและวิเคราะห์สถานการณ์รอบตำแหน่ง GPS ของฉัน"
              className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'กำลังค้นหาตำแหน่ง...' : '📍 ใช้ตำแหน่งของฉัน'}</span>
            </button>
            {nearbyData && !showNearMe && (
              <button
                onClick={() => {
                  setShowNearMe(true);
                  setMobileTab('nearby');
                  setDesktopTab('nearby');
                }}
                aria-label="เปิดดูข้อมูลวิเคราะห์รอบจุดที่เลือก"
                className="min-h-[44px] flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-300 dark:border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span>{locationName ? `รอบ ${locationName}` : 'รอบตัวคุณ'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs (Strict Spec Order: แผนที่ -> Flood Alerts -> รอบฉัน/ค้นหา -> ระดับน้ำ -> CCTV) */}
        <div 
          role="tablist" 
          aria-label="เมนูหลักสำหรับโทรศัพท์มือถือ"
          className="grid grid-cols-5 sm:hidden rounded-2xl bg-slate-200/90 dark:bg-slate-800/90 p-1 text-xs font-semibold gap-1 shadow-inner"
        >
          {/* 1. แผนที่ */}
          <button
            role="tab"
            aria-selected={mobileTab === 'map'}
            aria-label="ดูแผนที่น้ำท่วมกรุงเทพฯ"
            onClick={() => setMobileTab('map')}
            className={`min-h-[44px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              mobileTab === 'map' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Map className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">แผนที่</span>
          </button>
          
          {/* 2. Flood Alerts */}
          <button
            role="tab"
            aria-selected={mobileTab === 'alerts'}
            aria-label={`ดูการแจ้งเตือนน้ำท่วม มี ${alerts.length} รายการ`}
            onClick={() => setMobileTab('alerts')}
            className={`min-h-[44px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              mobileTab === 'alerts' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">เตือนภัย</span>
          </button>

          {/* 3. รอบฉัน / รอบที่ค้นหา */}
          <button
            role="tab"
            aria-selected={mobileTab === 'nearby'}
            aria-label="ดูสถานการณ์น้ำท่วมและฝนรอบตัวคุณหรือจุดที่ค้นหา"
            onClick={() => setMobileTab('nearby')}
            className={`min-h-[44px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              mobileTab === 'nearby' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Navigation className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">รอบฉัน</span>
          </button>

          {/* 4. ระดับน้ำ */}
          <button
            role="tab"
            aria-selected={mobileTab === 'waterLevel'}
            aria-label={`ดูระดับน้ำในคลอง กทม. มี ${waterLevels.length} สถานี`}
            onClick={() => setMobileTab('waterLevel')}
            className={`min-h-[44px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              mobileTab === 'waterLevel' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Droplets className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">ระดับน้ำ</span>
          </button>

          {/* 5. CCTV */}
          <button
            role="tab"
            aria-selected={mobileTab === 'cctv'}
            aria-label={`ดูกล้อง CCTV สาธารณะ มี ${cctv.length} กล้อง`}
            onClick={() => setMobileTab('cctv')}
            className={`min-h-[44px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              mobileTab === 'cctv' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">CCTV</span>
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

            {/* Desktop: Floating Near Me Overlay on Top-Left of Map */}
            {showNearMe && (userCoords || nearbyData) && (
              <div className="hidden sm:block absolute top-3 left-3 z-20 max-w-sm w-full max-h-[calc(100%-24px)] overflow-y-auto">
                <NearMePanel
                  onLocateUser={() => {
                    setLocationName(null);
                    requestLocation();
                  }}
                  isLocating={isLocating}
                  userCoords={userCoords}
                  locationError={locationError}
                  nearbyData={nearbyData}
                  locationName={locationName}
                  onSelectFloodPoint={handleSelectFloodPoint}
                  onSelectWaterLevel={handleSelectWaterLevel}
                  onSelectCCTV={handleSelectCCTV}
                  onClose={() => setShowNearMe(false)}
                />
              </div>
            )}

            {/* Floating Layer Control on Top-Right of Map (Collapsible FAB) */}
            <div className="absolute top-3 right-3 z-10">
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

            {/* Floating Map Legend on Bottom-Left of Map (Collapsible) */}
            <div className="absolute bottom-3 left-3 z-10">
              <MapLegend />
            </div>
          </div>

          {/* Right Sidebar: Multi-Tab Support on Desktop & Active View on Mobile */}
          <div className={`lg:col-span-4 flex flex-col gap-2 h-[520px] lg:h-[620px] ${
            mobileTab === 'map' ? 'hidden sm:flex' : 'flex'
          }`}>
            
            {/* Desktop Sidebar Tab Switcher */}
            <div 
              role="tablist" 
              aria-label="เลือกมุมมองแผงควบคุมด้านข้าง"
              className="hidden sm:flex rounded-xl bg-slate-200/80 dark:bg-slate-800/80 p-1 text-xs font-semibold gap-1"
            >
              <button
                role="tab"
                aria-selected={desktopTab === 'alerts'}
                aria-label="แผงการแจ้งเตือนน้ำท่วม"
                onClick={() => setDesktopTab('alerts')}
                className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                  desktopTab === 'alerts' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>เตือนภัย</span>
              </button>

              <button
                role="tab"
                aria-selected={desktopTab === 'nearby'}
                aria-label="แผงวิเคราะห์รอบตัวคุณ"
                onClick={() => setDesktopTab('nearby')}
                className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  desktopTab === 'nearby' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>รอบฉัน</span>
              </button>

              <button
                role="tab"
                aria-selected={desktopTab === 'waterLevel'}
                aria-label="แผงระดับน้ำในคลอง"
                onClick={() => setDesktopTab('waterLevel')}
                className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  desktopTab === 'waterLevel' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>ระดับน้ำ</span>
              </button>

              <button
                role="tab"
                aria-selected={desktopTab === 'cctv'}
                aria-label="แผงกล้อง CCTV"
                onClick={() => setDesktopTab('cctv')}
                className={`flex-1 min-h-[38px] px-2 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  desktopTab === 'cctv' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>CCTV</span>
              </button>
            </div>

            {/* Sidebar View Container */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {/* On mobile: display according to mobileTab */}
              <div className="sm:hidden h-full">
                {renderSidebarContent(mobileTab)}
              </div>
              {/* On desktop: display according to desktopTab */}
              <div className="hidden sm:block h-full">
                {renderSidebarContent(desktopTab)}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>ข้อมูลจากสำนักการระบายน้ำ กรุงเทพมหานคร (BMA DSD) • กล้อง CCTV แสดงผลและเปิดดูจากเว็บไซต์ทางการของ กทม.</span>
          </div>
          <div>
            Bangkok Flood Monitor • ระบบติดตามสถานการณ์น้ำท่วมกรุงเทพฯ
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Sheet Drawer for NearMe (when on map tab and showNearMe is active) */}
      {showNearMe && mobileTab === 'map' && (userCoords || nearbyData) && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 p-2 bg-slate-900/40 backdrop-blur-xs flex justify-center animate-in slide-in-from-bottom duration-200">
          <div className="w-full max-h-[75vh] overflow-y-auto shadow-2xl rounded-2xl">
            <NearMePanel
              onLocateUser={() => {
                setLocationName(null);
                requestLocation();
              }}
              isLocating={isLocating}
              userCoords={userCoords}
              locationError={locationError}
              nearbyData={nearbyData}
              locationName={locationName}
              onSelectFloodPoint={handleSelectFloodPoint}
              onSelectWaterLevel={handleSelectWaterLevel}
              onSelectCCTV={handleSelectCCTV}
              onClose={() => setShowNearMe(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedFloodStation && (
        <StationModal
          station={selectedFloodStation}
          onClose={() => setSelectedFloodStation(null)}
          cctvList={cctv}
          onSelectCCTV={(camera) => {
            setSelectedFloodStation(null);
            setSelectedCCTV(camera);
          }}
        />
      )}

      {selectedCanalStation && (
        <CanalStationModal
          station={selectedCanalStation}
          onClose={() => setSelectedCanalStation(null)}
          cctvList={cctv}
          onSelectCCTV={(camera) => {
            setSelectedCanalStation(null);
            setSelectedCCTV(camera);
          }}
        />
      )}

      {selectedCCTV && (
        <CCTVModal
          cctv={selectedCCTV}
          onClose={() => setSelectedCCTV(null)}
        />
      )}

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
