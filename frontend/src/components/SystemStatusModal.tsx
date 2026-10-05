import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, Clock, Database, RefreshCw, Cpu } from 'lucide-react';
import { SystemStatusData } from '../types';
import { formatDateTime, formatDataAge } from '../utils/formatters';

interface SystemStatusModalProps {
  status: SystemStatusData | null;
  onClose: () => void;
  onTriggerRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  status,
  onClose,
  onTriggerRefresh,
  isRefreshing
}) => {
  const [showRaw, setShowRaw] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!status) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                สถานะระบบและแหล่งข้อมูล (System & Data Sources)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                สถานะการเชื่อมต่อ API จริงของหน่วยงานรัฐและสุขภาพของระบบ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Overview KPIs */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px]">สถานะระบบรวม</span>
            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {status.status}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px]">เวลาทำงานระบบ (Uptime)</span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
              {Math.floor(status.uptimeSeconds / 60)} นาที
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px]">หน่วยความจำ (RAM)</span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              {status.memoryUsageMb.rss} MB
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px]">รอบการดึงข้อมูล (Polling)</span>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
              ทุก {status.refreshIntervalMs / 1000} วินาที
            </span>
          </div>
        </div>

        {/* Sources Table */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-500" />
              <span>รายการ Data Sources ที่เชื่อมต่อ</span>
            </h4>

            <button
              onClick={onTriggerRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูลเดี๋ยวนี้</span>
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {status.sources.map(src => {
              const isOnline = src.status === 'online';
              return (
                <div key={src.key} className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {src.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {src.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 truncate max-w-lg font-mono">
                      {src.url}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 sm:text-right flex-shrink-0">
                    <div>
                      <span className="block text-slate-400 text-[10px]">บันทึก (Records)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{src.recordCount}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">ความหน่วง (Latency)</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{src.responseTimeMs} ms</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">ดึงสำเร็จล่าสุด</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {src.lastSuccessfulFetch ? formatDataAge(Math.round((Date.now() - new Date(src.lastSuccessfulFetch).getTime()) / 1000)) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw JSON Debugging */}
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {showRaw ? 'ซ่อน Raw Status JSON' : '🔍 ดู Raw Status JSON สำหรับ Developer'}
            </button>
            {showRaw && (
              <pre className="mt-2 p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(status, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          Bangkok Flood Monitor • ระบบทำงานบนหน่วยประมวลผล Aggregator เพื่อปกป้องเซิร์ฟเวอร์หน่วยงานรัฐ
        </div>

      </div>
    </div>
  );
};
