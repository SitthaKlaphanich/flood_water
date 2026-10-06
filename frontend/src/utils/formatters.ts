export function formatDataAge(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return 'ไม่ระบุ';
  }
  if (seconds < 10) return 'เมื่อสักครู่';
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

export function formatTimeOnly(isoOrDate?: string | number | Date): string {
  if (!isoOrDate) return '-';
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(isoOrDate);
  }
}

export function formatDateTime(isoOrDate?: string | number | Date): string {
  if (!isoOrDate) return '-';
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return String(isoOrDate);
  }
}
