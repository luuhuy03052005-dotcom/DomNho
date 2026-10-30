'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Search,
  X,
  Navigation,
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
  const markerRef = useRef<any>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || 10.8505,
    lng: initialLng || 106.765,
  });
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialAddress || 'Chưa xác định địa chỉ'
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Array<{ address: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const fetchAddressForCoords = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.ok && data.address) {
        setResolvedAddress(data.address);
      } else {
        setResolvedAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setResolvedAddress(`Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentCoords({
      lat: initialLat || 10.8505,
      lng: initialLng || 106.765,
    });
    if (initialAddress) {
      setResolvedAddress(initialAddress);
    } else {
      fetchAddressForCoords(initialLat || 10.8505, initialLng || 106.765);
    }
  }, [isOpen, initialLat, initialLng, initialAddress, fetchAddressForCoords]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function initPickerMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            'google-roadmap': {
              type: 'raster',
              tiles: [
                'https://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
                'https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
                'https://mt2.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
                'https://mt3.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
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
        center: [currentCoords.lng, currentCoords.lat],
        zoom: 15,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        if (cancelled) return;

        const pinEl = document.createElement('div');
        pinEl.innerHTML = `
          <div style="position: relative; width: 44px; height: 44px; transform: translate(-50%, -100%); cursor: grab;">
            <svg viewBox="0 0 24 24" fill="#AF421F" stroke="#FFFFFF" stroke-width="2" style="width: 44px; height: 44px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
            </svg>
          </div>
        `;

        const marker = new maplibregl.Marker({
          element: pinEl,
          draggable: true,
        })
          .setLngLat([currentCoords.lng, currentCoords.lat])
          .addTo(map);

        markerRef.current = marker;

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          const nextLat = Number(pos.lat.toFixed(6));
          const nextLng = Number(pos.lng.toFixed(6));
          setCurrentCoords({ lat: nextLat, lng: nextLng });
          fetchAddressForCoords(nextLat, nextLng);
        });

        map.on('click', (e) => {
          const nextLat = Number(e.lngLat.lat.toFixed(6));
          const nextLng = Number(e.lngLat.lng.toFixed(6));
          marker.setLngLat([nextLng, nextLat]);
          setCurrentCoords({ lat: nextLat, lng: nextLng });
          fetchAddressForCoords(nextLat, nextLng);
        });
      });
    }

    initPickerMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

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
      if (data.ok && Array.isArray(data.candidates)) {
        setSearchResults(data.candidates);
      }
    } catch {
      // ignore search error
    } finally {
      setIsSearching(false);
    }
  };

  const flyToCoords = (lat: number, lng: number, addressCandidate?: string) => {
    setCurrentCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16 });
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
          alert('Không thể nhận vị trí GPS hiện tại. Vui lòng chọn trên bản đồ.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleConfirm = () => {
    onConfirmLocation({
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      formattedAddress: resolvedAddress,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Ghim địa chỉ trên Google Map"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#DDDCD4] overflow-hidden flex flex-col"
        >
          <div className="p-3.5 sm:p-4 border-b border-[#DDDCD4] flex items-center justify-between gap-3 bg-[#FAF7F1]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#AF421F]/15 text-[#AF421F] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#142820]">
                  Ghim vị trí trên bản đồ
                </h3>
                <p className="text-[11px] text-[#52605A]">
                  Chạm hoặc kéo ghim đến đúng số nhà, ngõ ngách cần cứu trợ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-[#DDDCD4] text-[#142820] flex items-center justify-center hover:bg-[#F1EFE8] transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-white border-b border-[#DDDCD4] relative z-20">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#52605A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm đường, ngõ xóm, tòa nhà hoặc dán tọa độ..."
                  className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="h-10 px-3.5 rounded-[10px] bg-[#0E513B] text-white text-xs font-semibold hover:bg-[#0A412F] transition-colors shrink-0 flex items-center gap-1.5"
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
                className="h-10 px-3 rounded-[10px] bg-white border border-[#DDDCD4] text-[#0E513B] text-xs font-semibold hover:bg-[#E8EFE6] transition-colors shrink-0 flex items-center gap-1"
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
                    className="w-full text-left p-2.5 text-xs font-medium text-[#142820] hover:bg-[#FAF7F1] flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#0E513B] mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{cand.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 w-full bg-[#FAF7F1]">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#52605A] shadow-sm border border-[#DDDCD4] pointer-events-none">
              {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
            </div>
          </div>

          <div className="p-4 bg-white border-t border-[#DDDCD4] flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
            <div className="w-full sm:max-w-md min-w-0 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center shrink-0 mt-0.5">
                {isGeocoding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#52605A] block">
                  Địa chỉ được xác định từ ghim:
                </span>
                <p className="text-xs font-bold text-[#142820] truncate sm:whitespace-normal sm:line-clamp-2">
                  {resolvedAddress}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none h-11 px-4 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:bg-[#F1EFE8] transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 sm:flex-none h-11 px-5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận vị trí này</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

