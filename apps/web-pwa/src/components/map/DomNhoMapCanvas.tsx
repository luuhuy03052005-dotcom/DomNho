'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, LocateFixed, Minus, Plus } from 'lucide-react';
import {
  DomSpot,
  ThemeId,
  VetStation,
  getSpotBadgeMeta,
} from '@/lib/types';
import { calculateDistanceMeters } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface DomNhoMapCanvasProps {
  themeId: ThemeId;
  spots: DomSpot[];
  selectedSpot: DomSpot | null;
  onSelectSpot: (spot: DomSpot) => void;
  userCoords: { lat: number; lng: number; label: string };
  patrolModeActive: boolean;
  searchRadiusMeters?: number;
  focusCoordsTrigger?: { lat: number; lng: number; ts: number } | null;
  onStepPatrolWalk: (lat?: number, lng?: number) => void;
  onRequestRealGps: () => void;
  onOpenNearbySearch?: () => void;
  showVetStations: boolean;
  vetStations: VetStation[];
  newlyDroppedSpotId: string | null;
}

interface StoredSpotMarker {
  marker: any;
  wrapper: HTMLDivElement;
  circleEl: HTMLDivElement;
  pinColor: string;
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeAntiOverlapOffsets(
  coordsList: { lat: number; lng: number }[]
): [number, number][] {
  const offsets: [number, number][] = coordsList.map(() => [0, 0]);
  const PROXIMITY_DEG = 0.018;
  const RING_RADIUS_PX = 24;

  for (let i = 0; i < coordsList.length; i++) {
    const clusterIndices: number[] = [];
    for (let j = 0; j < coordsList.length; j++) {
      const dLat = Math.abs(coordsList[i].lat - coordsList[j].lat);
      const dLng = Math.abs(coordsList[i].lng - coordsList[j].lng);
      if (Math.hypot(dLat, dLng) < PROXIMITY_DEG) {
        clusterIndices.push(j);
      }
    }
    if (clusterIndices.length > 1) {
      const idxInCluster = clusterIndices.indexOf(i);
      const angle =
        (idxInCluster / clusterIndices.length) * 2 * Math.PI - Math.PI / 4;
      offsets[i] = [
        Math.round(Math.cos(angle) * RING_RADIUS_PX),
        Math.round(Math.sin(angle) * RING_RADIUS_PX),
      ];
    }
  }
  return offsets;
}

function getPinIconSvg(kind: 'RESCUE' | 'LOST' | 'ADOPT' | 'VET'): string {
  if (kind === 'ADOPT') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V14H9V21H4C3.45 21 3 20.55 3 20V10.5Z" fill="#FFFFFF"/>
    </svg>`;
  }
  if (kind === 'LOST') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7.5" r="2.2" fill="#FFFFFF"/>
      <circle cx="12" cy="5.5" r="2.2" fill="#FFFFFF"/>
      <circle cx="17" cy="7.5" r="2.2" fill="#FFFFFF"/>
      <path d="M7.2 16C6.4 12.8 9 10.8 12 10.8C15 10.8 17.6 12.8 16.8 16C16.2 18.2 14.3 19.6 12 19.6C9.7 19.6 7.8 18.2 7.2 16Z" fill="#FFFFFF"/>
    </svg>`;
  }
  if (kind === 'VET') {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4H14V10H20V14H14V20H10V14H4V10H10V4Z" fill="#FFFFFF"/>
    </svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8.5" stroke="#FFFFFF" stroke-width="2.2"/>
    <circle cx="12" cy="12" r="3.5" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M6 6L9.5 9.5M18 6L14.5 9.5M6 18L9.5 14.5M18 18L14.5 14.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function applySpotMarkerSelectionStyle(
  entry: StoredSpotMarker,
  isSelected: boolean
) {
  const sizePx = isSelected ? 44 : 36;
  const borderRing = isSelected
    ? `0 0 0 3.5px #FFFFFF, 0 0 0 6px ${entry.pinColor}55, 0 8px 20px rgba(20,40,32,0.38)`
    : '0 0 0 2.5px #FFFFFF, 0 3px 10px rgba(20,40,32,0.25)';

  entry.wrapper.style.zIndex = isSelected ? '65' : '30';
  entry.circleEl.style.width = `${sizePx}px`;
  entry.circleEl.style.height = `${sizePx}px`;
  entry.circleEl.style.boxShadow = borderRing;
}

export default function DomNhoMapCanvas({
  spots,
  selectedSpot,
  onSelectSpot,
  userCoords,
  focusCoordsTrigger,
  onRequestRealGps,
  showVetStations,
  vetStations,
}: DomNhoMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const maplibreglRef = useRef<any>(null);
  const spotMarkersMapRef = useRef<Map<string, StoredSpotMarker>>(new Map());
  const vetMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const selectedSpotRef = useRef<DomSpot | null>(selectedSpot);
  selectedSpotRef.current = selectedSpot;
  const onSelectSpotRef = useRef(onSelectSpot);
  onSelectSpotRef.current = onSelectSpot;

  const [mapReady, setMapReady] = useState(false);
  const [mapLayerMode, setMapLayerMode] = useState<'roadmap' | 'hybrid'>(
    'roadmap'
  );

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    let cancelled = false;

    async function initRealGoogleMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !mapContainerRef.current) return;

      maplibreglRef.current = maplibregl;

      const keyParam = googleMapsApiKey
        ? `&key=${encodeURIComponent(googleMapsApiKey)}`
        : '';

      const googleMapStyle: any = {
        version: 8,
        sources: {
          'google-roadmap-tiles': {
            type: 'raster',
            tiles: [
              `https://mt0.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt1.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt2.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt3.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
            ],
            tileSize: 256,
            attribution: 'Dữ liệu bản đồ © Google Maps',
          },
          'google-hybrid-tiles': {
            type: 'raster',
            tiles: [
              `https://mt0.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt1.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt2.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
              `https://mt3.google.com/vt/lyrs=y&hl=vi&gl=VN&x={x}&y={y}&z={z}${keyParam}`,
            ],
            tileSize: 256,
            attribution: 'Ảnh vệ tinh © Google Maps',
          },
        },
        layers: [
          {
            id: 'google-roadmap-layer',
            type: 'raster',
            source: 'google-roadmap-tiles',
            minzoom: 0,
            maxzoom: 22,
          },
          {
            id: 'google-hybrid-layer',
            type: 'raster',
            source: 'google-hybrid-tiles',
            minzoom: 0,
            maxzoom: 22,
            layout: {
              visibility: 'none',
            },
          },
        ],
      };

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: googleMapStyle,
        center: [userCoords.lng, userCoords.lat],
        zoom: 11.6,
        minZoom: 4,
        maxZoom: 20,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        setMapReady(true);
      });
    }

    initRealGoogleMap();

    return () => {
      cancelled = true;
      spotMarkersMapRef.current.forEach((entry) => entry.marker.remove());
      spotMarkersMapRef.current.clear();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const syncMapSizeAndCamera = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.resize();
      const activeSpot = selectedSpotRef.current;
      if (activeSpot && isSpotPinAllowedOnMap(activeSpot)) {
        map.easeTo({
          center: [activeSpot.publicLng, activeSpot.publicLat],
          duration: 240,
        });
      }
    };

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncMapSizeAndCamera);
      observer.observe(container);
    }

    window.addEventListener('orientationchange', syncMapSizeAndCamera);
    window.visualViewport?.addEventListener('resize', syncMapSizeAndCamera);

    return () => {
      observer?.disconnect();
      window.removeEventListener('orientationchange', syncMapSizeAndCamera);
      window.visualViewport?.removeEventListener(
        'resize',
        syncMapSizeAndCamera
      );
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    try {
      map.setLayoutProperty(
        'google-roadmap-layer',
        'visibility',
        mapLayerMode === 'roadmap' ? 'visible' : 'none'
      );
      map.setLayoutProperty(
        'google-hybrid-layer',
        'visibility',
        mapLayerMode === 'hybrid' ? 'visible' : 'none'
      );
    } catch {
      // ignore if style is still loading
    }
  }, [mapLayerMode, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className =
        'relative flex items-center justify-center pointer-events-none';
      el.innerHTML = `
        <div class="relative flex items-center justify-center" title="Vị trí của bạn">
          <span class="w-9 h-9 rounded-full" style="background-color: rgba(37, 99, 235, 0.22);"></span>
          <div
            class="absolute w-4 h-4 rounded-full"
            style="background-color: #2563EB; box-shadow: 0 0 0 3px #FFFFFF, 0 2px 6px rgba(37,99,235,0.45);"
          ></div>
        </div>
      `;
      userMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([userCoords.lng, userCoords.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
    }
  }, [userCoords.lat, userCoords.lng, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !focusCoordsTrigger) return;
    map.flyTo({
      center: [focusCoordsTrigger.lng, focusCoordsTrigger.lat],
      zoom: 13.8,
      duration: 650,
    });
  }, [focusCoordsTrigger, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    spotMarkersMapRef.current.forEach((entry) => entry.marker.remove());
    spotMarkersMapRef.current.clear();

    const pinnableSpots = spots.filter((s) => isSpotPinAllowedOnMap(s));
    const antiOverlapOffsets = computeAntiOverlapOffsets(
      pinnableSpots.map((s) => ({ lat: s.publicLat, lng: s.publicLng }))
    );

    pinnableSpots.forEach((spot, idx) => {
      const meta = getSpotBadgeMeta(spot);
      const pinColor =
        meta.categoryKind === 'RESCUE'
          ? '#C84B24'
          : meta.categoryKind === 'LOST'
          ? '#D4942A'
          : '#0E513B';

      const distMeters = calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      );
      const distText =
        distMeters < 1000
          ? `${distMeters}m`
          : `${(distMeters / 1000).toFixed(1)}km`;

      const offsetPair = antiOverlapOffsets[idx] || [0, 0];
      const iconSvg = getPinIconSvg(meta.categoryKind);

      const wrapper = document.createElement('div');
      wrapper.style.cursor = 'pointer';
      wrapper.setAttribute('data-spot-pin-id', spot.id);

      wrapper.innerHTML = `
        <div
          class="relative flex flex-col items-center group transition-transform duration-150 hover:scale-110"
          style="display: flex; flex-direction: column; align-items: center;"
          title="${escapeHtml(spot.title)} (${distText})"
        >
          <div
            data-pin-circle="1"
            class="relative flex items-center justify-center rounded-full transition-all duration-150"
            style="width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; background-color: ${pinColor}; box-shadow: 0 0 0 2.5px #FFFFFF, 0 3px 10px rgba(20,40,32,0.25);"
          >
            ${iconSvg}
          </div>
          <div
            style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${pinColor}; margin-top: -1px;"
          ></div>
        </div>
      `;

      const circleEl = wrapper.querySelector(
        '[data-pin-circle="1"]'
      ) as HTMLDivElement;

      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectSpotRef.current(spot);
      });

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'bottom',
        offset: offsetPair,
      })
        .setLngLat([spot.publicLng, spot.publicLat])
        .addTo(map);

      const entry: StoredSpotMarker = {
        marker,
        wrapper,
        circleEl,
        pinColor,
      };
      applySpotMarkerSelectionStyle(
        entry,
        selectedSpotRef.current?.id === spot.id
      );
      spotMarkersMapRef.current.set(spot.id, entry);
    });
  }, [spots, userCoords.lat, userCoords.lng, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    spotMarkersMapRef.current.forEach((entry, spotId) => {
      applySpotMarkerSelectionStyle(entry, selectedSpot?.id === spotId);
    });

    if (selectedSpot && isSpotPinAllowedOnMap(selectedSpot)) {
      map.flyTo({
        center: [selectedSpot.publicLng, selectedSpot.publicLat],
        zoom: Math.max(map.getZoom(), 13.8),
        duration: 500,
      });
    }
  }, [selectedSpot, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    vetMarkersRef.current.forEach((m) => m.remove());
    vetMarkersRef.current = [];

    if (!showVetStations) return;

    vetStations.forEach((vet) => {
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.zIndex = '22';
      el.innerHTML = `
        <div
          class="relative flex flex-col items-center group transition-transform duration-150 hover:scale-110"
          title="${escapeHtml(`${vet.name} • ${vet.address}${vet.hotline ? ` • Hotline: ${vet.hotline}` : ''}`)}"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center"
            style="background-color: #8E44AD; box-shadow: 0 0 0 2.5px #FFFFFF, 0 3px 10px rgba(142,68,173,0.35);"
          >
            ${getPinIconSvg('VET')}
          </div>
          <div
            style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 7px solid #8E44AD; margin-top: -1px;"
          ></div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const gmapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${vet.name} ${vet.address}`
        )}`;
        window.open(gmapUrl, '_blank', 'noopener,noreferrer');
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat([vet.lng, vet.lat])
        .addTo(map);

      vetMarkersRef.current.push(marker);
    });
  }, [showVetStations, vetStations, mapReady]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn({ duration: 220 });
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut({ duration: 220 });
  };

  const handleCenterOnUser = () => {
    onRequestRealGps();
    mapInstanceRef.current?.flyTo({
      center: [userCoords.lng, userCoords.lat],
      zoom: 14,
      duration: 600,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#EFECE4]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      <div className="hidden md:block absolute left-4 bottom-4 z-20 bg-white/95 border border-[#DDDCD4] rounded-[12px] p-3 shadow-sm space-y-2 pointer-events-none select-none">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#142820]">
          <span className="w-5 h-5 rounded-full bg-[#0E513B] flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 10.5L12 3L21 10.5V20H15V14H9V20H3V10.5Z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
          <span>Trạm &amp; Nhận nuôi</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#142820]">
          <span className="w-5 h-5 rounded-full bg-[#C84B24] flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="8"
                stroke="#FFFFFF"
                strokeWidth="2.4"
              />
              <path
                d="M12 8V16M8 12H16"
                stroke="#FFFFFF"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>Cứu trợ</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#142820]">
          <span className="w-5 h-5 rounded-full bg-[#D4942A] flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <circle cx="7" cy="8" r="2.2" fill="#FFFFFF" />
              <circle cx="12" cy="6" r="2.2" fill="#FFFFFF" />
              <circle cx="17" cy="8" r="2.2" fill="#FFFFFF" />
              <path
                d="M7.5 16C7 13 9 11 12 11C15 11 17 13 16.5 16C16 18 14 19.5 12 19.5C10 19.5 8 18 7.5 16Z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
          <span>Thú lạc</span>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-semibold text-[#142820]">
          <span className="w-5 h-5 rounded-full bg-[#8E44AD] flex items-center justify-center shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 4H14V10H20V14H14V20H10V14H4V10H10V4Z"
                fill="#FFFFFF"
              />
            </svg>
          </span>
          <span>Thú y</span>
        </div>
      </div>

      <div className="absolute right-3 sm:right-4 bottom-9 sm:bottom-10 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="min-w-[44px] min-h-[44px] rounded-[10px] flex items-center justify-center shadow-sm border border-[#DDDCD4] bg-white/95 text-[#142820] hover:border-[#0E513B] transition-colors"
          title="Phóng to bản đồ"
          aria-label="Phóng to bản đồ"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="min-w-[44px] min-h-[44px] rounded-[10px] flex items-center justify-center shadow-sm border border-[#DDDCD4] bg-white/95 text-[#142820] hover:border-[#0E513B] transition-colors"
          title="Thu nhỏ bản đồ"
          aria-label="Thu nhỏ bản đồ"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() =>
            setMapLayerMode((m) => (m === 'roadmap' ? 'hybrid' : 'roadmap'))
          }
          className={`min-w-[44px] min-h-[44px] rounded-[10px] flex items-center justify-center shadow-sm border transition-colors ${
            mapLayerMode === 'hybrid'
              ? 'bg-[#0E513B] text-white border-[#0E513B]'
              : 'bg-white/95 text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
          }`}
          title="Đổi lớp bản đồ Đường phố / Vệ tinh"
          aria-label="Đổi lớp bản đồ"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCenterOnUser}
          className="min-w-[44px] min-h-[44px] rounded-[10px] flex items-center justify-center shadow-sm border border-[#DDDCD4] bg-white/95 text-[#142820] hover:border-[#0E513B] transition-colors"
          title="Vị trí của tôi"
          aria-label="Vị trí của tôi"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute right-2.5 bottom-2 z-10 px-2.5 py-0.5 rounded-full bg-white/90 border border-[#DDDCD4] text-[10px] font-medium text-[#52605A] pointer-events-none select-none">
        Dữ liệu bản đồ © Google Maps
      </div>
    </div>
  );
}
