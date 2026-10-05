import { SeverityLevel } from '../types';

export interface SeverityConfig {
  level: SeverityLevel;
  label: string;
  badgeClass: string;
  markerColor: string;
  borderColor: string;
  iconName: string;
}

export const SEVERITY_CONFIG: Record<SeverityLevel, SeverityConfig> = {
  NORMAL: {
    level: 'NORMAL',
    label: 'ปกติ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    markerColor: '#10b981',
    borderColor: '#059669',
    iconName: 'check-circle'
  },
  LOW: {
    level: 'LOW',
    label: 'น้ำขังเล็กน้อย',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    markerColor: '#eab308',
    borderColor: '#d97706',
    iconName: 'alert-circle'
  },
  MEDIUM: {
    level: 'MEDIUM',
    label: 'น้ำท่วมขัง',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    markerColor: '#f97316',
    borderColor: '#ea580c',
    iconName: 'alert-triangle'
  },
  HIGH: {
    level: 'HIGH',
    label: 'น้ำท่วมสูง',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    markerColor: '#ef4444',
    borderColor: '#dc2626',
    iconName: 'alert-octagon'
  },
  CRITICAL: {
    level: 'CRITICAL',
    label: 'น้ำท่วมสูงมาก (วิกฤต)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 animate-pulse',
    markerColor: '#a855f7',
    borderColor: '#7e22ce',
    iconName: 'flame'
  }
};

export function getSeverityConfig(level?: SeverityLevel): SeverityConfig {
  return SEVERITY_CONFIG[level || 'NORMAL'] || SEVERITY_CONFIG.NORMAL;
}
