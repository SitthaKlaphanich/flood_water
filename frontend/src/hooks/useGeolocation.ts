import { useState, useCallback } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง (Geolocation)');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy)
        });
        setLoading(false);
      },
      (err) => {
        let msg = 'ไม่สามารถเข้าถึงตำแหน่งของคุณได้';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'คุณปฏิเสธการเข้าถึงตำแหน่งที่ตั้ง';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'ไม่พบสัญญาณพิกัดตำแหน่งปัจจุบัน';
        } else if (err.code === err.TIMEOUT) {
          msg = 'หมดเวลาค้นหาพิกัดตำแหน่ง';
        }
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, []);

  return { location, loading, error, requestLocation, clearLocation: () => setLocation(null) };
}
