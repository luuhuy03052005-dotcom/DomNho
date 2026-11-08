'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
} from 'lucide-react';

interface LocationMapPickerModalProps {
  isOpen: boolean;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onClose: () => void;
  onConfirmLocation: (result: {
    lat: number;
    lng: number;
    formattedAddress: string;
  }) => void;
}

export default function LocationMapPickerModal({
  isOpen,
  initialLat = 10.8505,
  initialLng = 106.765,
  initialAddress = '',
  onClose,
  onConfirmLocation,
}: LocationMapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const geocodeTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const coordsBadgeRef = useRef<HTMLDivElement | null>(null);
  const currentCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: initialLat || 10.8505,
    lng: initialLng || 106.765,
  });
  const lastGeocodedCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });
  const initialPropsRef = useRef({
    lat: initialLat || 10.8505,
    lng: initialLng || 106.765,
    address: initialAddress || '',
  });
  initialPropsRef.current = {
    lat: initialLat || 10.8505,
    lng: initialLng || 106.765,
    address: initialAddress || '',
  };

  const [mounted, setMounted] = useState(false);
  const [isMovingMap, setIsMovingMap] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: initialLat || 10.8505,
    lng: initialLng || 106.765,
  });
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialAddress || 'Đang xác định địa chỉ...'
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    Array<{ address: string; lat: number; lng: number }>
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAddressForCoords = useCallback(async (lat: number, lng: number) => {
    lastGeocodedCoordsRef.current = { lat, lng };
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.ok && data.address) {
        setResolvedAddress(data.address);
      } else {
        setResolvedAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setResolvedAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsGeocoding(false);
      }
    }
  }, []);

  const scheduleReverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (geocodeTimerRef.current) {
        window.clearTimeout(geocodeTimerRef.current);
      }
      geocodeTimerRef.current = window.setTimeout(() => {
        fetchAddressForCoords(lat, lng);
      }, 280);
    },
    [fetchAddressForCoords]
  );

  useEffect(() => {
    if (!isOpen || !mounted) return;

    let cancelled = false;

    const startLat = initialPropsRef.current.lat;
    const startLng = initialPropsRef.current.lng;
    const startAddr = initialPropsRef.current.address;

    currentCoordsRef.current = { lat: startLat, lng: startLng };
    lastGeocodedCoordsRef.current = { lat: startLat, lng: startLng };
    setCurrentCoords({ lat: startLat, lng: startLng });

    if (startAddr && startAddr.trim().length > 0) {
      setResolvedAddress(startAddr);
    } else {
      fetchAddressForCoords(startLat, startLng);
    }

    async function initPickerMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const keyParam = googleMapsApiKey
        ? `&key=${encodeURIComponent(googleMapsApiKey)}`
        : '';

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'google-roadmap': {
              type: 'raster',
              tiles: [
                `https://mt0.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
                `https://mt1.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
                `https://mt2.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
                `https://mt3.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              ],
              tileSize: 256,
            },
          },
          layers: [
            {
              id: 'google-roadmap-tiles',
              type: 'raster',
              source: 'google-roadmap',
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        },
        center: [startLng, startLat],
        zoom: 15.5,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
      });

      map.on('movestart', (e: any) => {
        if (cancelled) return;
        if (e?.originalEvent) {
          setIsMovingMap(true);
        }
      });

      map.on('move', () => {
        if (cancelled) return;
        const center = map.getCenter();
        const nextLat = Number(center.lat.toFixed(6));
        const nextLng = Number(center.lng.toFixed(6));
        currentCoordsRef.current = { lat: nextLat, lng: nextLng };
        if (coordsBadgeRef.current) {
          coordsBadgeRef.current.textContent = `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`;
        }
      });

      map.on('moveend', () => {
        if (cancelled) return;
        setIsMovingMap(false);
        const center = map.getCenter();
        const nextLat = Number(center.lat.toFixed(6));
        const nextLng = Number(center.lng.toFixed(6));
        currentCoordsRef.current = { lat: nextLat, lng: nextLng };
        setCurrentCoords({ lat: nextLat, lng: nextLng });

        const prev = lastGeocodedCoordsRef.current;
        const deltaLat = Math.abs(nextLat - prev.lat);
        const deltaLng = Math.abs(nextLng - prev.lng);
        // Chỉ gọi reverse geocode khi vị trí ghim thực sự dịch chuyển (> ~3 mét), chống lặp vô hạn
        if (deltaLat > 0.00003 || deltaLng > 0.00003) {
          scheduleReverseGeocode(nextLat, nextLng);
        }
      });

      map.on('click', (e) => {
        if (cancelled) return;
        map.easeTo({
          center: [e.lngLat.lng, e.lngLat.lat],
          duration: 260,
        });
      });
    }

    initPickerMap();

    return () => {
      cancelled = true;
      if (geocodeTimerRef.current) {
        window.clearTimeout(geocodeTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mounted, googleMapsApiKey, fetchAddressForCoords, scheduleReverseGeocode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const coordMatch = query.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      const pLat = parseFloat(coordMatch[1]);
      const pLng = parseFloat(coordMatch[2]);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        flyToCoords(pLat, pLng);
        setSearchResults([]);
        return;
      }
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const candidateList = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.candidates)
        ? data.candidates
        : [];
      if (data.ok && candidateList.length > 0) {
        setSearchResults(candidateList);
      }
    } catch {
      // ignore search error
    } finally {
      setIsSearching(false);
    }
  };

  const flyToCoords = (lat: number, lng: number, addressCandidate?: string) => {
    currentCoordsRef.current = { lat, lng };
    lastGeocodedCoordsRef.current = { lat, lng };
    setCurrentCoords({ lat, lng });
    if (coordsBadgeRef.current) {
      coordsBadgeRef.current.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 450,
      });
    }
    if (addressCandidate) {
      setResolvedAddress(addressCandidate);
    } else {
      fetchAddressForCoords(lat, lng);
    }
    setSearchResults([]);
  };

  const handleUseCurrentGps = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          flyToCoords(lat, lng);
        },
        () => {
          alert(
            'Không thể nhận vị trí GPS hiện tại. Vui lòng di chuyển bản đồ để chọn vị trí.'
          );
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      lat: currentCoordsRef.current.lat || currentCoords.lat,
      lng: currentCoordsRef.current.lng || currentCoords.lng,
      formattedAddress: resolvedAddress,
    });
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Ghim địa chỉ trên bản đồ"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-2xl h-[90dvh] sm:h-[84dvh] max-h-[740px] bg-white rounded-t-[20px] sm:rounded-[18px] shadow-2xl border border-[#DDDCD4] overflow-hidden flex flex-col"
      >
        <div className="shrink-0 px-4 py-3.5 border-b border-[#DDDCD4] flex items-center justify-between gap-3 bg-[#FAF7F1]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#FFF0E5] text-[#AF421F] flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-ink truncate">
                Ghim vị trí trên bản đồ
              </h3>
              <p className="text-[11px] sm:text-xs text-ink-secondary truncate">
                Di chuyển bản đồ để đặt mốc ghim ở giữa vào đúng vị trí cần chọn
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-[10px] bg-white border border-[#DDDCD4] text-ink flex items-center justify-center hover:bg-[#F1EFE8] transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shrink-0 p-3 bg-white border-b border-[#DDDCD4] relative z-20">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên đường, ngõ hẻm, địa điểm hoặc dán tọa độ..."
                className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-ink placeholder:text-ink-secondary/70 focus:outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="h-10 px-3.5 rounded-[10px] bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors shrink-0 flex items-center gap-1.5"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Tìm</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleUseCurrentGps}
              className="h-10 px-3 rounded-[10px] bg-white border border-[#DDDCD4] text-brand text-xs font-bold hover:bg-brand-soft transition-colors shrink-0 flex items-center gap-1.5"
              title="Đến vị trí GPS hiện tại của tôi"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-xl shadow-xl border border-[#DDDCD4] max-h-48 overflow-y-auto divide-y divide-[#DDDCD4]/60 z-30">
              {searchResults.map((cand, idx) => (
                <button
                  key={`${cand.address}-${idx}`}
                  type="button"
                  onClick={() => flyToCoords(cand.lat, cand.lng, cand.address)}
                  className="w-full text-left p-2.5 text-xs font-medium text-ink hover:bg-[#FAF7F1] flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{cand.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 min-h-[260px] w-full bg-[#EFECE4] overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          <div
            data-testid="fixed-center-map-pin"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div className="relative w-0 h-0">
              <span
                className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-ink/30 border-2 border-white shadow-sm transition-transform duration-150 ${
                  isMovingMap ? 'scale-125' : 'scale-90'
                }`}
              />

              <div
                data-testid="fixed-center-pin-marker"
                className={`absolute left-0 bottom-0 -translate-x-1/2 flex flex-col items-center transition-transform duration-150 ${
                  isMovingMap
                    ? '-translate-y-2.5 scale-105'
                    : 'translate-y-0 scale-100'
                }`}
              >
                <div
                  className="mb-1 px-2.5 py-1 rounded-full text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
                  style={{ backgroundColor: 'rgba(20, 40, 32, 0.92)' }}
                >
                  {isMovingMap ? 'Đang di chuyển bản đồ...' : 'Mốc ghim cố định'}
                </div>

                <svg
                  viewBox="0 0 24 24"
                  fill="#AF421F"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="w-11 h-11 -mb-[2px] drop-shadow-[0_4px_8px_rgba(20,40,32,0.35)]"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3.2" fill="#FFFFFF" />
                </svg>
              </div>
            </div>
          </div>

          <div
            ref={coordsBadgeRef}
            className="absolute top-3 right-3 z-10 bg-white/95 px-2.5 py-1 rounded-full text-[11px] font-bold text-ink shadow-sm border border-[#DDDCD4] pointer-events-none"
          >
            {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
          </div>

          <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn({ duration: 200 })}
              className="w-10 h-10 rounded-[10px] bg-white/95 border border-[#DDDCD4] text-ink hover:border-brand flex items-center justify-center shadow-sm transition-colors"
              aria-label="Phóng to bản đồ"
              title="Phóng to"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut({ duration: 200 })}
              className="w-10 h-10 rounded-[10px] bg-white/95 border border-[#DDDCD4] text-ink hover:border-brand flex items-center justify-center shadow-sm transition-colors"
              aria-label="Thu nhỏ bản đồ"
              title="Thu nhỏ"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="shrink-0 p-3.5 sm:p-4 pb-[max(14px,env(safe-area-inset-bottom,14px))] bg-white border-t border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-20">
          <div className="w-full sm:flex-1 min-w-0 flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0 mt-0.5">
              {isGeocoding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary block">
                Địa chỉ được xác định từ ghim:
              </span>
              <p className="text-xs font-bold text-ink line-clamp-2 h-8 flex items-center break-words">
                {resolvedAddress}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none min-h-[44px] px-4 rounded-[10px] border border-[#DDDCD4] text-xs font-bold text-ink hover:bg-[#F1EFE8] transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none min-h-[44px] px-5 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Xác nhận vị trí này</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
