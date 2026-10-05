import { SeverityLevel } from '../types';

/**
 * Flood Monitoring Configuration
 * Centralized settings for stale thresholds, water depth levels, and source statuses.
 */

// Stale threshold in seconds (default: 3 hours = 10,800s)
export const STALE_THRESHOLD_SECONDS = 3 * 3600;

// Water level depth thresholds for app calculation (in cm)
export const FLOOD_THRESHOLDS_CM = {
  NORMAL_MAX: 0,
  LOW_MAX: 5,        // 0.1 - 5.0 cm: น้ำขังเล็กน้อย
  MEDIUM_MAX: 15,    // 5.1 - 15.0 cm: น้ำท่วมขัง
  HIGH_MAX: 30,      // 15.1 - 30.0 cm: น้ำท่วมสูง
  CRITICAL_MIN: 30.1 // > 30.0 cm: น้ำท่วมสูงมาก (วิกฤต)
} as const;

/**
 * Calculate severity based on app-defined thresholds.
 */
export function calculateFloodSeverity(waterLevelCm: number): SeverityLevel {
  if (waterLevelCm <= FLOOD_THRESHOLDS_CM.NORMAL_MAX) return 'NORMAL';
  if (waterLevelCm <= FLOOD_THRESHOLDS_CM.LOW_MAX) return 'LOW';
  if (waterLevelCm <= FLOOD_THRESHOLDS_CM.MEDIUM_MAX) return 'MEDIUM';
  if (waterLevelCm <= FLOOD_THRESHOLDS_CM.HIGH_MAX) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Human-readable description of the app calculation formula.
 */
export const APP_CALCULATION_EXPLANATION = 
  'เกณฑ์ของแอป: 0ซม. ปกติ | 0.1-5ซม. น้ำขังเล็กน้อย | 5.1-15ซม. น้ำท่วมขัง | 15.1-30ซม. น้ำท่วมสูง | >30ซม. วิกฤต';

/**
 * Mapping for raw source status values from BMA ArcGIS
 */
export const BMA_DEVICE_STATUS_LABELS: Record<string, { label: string; isError: boolean }> = {
  normal: { label: 'ปกติ (normal)', isError: false },
  minor_flood: { label: 'มีน้ำท่วมขังเล็กน้อย (minor_flood)', isError: false },
  flooding: { label: 'มีน้ำท่วมขัง (flooding)', isError: false },
  malfunction: { label: 'เซ็นเซอร์ขัดข้อง (malfunction)', isError: true },
  temporary_malfunction: { label: 'ขัดข้องชั่วคราว (temporary_malfunction)', isError: true },
  offline: { label: 'ออฟไลน์ (offline)', isError: true },
  unknown: { label: 'ไม่ทราบสถานะ', isError: false }
};

export function getSourceStatusInfo(status?: string): { label: string; isError: boolean } {
  if (!status) return { label: 'ไม่มีข้อมูล', isError: false };
  const key = status.toLowerCase().trim();
  return BMA_DEVICE_STATUS_LABELS[key] || { label: status, isError: false };
}
