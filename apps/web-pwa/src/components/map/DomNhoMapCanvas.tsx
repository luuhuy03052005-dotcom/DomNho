'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Footprints,
  Layers,
  LocateFixed,
  Minus,
  Plus,
  Radar,
} from 'lucide-react';
import { DomSpot, ThemeId, VetStation, isUserWebPost } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
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

/** Escape chuỗi trước khi chèn vào HTML của marker (chống lỗi hiển thị / XSS từ dữ liệu bài viết) */
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rút gọn tên hiển thị trên nhãn ghim bản đồ để không bị dài và đè lên nhau */
function getCompactSpotLabel(spot: DomSpot): string {
  const raw =
    spot.entityCategory === 'RESCUE_CENTER'
      ? spot.authorName || spot.title
      : spot.breed || spot.title;
  return raw
    .replace(/^Cộng đồng\s+/i, '')
    .replace(/^Trạm cứu hộ\s+/i, 'Trạm ')
    .replace(/^Mái ấm Cứu trợ\s+/i, 'Mái ấm ')
    .replace(/^Mái ấm\s+Mèo\s+cứu\s+hộ\s+/i, 'Mái ấm ')
    .replace(/^Trung tâm Cứu trợ\s+/i, '')
    .trim();
}

/**
 * Tính toán độ lệch pixel (offset [dx, dy]) cho các ghim ở gần nhau
 * để các icon không bao giờ nằm chồng khít lên nhau ở mức zoom thành phố.
 */
function computeAntiOverlapOffsets(
  coordsList: { lat: number; lng: number }[]
): [number, number][] {
  const offsets: [number, number][] = coordsList.map(() => [0, 0]);
  const PROXIMITY_DEG = 0.022; // ~2.2km
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

/**
 * Tạo đa giác hình tròn địa lý thực tế (GeoJSON Polygon) theo bán kính mét trên bề mặt Trái Đất
 */
function createGeoCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  points = 64
) {
  const coords: [number, number][] = [];
  const distanceX =
    radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusMeters / 110574;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
        properties: {},
      },
    ],
  };
}

export default function DomNhoMapCanvas({
  themeId,
  spots,
  selectedSpot,
  onSelectSpot,
  userCoords,
  patrolModeActive,
  searchRadiusMeters = 5000,
  focusCoordsTrigger,
  onStepPatrolWalk,
  onRequestRealGps,
  onOpenNearbySearch,
  showVetStations,
  vetStations,
}: DomNhoMapCanvasProps) {
  const theme = DOM_THEMES[themeId];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const maplibreglRef = useRef<any>(null);
  const spotMarkersRef = useRef<any[]>([]);
  const vetMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(13.2);
  const [mapLayerMode, setMapLayerMode] = useState<'roadmap' | 'hybrid'>('roadmap');

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // 1. Khởi tạo Bản đồ Google Maps Thực Tế 100% (Tile Server chính thức của Google Maps)
  useEffect(() => {
    let cancelled = false;

    async function initRealGoogleMap() {
      if (!mapContainerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !mapContainerRef.current) return;

      maplibreglRef.current = maplibregl;

      const keyParam = googleMapsApiKey ? `&key=${encodeURIComponent(googleMapsApiKey)}` : '';

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
            attribution: 'Dữ liệu bản đồ ©2026 Google Maps Việt Nam',
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
            attribution: 'Ảnh vệ tinh ©2026 Google Maps',
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
        zoom: 12.8,
        minZoom: 4,
        maxZoom: 20,
        attributionControl: true,
      });

      mapInstanceRef.current = map;

      map.on('zoomend', () => {
        if (!cancelled) {
          setCurrentZoom(map.getZoom());
        }
      });

      map.on('load', () => {
        if (cancelled) return;

        // Thêm nguồn GeoJSON cho Vòng Radar Đi Dạo 500m
        map.addSource('patrol-500m-source', {
          type: 'geojson',
          data: createGeoCirclePolygon(userCoords.lng, userCoords.lat, 500),
        });

        map.addLayer({
          id: 'patrol-500m-fill',
          type: 'fill',
          source: 'patrol-500m-source',
          paint: {
            'fill-color': '#2A9D8F',
            'fill-opacity': 0.11,
          },
        });

        map.addLayer({
          id: 'patrol-500m-outline',
          type: 'line',
          source: 'patrol-500m-source',
          paint: {
            'line-color': '#2A9D8F',
            'line-width': 2,
            'line-dasharray': [3, 2],
            'line-opacity': 0.65,
          },
        });

        // Thêm nguồn GeoJSON cho Vòng Làm Mờ Tọa Độ ±200m của Đốm đang chọn
        map.addSource('spot-fuzz-200m-source', {
          type: 'geojson',
          data: createGeoCirclePolygon(userCoords.lng, userCoords.lat, 0),
        });

        map.addLayer({
          id: 'spot-fuzz-200m-fill',
          type: 'fill',
          source: 'spot-fuzz-200m-source',
          paint: {
            'fill-color': '#E63946',
            'fill-opacity': 0.14,
          },
        });

        map.addLayer({
          id: 'spot-fuzz-200m-outline',
          type: 'line',
          source: 'spot-fuzz-200m-source',
          paint: {
            'line-color': '#E63946',
            'line-width': 1.8,
            'line-opacity': 0.6,
          },
        });

        setMapReady(true);
      });
    }

    initRealGoogleMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Chuyển đổi chế độ Bản đồ Đường phố / Vệ tinh Google Maps
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
      // ignore if style not ready
    }
  }, [mapLayerMode, mapReady]);

  // 3. Cập nhật vị trí GPS của Người dùng & Vòng Radar Tìm kiếm Gần bạn trên Google Maps
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    const visualRadius = patrolModeActive
      ? Math.min(searchRadiusMeters || 500, 10000)
      : 0;

    const patrolSource = map.getSource('patrol-500m-source');
    if (patrolSource) {
      patrolSource.setData(
        createGeoCirclePolygon(
          userCoords.lng,
          userCoords.lat,
          visualRadius
        )
      );
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex flex-col items-center pointer-events-none';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-9 h-9 rounded-full bg-[#2A9D8F]/35 animate-ping"></span>
          <div class="w-5 h-5 rounded-full bg-[#2A9D8F] flex items-center justify-center shadow-lg" style="box-shadow: 0 0 0 3px #FFFDF9;">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <span class="mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2C2623]/90 text-[#FFFDF9] shadow whitespace-nowrap">
          Vị trí của bạn
        </span>
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
  }, [userCoords.lat, userCoords.lng, patrolModeActive, searchRadiusMeters, mapReady]);

  // Bay mượt tới tọa độ khi người dùng bấm Định vị GPS hoặc Chọn vị trí tìm kiếm gần bạn
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !focusCoordsTrigger) return;
    map.flyTo({
      center: [focusCoordsTrigger.lng, focusCoordsTrigger.lat],
      zoom: 14.2,
      duration: 850,
    });
  }, [focusCoordsTrigger, mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const fuzzSource = map.getSource('spot-fuzz-200m-source');
    if (selectedSpot && isSpotPinAllowedOnMap(selectedSpot)) {
      if (fuzzSource) {
        fuzzSource.setData(
          createGeoCirclePolygon(
            selectedSpot.publicLng,
            selectedSpot.publicLat,
            selectedSpot.fuzzRadiusMeters || 200
          )
        );
      }
      map.flyTo({
        center: [selectedSpot.publicLng, selectedSpot.publicLat],
        zoom: Math.max(map.getZoom(), 14.6),
        duration: 850,
      });
    } else if (fuzzSource) {
      fuzzSource.setData(createGeoCirclePolygon(userCoords.lng, userCoords.lat, 0));
    }
  }, [selectedSpot, mapReady, userCoords.lat, userCoords.lng]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    spotMarkersRef.current.forEach((m) => m.remove());
    spotMarkersRef.current = [];

    const pinnableSpots = spots.filter((s) => isSpotPinAllowedOnMap(s));
    const antiOverlapOffsets = computeAntiOverlapOffsets(
      pinnableSpots.map((s) => ({ lat: s.publicLat, lng: s.publicLng }))
    );
    const showCompactLabels = currentZoom >= 11.4;

    pinnableSpots.forEach((spot, idx) => {
      const dotHex =
        spot.spotType === 'RED_SOS'
          ? '#E63946'
          : spot.spotType === 'ORANGE_SIGHT'
          ? '#E07A5F'
          : spot.spotType === 'YELLOW_ADOPT'
          ? '#F4A261'
          : '#2A9D8F';

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

      const isSelected = selectedSpot?.id === spot.id;
      const isUserPost = isUserWebPost(spot);
      const shortLabel = escapeHtml(getCompactSpotLabel(spot));
      const offsetPair = antiOverlapOffsets[idx] || [0, 0];

      const wrapper = document.createElement('div');
      wrapper.style.cursor = 'pointer';

      if (spot.entityCategory === 'RESCUE_CENTER') {
        wrapper.style.zIndex = isSelected ? '60' : '30';
        const labelVisibilityClass =
          showCompactLabels || isSelected
            ? 'flex'
            : 'hidden group-hover:flex';

        wrapper.innerHTML = `
          <div class="relative flex flex-col items-center group" title="${escapeHtml(spot.title)} (${distText})">
            <div
              class="relative w-[34px] h-[34px] rounded-[11px] flex items-center justify-center shadow-md transition-transform duration-150 group-hover:scale-110"
              style="background: linear-gradient(145deg, #2A9D8F 0%, #1B7268 100%); box-shadow: 0 3px 10px rgba(42,157,143,0.45), 0 0 0 2px #FFFDF9;"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z" fill="#FFFDF9"/>
                <path d="M12 18.2s-3.6-2.2-3.6-4.6c0-1.2.9-2.1 2-2.1.7 0 1.3.4 1.6.9.3-.5.9-.9 1.6-.9 1.1 0 2 .9 2 2.1 0 2.4-3.6 4.6-3.6 4.6z" fill="#E63946"/>
              </svg>
            </div>
            <div
              class="${labelVisibilityClass} mt-0.5 px-1.5 py-0.5 rounded-md shadow-sm items-center gap-1 whitespace-nowrap"
              style="background-color: #2A9D8F; color: #FFFFFF;"
            >
              <span class="text-[10px] font-bold max-w-[120px] truncate">${shortLabel} • ${distText}</span>
            </div>
          </div>
        `;

        wrapper.addEventListener('mouseenter', () => {
          wrapper.style.zIndex = '65';
        });
        wrapper.addEventListener('mouseleave', () => {
          wrapper.style.zIndex = isSelected ? '60' : '30';
        });
        wrapper.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectSpot(spot);
        });

        const centerMarker = new maplibregl.Marker({
          element: wrapper,
          anchor: 'center',
          offset: offsetPair,
        })
          .setLngLat([spot.publicLng, spot.publicLat])
          .addTo(map);
        spotMarkersRef.current.push(centerMarker);
        return;
      }

      wrapper.style.zIndex = isSelected
        ? '60'
        : spot.spotType === 'RED_SOS'
        ? '35'
        : '25';
      const labelVisibilityClass =
        showCompactLabels || isSelected
          ? 'flex'
          : 'hidden group-hover:flex';

      wrapper.innerHTML = `
        <div class="relative flex flex-col items-center group" title="${escapeHtml(spot.title)} (${distText})">
          <div class="relative flex items-center justify-center" style="width: 38px; height: 38px;">
            <span
              class="dom-marker-ring"
              style="width: 42px; height: 42px; background-color: ${dotHex};"
            ></span>
            <div
              class="relative w-9 h-9 rounded-full p-0.5 shadow-md transition-transform duration-150 group-hover:scale-110 ${
                spot.spotType === 'RED_SOS' ? 'dom-marker-core-sos' : ''
              }"
              style="background-color: ${dotHex}; box-shadow: 0 3px 10px ${dotHex}66, 0 0 0 2px #FFFDF9;"
            >
              <img
                src="${escapeHtml(spot.images[0] || '')}"
                alt="${escapeHtml(spot.breed)}"
                referrerpolicy="no-referrer"
                class="w-full h-full object-cover rounded-full"
              />
              <span
                class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow"
                style="background-color: ${isUserPost ? '#2A9D8F' : dotHex};"
              >
                ${
                  isUserPost
                    ? 'W'
                    : spot.spotType === 'RED_SOS'
                    ? '!'
                    : spot.spotType === 'GREEN_PEACE'
                    ? '✓'
                    : '✦'
                }
              </span>
            </div>
          </div>
          <div
            class="${labelVisibilityClass} mt-0.5 px-1.5 py-0.5 rounded-full shadow-sm backdrop-blur-md items-center gap-1 whitespace-nowrap"
            style="background-color: ${theme.frostedBg}; color: ${theme.textHex};"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background-color: ${dotHex};"></span>
            <span class="text-[10px] font-bold max-w-[110px] truncate">${shortLabel} • ${distText}</span>
          </div>
        </div>
      `;

      wrapper.addEventListener('mouseenter', () => {
        wrapper.style.zIndex = '65';
      });
      wrapper.addEventListener('mouseleave', () => {
        wrapper.style.zIndex = isSelected
          ? '60'
          : spot.spotType === 'RED_SOS'
          ? '35'
          : '25';
      });
      wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectSpot(spot);
      });

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'center',
        offset: offsetPair,
      })
        .setLngLat([spot.publicLng, spot.publicLat])
        .addTo(map);

      spotMarkersRef.current.push(marker);
    });
  }, [
    spots,
    selectedSpot?.id,
    currentZoom,
    userCoords.lat,
    userCoords.lng,
    theme.frostedBg,
    theme.textHex,
    mapReady,
    onSelectSpot,
  ]);

  // 6. Render các Bệnh viện / Phòng khám Thú Y Cấp Cứu 24/7 dạng ghim nhỏ gọn (không tràn chữ)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreglRef.current;
    if (!map || !maplibregl || !mapReady) return;

    vetMarkersRef.current.forEach((m) => m.remove());
    vetMarkersRef.current = [];

    if (!showVetStations) return;

    vetStations.forEach((vet) => {
      const shortVetName = vet.name
        .replace(/^Bệnh viện Thú y\s+/i, 'BV ')
        .replace(/^Phòng khám Thú y\s+/i, 'PK ')
        .replace(/^Trung tâm Thú y\s+/i, 'TT ');

      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.zIndex = '18';
      el.innerHTML = `
        <div
          class="relative flex flex-col items-center group"
          title="${escapeHtml(`${vet.name} • ${vet.address}${vet.hotline ? ` • Hotline: ${vet.hotline}` : ''}`)}"
        >
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
            style="background-color: #0F766E; color: #FFFFFF; box-shadow: 0 2px 8px rgba(15,118,110,0.45), 0 0 0 2px #FFFDF9;"
          >
            <span class="text-xs leading-none">🏥</span>
          </div>
          <span
            class="mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-sm max-w-[86px] truncate whitespace-nowrap"
            style="background-color: #0F766E; color: #FFFFFF;"
          >
            ${escapeHtml(shortVetName)}
          </span>
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
        anchor: 'center',
      })
        .setLngLat([vet.lng, vet.lat])
        .addTo(map);

      vetMarkersRef.current.push(marker);
    });
  }, [showVetStations, vetStations, mapReady]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut({ duration: 300 });
  };

  const handleCenterOnUser = () => {
    onRequestRealGps();
    mapInstanceRef.current?.flyTo({
      center: [userCoords.lng, userCoords.lat],
      zoom: 14.5,
      duration: 800,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full transition-all duration-500"
        style={{
          filter: mapLayerMode === 'roadmap' ? theme.mapTileFilter : 'none',
        }}
      />

      <div className="fixed right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-xl transition-transform active:scale-90"
          style={{ backgroundColor: theme.frostedBg, color: theme.textHex }}
          title="Phóng to bản đồ"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-xl transition-transform active:scale-90"
          style={{ backgroundColor: theme.frostedBg, color: theme.textHex }}
          title="Thu nhỏ bản đồ"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() =>
            setMapLayerMode((m) => (m === 'roadmap' ? 'hybrid' : 'roadmap'))
          }
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-xl transition-transform active:scale-90"
          style={{
            backgroundColor:
              mapLayerMode === 'hybrid' ? '#E07A5F' : theme.frostedBg,
            color: mapLayerMode === 'hybrid' ? '#FFFFFF' : theme.textHex,
          }}
          title="Chuyển đổi Bản đồ Đường phố / Vệ tinh"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleCenterOnUser}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-xl transition-transform active:scale-90"
          style={{ backgroundColor: theme.frostedBg, color: '#2A9D8F' }}
          title="Định vị GPS của bạn"
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onStepPatrolWalk()}
          className="w-9 h-9 rounded-full flex items-center justify-center shadow-md backdrop-blur-xl transition-transform active:scale-90"
          style={{
            backgroundColor: patrolModeActive ? '#2A9D8F' : theme.frostedBg,
            color: patrolModeActive ? '#FFFFFF' : theme.textHex,
          }}
          title="Đi dạo tuần tra quanh 500m"
        >
          <Footprints className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
