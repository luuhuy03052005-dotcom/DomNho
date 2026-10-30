'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_USER_COORDS } from '@/lib/seed-data';

export interface GeolocationState {
  lat: number;
  lng: number;
  accuracyMeters: number;
  isRealGps: boolean;
  label: string;
}

export function useGeolocation(patrolModeActive: boolean) {
  const [coords, setCoords] = useState<GeolocationState>({
    lat: DEFAULT_USER_COORDS.lat,
    lng: DEFAULT_USER_COORDS.lng,
    accuracyMeters: 25,
    isRealGps: false,
    label: DEFAULT_USER_COORDS.label,
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const reverseGeocodeCoordinates = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const res = await fetch(
          `/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(
            lng
          )}`
        );
        const data = await res.json();
        if (data.ok && data.address) {
          return data.address;
        }
      } catch {
        // ignore network error
      }
      return `Vị trí GPS của bạn (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    },
    []
  );

  const requestCurrentGps = useCallback(
    (
      onResolved?: (nextCoords: GeolocationState) => void,
      onFailed?: (reason: string) => void
    ) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        const msg = 'Trình duyệt của bạn không hỗ trợ định vị GPS.';
        setGpsError(msg);
        onFailed?.(msg);
        return;
      }

      setIsLocating(true);
      setGpsError(null);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const accuracy = Math.round(pos.coords.accuracy || 20);
          const resolvedAddress = await reverseGeocodeCoordinates(lat, lng);

          const nextState: GeolocationState = {
            lat,
            lng,
            accuracyMeters: accuracy,
            isRealGps: true,
            label: resolvedAddress,
          };
          setCoords(nextState);
          setIsLocating(false);
          onResolved?.(nextState);
        },
        (err) => {
          setIsLocating(false);
          const msg =
            err.code === 1
              ? 'Bạn đang tắt quyền truy cập Vị trí trên trình duyệt. Hãy bật quyền GPS hoặc nhập địa chỉ của bạn ở ô Tìm kiếm gần bạn.'
              : 'Không thể lấy tín hiệu GPS tự động. Bạn có thể tìm theo tên đường/quận bên dưới.';
          setGpsError(msg);
          onFailed?.(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    },
    [reverseGeocodeCoordinates]
  );

  const setCustomLocation = useCallback(
    (lat: number, lng: number, addressLabel: string) => {
      setGpsError(null);
      setCoords({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        accuracyMeters: 15,
        isRealGps: false,
        label: addressLabel,
      });
    },
    []
  );

  /**
   * Đi dạo tuần tra (Co-op Patrol): làm mới vị trí GPS THẬT của người dùng.
   * Tuyệt đối không tự dịch chuyển / mô phỏng tọa độ.
   */
  const stepPatrolWalk = useCallback(
    (_targetLat?: number, _targetLng?: number) => {
      requestCurrentGps();
    },
    [requestCurrentGps]
  );

  // Tự động thử lấy vị trí GPS thực tế khi khởi động
  useEffect(() => {
    requestCurrentGps();
  }, [requestCurrentGps]);

  useEffect(() => {
    if (!patrolModeActive) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords((prev) => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(pos.coords.accuracy || 20),
          isRealGps: true,
        }));
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [patrolModeActive]);

  return {
    coords,
    setCoords,
    isLocating,
    gpsError,
    requestCurrentGps,
    setCustomLocation,
    stepPatrolWalk,
  };
}
