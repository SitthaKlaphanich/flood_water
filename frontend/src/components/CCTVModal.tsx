import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ExternalLink, RefreshCw, Camera, AlertTriangle, Globe, Clock, ShieldAlert, AlertCircle } from 'lucide-react';
import { CCTVPoint } from '../types';
import { formatTimeOnly, formatDateTime } from '../utils/formatters';

interface CCTVModalProps {
  cctv: CCTVPoint | null;
  onClose: () => void;
}

export const CCTVModal: React.FC<CCTVModalProps> = ({ cctv, onClose }) => {
  const hasSnapshot = Boolean(cctv?.snapshotUrl && cctv.snapshotUrl.trim().length > 0);
  const [viewMode, setViewMode] = useState<'snapshot' | 'iframe'>(hasSnapshot ? 'snapshot' : 'iframe');
  
  // Real verification states
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const [isRealOnline, setIsRealOnline] = useState<boolean>(false);
  const [isBlankFeed, setIsBlankFeed] = useState<boolean>(false);
  const [failureReason, setFailureReason] = useState<string>('');
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<Date | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active object URL ref to revoke on unmount
  const activeBlobUrlRef = useRef<string | null>(null);

  // Revoke blob URL on change
  const setBlob = (url: string | null) => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
    }
    activeBlobUrlRef.current = url;
    setImageBlobUrl(url);
  };

  /**
   * Fetch and verify image directly through proxy.
   * Ensures ONLINE status only when real image bytes > 1600B and valid.
   * If blank image is detected, automatically turns off auto-refresh and marks as blank feed.
   */
  const loadAndVerifyImage = useCallback(async (camera: CCTVPoint) => {
    if (!camera.snapshotUrl) {
      setIsRealOnline(false);
      setIsBlankFeed(false);
      setFailureReason('กล้องนี้ไม่มี Snapshot URL จากต้นทาง (เป็นลิงก์วิดีโอภายนอก)');
      setIsVerifying(false);
      setIsRefreshing(false);
      return;
    }

    setIsVerifying(true);
    setIsRefreshing(true);
    const proxyUrl = `/api/cctv/proxy-image?url=${encodeURIComponent(camera.snapshotUrl)}&t=${Date.now()}`;

    try {
      const res = await fetch(proxyUrl);
      setLastLoadedAt(new Date());

      if (!res.ok) {
        setIsRealOnline(false);
        setIsBlankFeed(false);
        setFailureReason(`เซิร์ฟเวอร์ต้นทางไม่ตอบสนอง (HTTP ${res.status})`);
        setBlob(null);
        return;
      }

      const isBlankHeader = res.headers.get('X-Image-Blank') === 'true';
      const imageBytes = parseInt(res.headers.get('X-Image-Bytes') || '0', 10);
      const blob = await res.blob();

      // BMA Traffic sends a known ~1.4KB white blank image for feeds not broadcasting to external app
      if (isBlankHeader || blob.size <= 1600 || (imageBytes > 0 && imageBytes <= 1600)) {
        setIsRealOnline(false);
        setIsBlankFeed(true);
        // Rule 3: ซ่อนหรือปิดการรีเฟรชอัตโนมัติของกล้องตัวนั้น ไม่ต้องยิงซ้ำทุกรอบ
        setAutoRefresh(false);
        // Rule 4: เปลี่ยนข้อความที่ไม่เดา
        setFailureReason('ต้นทางไม่ส่งภาพให้แอปนี้ (ไม่ทราบสาเหตุ) — เซิร์ฟเวอร์ต้นทางส่งไฟล์ภาพว่างเปล่าขนาด 1.3 KB');
        setBlob(null);
        return;
      }

      // Check if browser can actually decode image dimensions
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 10 && img.naturalHeight > 10) {
          setIsRealOnline(true);
          setIsBlankFeed(false);
          setFailureReason('');
          setLastSuccessfulAt(new Date());
          setBlob(objectUrl);
        } else {
          setIsRealOnline(false);
          setIsBlankFeed(true);
          setAutoRefresh(false);
          setFailureReason('ต้นทางไม่ส่งภาพให้แอปนี้ (ไม่ทราบสาเหตุ) — ขนาดภาพไม่ถูกต้อง');
          setBlob(null);
        }
      };
      img.onerror = () => {
        setIsRealOnline(false);
        setIsBlankFeed(false);
        setFailureReason('รูปแบบไฟล์ภาพเสียหายหรือไม่ถูกต้อง');
        setBlob(null);
      };
      img.src = objectUrl;
    } catch (err: any) {
      setLastLoadedAt(new Date());
      setIsRealOnline(false);
      setIsBlankFeed(false);
      setFailureReason(err.message || 'ไม่สามารถเชื่อมต่อเพื่อดึงภาพได้');
      setBlob(null);
    } finally {
      setIsVerifying(false);
      setIsRefreshing(false);
    }
  }, []);

  // Trigger load when selected camera changes
  useEffect(() => {
    if (!cctv) return;
    const canSnapshot = Boolean(cctv.snapshotUrl && cctv.snapshotUrl.trim().length > 0);
    setViewMode(canSnapshot ? 'snapshot' : 'iframe');
    setIsRealOnline(false);
    setIsBlankFeed(false);
    setFailureReason('');
    setLastSuccessfulAt(null);
    setLastLoadedAt(null);
    setAutoRefresh(false); // default off
    setBlob(null);

    if (canSnapshot) {
      loadAndVerifyImage(cctv);
    } else {
      setIsVerifying(false);
    }

    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, [cctv?.id, loadAndVerifyImage]);

  // Periodic refresh (only runs if enabled and feed is not blank)
  useEffect(() => {
    if (!cctv || !autoRefresh || isBlankFeed || viewMode !== 'snapshot' || !hasSnapshot) return;
    const timer = setInterval(() => {
      loadAndVerifyImage(cctv);
    }, 15000); // 15 seconds to respect rate limits
    return () => clearInterval(timer);
  }, [cctv, autoRefresh, isBlankFeed, viewMode, hasSnapshot, loadAndVerifyImage]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!cctv) return null;

  const officialTargetUrl = cctv.streamUrl || cctv.sourceUrl || 'http://www.bmatraffic.com/index.aspx';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              isRealOnline ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {cctv.name}
                </h3>

                {/* Status Badges */}
                {isRealOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE (มีภาพสด)
                  </span>
                ) : isBlankFeed ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    ต้นทางไม่ส่งภาพให้แอปนี้
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <AlertTriangle className="w-3 h-3 text-slate-400" />
                    ภาพไม่แสดง
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {cctv.road ? `${cctv.road}` : 'ไม่ระบุชื่อถนน'} {cctv.district ? `• เขต${cctv.district}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="ปิดหน้าต่างกล้อง CCTV (ESC)"
            title="ปิดหน้าต่างกล้อง CCTV (ESC)"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRIMARY CALL-TO-ACTION BANNER (Rule 5: ตั้งปุ่มเปิดกล้องจากเว็บไซต์ต้นทางเป็นทางหลัก) */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-3 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <span className="font-bold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ช่องทางหลัก: เปิดชมภาพสดโดยตรงจากเว็บไซต์ทางการ
            </span>
            <span className="text-[11px] text-blue-700 dark:text-blue-300 block mt-0.5">
              (การแสดงผลในหน้าเว็บนี้เป็นทางเสริม อาจมีข้อจำกัดจากเซิร์ฟเวอร์ต้นทาง)
            </span>
          </div>

          <a
            href={officialTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="เปิดชมภาพสดจากเว็บไซต์ทางการ กทม. ในหน้าต่างใหม่"
            className="flex-shrink-0 min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span>เปิดกล้องเว็บต้นทาง กทม.</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mode Selector & Secondary Controls Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-medium mr-1">โหมดฝังเสริม:</span>
            {hasSnapshot && (
              <button
                onClick={() => setViewMode('snapshot')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  viewMode === 'snapshot'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                }`}
              >
                ภาพ Snapshot
              </button>
            )}
            <button
              onClick={() => setViewMode('iframe')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                viewMode === 'iframe'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
              }`}
            >
              เว็บเพลเยอร์ (iframe)
            </button>
          </div>

          {viewMode === 'snapshot' && hasSnapshot && (
            <div className="flex items-center gap-2">
              {/* Rule 3: ถ้าได้ภาพว่าง ปิด/ซ่อนการรีเฟรชอัตโนมัติ ไม่ต้องยิงซ้ำ */}
              {isBlankFeed ? (
                <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  ปิดรีเฟรชอัตโนมัติ (ต้นทางไม่ส่งภาพ)
                </span>
              ) : (
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    autoRefresh
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {autoRefresh ? '● สดอัตโนมัติ (15วิ)' : '○ พักอัปเดต'}
                </button>
              )}

              <button
                onClick={() => loadAndVerifyImage(cctv)}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                title="ทดสอบดึงภาพใหม่"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Viewing Screen */}
        <div className="relative bg-slate-950 aspect-video flex flex-col items-center justify-center overflow-hidden">
          {viewMode === 'snapshot' && hasSnapshot ? (
            isVerifying ? (
              <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-xs">
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mb-2" />
                <p>กำลังทดสอบการดึงภาพจากต้นทาง...</p>
              </div>
            ) : isRealOnline && imageBlobUrl ? (
              <img
                src={imageBlobUrl}
                alt={cctv.name}
                className="w-full h-full object-contain"
              />
            ) : (
              /* Fallback view when image is blank or fails */
              <div className="p-6 text-center max-w-md flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-white font-semibold text-sm mb-1">
                  ต้นทางไม่ส่งภาพให้แอปนี้
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">
                  {failureReason || 'ต้นทางไม่ส่งภาพให้แอปนี้ (ไม่ทราบสาเหตุ)'}
                </p>

                {/* Primary CTA button under failed image */}
                <a
                  href={officialTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                >
                  <Globe className="w-4 h-4" />
                  <span>เปิดกล้องจากเว็บไซต์ต้นทาง (แท็บใหม่)</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>

                <p className="text-[11px] text-slate-400 mt-2.5 leading-normal">
                  * ทางระบบได้หยุดการดึงภาพซ้ำอัตโนมัติ เพื่อไม่สร้างภาระให้เซิร์ฟเวอร์ต้นทาง
                </p>
              </div>
            )
          ) : (
            /* Player iframe mode (Rule 2) */
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-900">
              <iframe
                src={officialTargetUrl}
                title={cctv.name}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          )}
        </div>

        {/* Rule 2: Explicit notice and prominent button under Player view */}
        {viewMode === 'iframe' && (
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                ไม่สามารถตรวจสอบได้ว่าภาพขึ้นหรือไม่ ถ้าเห็นกล่องว่าง ให้เปิดเว็บต้นทาง
              </span>
            </div>

            <a
              href={officialTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition"
            >
              <span>เปิดกล้องจากเว็บไซต์ต้นทาง</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Timestamps & Technical Audit Info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              โหลดภาพล่าสุดเมื่อ:{' '}
              {lastLoadedAt ? formatTimeOnly(lastLoadedAt.toISOString()) : 'ยังไม่มีการโหลด'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>
              เวลาที่ถ่ายภาพ:{' '}
              <span className="text-slate-400 font-normal">ไม่ทราบเวลาถ่ายภาพ (ต้นทางไม่ระบุ)</span>
            </span>
          </div>

          <div className="sm:col-span-2 text-slate-500 dark:text-slate-400 text-[10px]">
            เวลาที่แสดงภาพได้ล่าสุด:{' '}
            {lastSuccessfulAt ? formatDateTime(lastSuccessfulAt.toISOString()) : 'ยังไม่มีประวัติภาพที่โหลดสำเร็จ'}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            แหล่งข้อมูล: <span className="font-medium text-slate-700 dark:text-slate-300">{cctv.source}</span>
          </div>

          <a
            href={officialTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition"
          >
            <span>เปิดหน้าเว็บไซต์ กทม.</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
