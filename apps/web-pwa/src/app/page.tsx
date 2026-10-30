'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing } from 'lucide-react';
import DomNhoMapCanvas from '@/components/map/DomNhoMapCanvas';
import TopStatusAndThemeBar, {
  CategoryFilter,
} from '@/components/map/TopStatusAndThemeBar';
import SpotListView from '@/components/list/SpotListView';
import AdoptSwipeSheet from '@/components/swipe-deck/AdoptSwipeSheet';
import SpotDetailModal from '@/components/modals/SpotDetailModal';
import CameraQuickModal from '@/components/camera-modal/CameraQuickModal';
import ProfileMemoryModal from '@/components/modals/ProfileMemoryModal';
import ZeroVerifyAuthModal from '@/components/modals/ZeroVerifyAuthModal';
import DoubleMatchAlertModal from '@/components/modals/DoubleMatchAlertModal';
import GoogleMapsVaultModal from '@/components/modals/GoogleMapsVaultModal';
import NearbySearchModal from '@/components/modals/NearbySearchModal';
import IosInstallPrompt from '@/components/ios-prompt/IosInstallPrompt';
import {
  DomSpot,
  MemorySnap,
  OriginFilter,
  PlatformFilter,
  RegionFilter,
  SavedGoogleMapPlace,
  SightingItem,
  SpotMatchResult,
  SpotType,
  ThemeId,
  UserSession,
  VetStation,
  ViewMode,
  detectRegionFromAddress,
  isUserWebPost,
} from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
import {
  INITIAL_DOM_SPOTS,
  INITIAL_MEMORY_SNAPS,
  SAVED_GOOGLE_MAPS_PLACES,
  VET_EMERGENCY_STATIONS,
} from '@/lib/seed-data';
import {
  calculateDistanceMeters,
  checkAndIncrementDeviceRateLimit,
  findDoubleMatchesWithin3Km,
  fuzzCoordinates,
} from '@/lib/security';
import {
  loadPermanentSession,
  persistPermanentSession,
} from '@/lib/supabase';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePushNotification } from '@/hooks/usePushNotification';
import {
  filterTrustedSpots,
  hasSpecificAddress,
  isSpotPinAllowedOnMap,
} from '@/lib/spot-validation';

const THEME_STORAGE_KEY = 'dom_nho_theme_v2';
const REAL_SPOTS_STORAGE_KEY = 'dom_nho_real_verified_spots_v7';
const SAVED_GMAPS_STORAGE_KEY = 'dom_nho_saved_gmaps_places_v7';
const MEMORY_STORAGE_KEY = 'dom_nho_real_memories_v7';

const LEGACY_STORAGE_KEYS = [
  'dom_nho_spots_store_v1',
  'dom_nho_real_crawled_spots_v2',
  'dom_nho_real_crawled_spots_v3',
  'dom_nho_saved_gmaps_places_v3',
  'dom_nho_real_memories_v3',
  'dom_nho_real_verified_spots_v4',
  'dom_nho_saved_gmaps_places_v4',
  'dom_nho_real_memories_v4',
  'dom_nho_real_verified_spots_v5',
  'dom_nho_saved_gmaps_places_v5',
  'dom_nho_real_memories_v5',
  'dom_nho_real_verified_spots_v6',
  'dom_nho_saved_gmaps_places_v6',
  'dom_nho_real_memories_v6',
];

export default function DomNhoHomePage() {
  const [themeId, setThemeId] = useState<ThemeId>('morning_sun');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');
  const [spots, setSpots] = useState<DomSpot[]>(INITIAL_DOM_SPOTS);
  const [vetStations, setVetStations] = useState<VetStation[]>(
    VET_EMERGENCY_STATIONS
  );
  const [savedPlaces, setSavedPlaces] = useState<SavedGoogleMapPlace[]>(
    SAVED_GOOGLE_MAPS_PLACES
  );
  const [memorySnaps, setMemorySnaps] =
    useState<MemorySnap[]>(INITIAL_MEMORY_SNAPS);
  const [activeFilter, setActiveFilter] = useState<SpotType | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [patrolModeActive, setPatrolModeActive] = useState<boolean>(true);
  const [showVetStations, setShowVetStations] = useState<boolean>(false);
  const [isCrawlingLive, setIsCrawlingLive] = useState<boolean>(false);
  const [searchRadiusMeters, setSearchRadiusMeters] = useState<number>(10000);
  const [isNearbySearchOpen, setIsNearbySearchOpen] = useState<boolean>(false);
  const [focusCoordsTrigger, setFocusCoordsTrigger] = useState<{
    lat: number;
    lng: number;
    ts: number;
  } | null>(null);

  const [selectedSpot, setSelectedSpot] = useState<DomSpot | null>(null);
  const [isSwipeSheetExpanded, setIsSwipeSheetExpanded] =
    useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isGoogleMapsVaultOpen, setIsGoogleMapsVaultOpen] =
    useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<{
    label: string;
    callback: (session: UserSession) => void;
  } | null>(null);
  const [doubleMatches, setDoubleMatches] = useState<SpotMatchResult[]>([]);
  const [newlyDroppedSpotId, setNewlyDroppedSpotId] = useState<string | null>(
    null
  );
  const [toastBanner, setToastBanner] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  const {
    coords,
    setCoords,
    isLocating,
    gpsError,
    requestCurrentGps,
    setCustomLocation,
  } = useGeolocation(patrolModeActive);
  const { requestPushPermission, triggerWebPushAlert } = usePushNotification();

  const showToast = useCallback((title: string, subtitle: string) => {
    setToastBanner({ title, subtitle });
    window.setTimeout(() => {
      setToastBanner((curr) => (curr?.title === title ? null : curr));
    }, 4500);
  }, []);

  const handleRequestUserGpsWithToast = useCallback(() => {
    requestCurrentGps(
      (resolved) => {
        setFocusCoordsTrigger({
          lat: resolved.lat,
          lng: resolved.lng,
          ts: Date.now(),
        });
        showToast(
          '📍 Đã Lấy Vị Trí Thực Tế Của Bạn!',
          `${resolved.label} (Sai số ±${resolved.accuracyMeters}m)`
        );
      },
      (reason) => {
        showToast('💡 Gợi ý định vị gần bạn', reason);
        setIsNearbySearchOpen(true);
      }
    );
  }, [requestCurrentGps, showToast]);

  const handleChangeRegionFilter = useCallback(
    (nextRegion: RegionFilter) => {
      setRegionFilter(nextRegion);
      if (nextRegion === 'SOUTH') {
        setFocusCoordsTrigger({ lat: 10.7769, lng: 106.7009, ts: Date.now() });
        showToast(
          '🌴 Khu Vực: Miền Nam',
          'Đang ưu tiên các bài cứu trợ tại TP.HCM & các tỉnh phía Nam.'
        );
      } else if (nextRegion === 'CENTRAL') {
        setFocusCoordsTrigger({ lat: 16.0544, lng: 108.2022, ts: Date.now() });
        showToast(
          '🌊 Khu Vực: Miền Trung',
          'Đang ưu tiên các bài cứu trợ tại Đà Nẵng, Huế & miền Trung.'
        );
      } else if (nextRegion === 'NORTH') {
        setFocusCoordsTrigger({ lat: 21.0285, lng: 105.8542, ts: Date.now() });
        showToast(
          '🏞️ Khu Vực: Miền Bắc',
          'Đang ưu tiên các bài cứu trợ tại Hà Nội & các tỉnh phía Bắc.'
        );
      } else {
        showToast(
          '🌏 Khu Vực: Toàn Quốc',
          'Hiển thị tất cả bài viết cứu trợ trên toàn quốc.'
        );
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    LEGACY_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));

    const savedTheme = window.localStorage.getItem(
      THEME_STORAGE_KEY
    ) as ThemeId | null;
    if (savedTheme && DOM_THEMES[savedTheme]) {
      setThemeId(savedTheme);
    }

    const savedRealSpots = window.localStorage.getItem(REAL_SPOTS_STORAGE_KEY);
    if (savedRealSpots) {
      try {
        const parsed = filterTrustedSpots(JSON.parse(savedRealSpots) as DomSpot[]);
        if (parsed.length > 0) {
          setSpots(parsed);
        }
      } catch {
        window.localStorage.removeItem(REAL_SPOTS_STORAGE_KEY);
      }
    }

    const savedGmaps = window.localStorage.getItem(SAVED_GMAPS_STORAGE_KEY);
    if (savedGmaps) {
      try {
        const parsed = JSON.parse(savedGmaps) as SavedGoogleMapPlace[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedPlaces(parsed);
        }
      } catch {
        window.localStorage.removeItem(SAVED_GMAPS_STORAGE_KEY);
      }
    }

    loadPermanentSession().then((session) => {
      if (session) {
        setUserSession(session);
        setPatrolModeActive(session.patrolModeActive);
      }
    });
  }, []);

  const handleTriggerLiveCrawl = useCallback(
    async (targetPlatform: PlatformFilter = 'ALL') => {
      setIsCrawlingLive(true);
      const platformText =
        targetPlatform === 'ALL'
          ? 'Facebook, Instagram, Threads, TikTok, Trạm Cứu Hộ & Báo chí'
          : targetPlatform;
      showToast(
        'Đang cập nhật tin mới đa nền tảng...',
        `Đang thu thập & kiểm chứng địa chỉ thực tế từ ${platformText} qua Gemini 2.5 Flash.`
      );
      try {
        const res = await fetch('/api/crawl-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlatform }),
        });
        const data = await res.json();
        const trusted = Array.isArray(data.spots)
          ? filterTrustedSpots(data.spots)
          : [];
        if (data.ok && trusted.length > 0) {
          setSpots((prev) => {
            const userPosts = prev.filter((s) => s.sourceType === 'USER_POST');
            const next = [...userPosts, ...trusted];
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(
                REAL_SPOTS_STORAGE_KEY,
                JSON.stringify(next)
              );
            }
            return next;
          });
          if (
            Array.isArray(data.savedGoogleMapsPlaces) &&
            data.savedGoogleMapsPlaces.length > 0
          ) {
            setSavedPlaces((prev) => {
              const incoming = data.savedGoogleMapsPlaces as SavedGoogleMapPlace[];
              const existingIds = new Set(incoming.map((p) => p.id));
              const merged = [
                ...incoming,
                ...prev.filter((p) => !existingIds.has(p.id)),
              ];
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(
                  SAVED_GMAPS_STORAGE_KEY,
                  JSON.stringify(merged)
                );
              }
              return merged;
            });
          }
          if (Array.isArray(data.vetStations) && data.vetStations.length > 0) {
            setVetStations(data.vetStations);
          }
          const pinnedCount = trusted.filter(isSpotPinAllowedOnMap).length;
          const listOnlyCount = trusted.length - pinnedCount;
          showToast(
            `Đã cập nhật ${trusted.length} bài viết thực tế`,
            `${pinnedCount} bài có địa chỉ cụ thể ghim trên Bản đồ • ${listOnlyCount} bài khu vực chung hiển thị trong Danh sách.`
          );
        } else {
          showToast(
            'Chưa có tin mới',
            data?.error || 'Không tìm thấy bài viết mới nào đạt yêu cầu kiểm chứng.'
          );
        }
      } catch {
        showToast(
          'Không thể cập nhật lúc này',
          'Vui lòng kiểm tra kết nối mạng và thử lại sau.'
        );
      } finally {
        setIsCrawlingLive(false);
      }
    },
    [showToast]
  );

  const handleChangeTheme = (nextTheme: ThemeId) => {
    setThemeId(nextTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      document.documentElement.style.setProperty(
        '--dom-bg',
        DOM_THEMES[nextTheme].bgHex
      );
      document.documentElement.style.setProperty(
        '--dom-text',
        DOM_THEMES[nextTheme].textHex
      );
    }
  };

  const updateSpotsAndPersist = useCallback(
    (updater: (prev: DomSpot[]) => DomSpot[]) => {
      setSpots((prev) => {
        const next = updater(prev);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            REAL_SPOTS_STORAGE_KEY,
            JSON.stringify(next)
          );
        }
        return next;
      });
    },
    []
  );

  const handleSaveSpotToGoogleMapsVault = useCallback(
    (spot: DomSpot) => {
      if (!isSpotPinAllowedOnMap(spot)) {
        showToast(
          'Chưa có địa chỉ cụ thể để ghim bản đồ',
          'Bài viết này chỉ có thông tin khu vực chung nên được hiển thị trong chế độ Danh sách.'
        );
        return;
      }

      const gmapUrl =
        spot.googleMapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${spot.publicLat},${spot.publicLng}`;

      const newPlace: SavedGoogleMapPlace = {
        id: `gmap-place-${spot.id}`,
        spotId: spot.id,
        title: spot.title,
        address: spot.formattedAddress || spot.areaLabel,
        lat: spot.publicLat,
        lng: spot.publicLng,
        googleMapsUrl: gmapUrl,
        sourcePlatform: spot.sourcePlatform || 'GOOGLE_MAPS',
        sourceUrl: spot.sourceUrl || gmapUrl,
        savedAt: new Date().toISOString(),
        notes: spot.story,
      };

      setSavedPlaces((prev) => {
        const filtered = prev.filter((p) => p.id !== newPlace.id);
        const updated = [newPlace, ...filtered];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            SAVED_GMAPS_STORAGE_KEY,
            JSON.stringify(updated)
          );
        }
        return updated;
      });

      showToast(
        'Đã Lưu Địa Điểm Vào Kho Google Maps',
        `Địa điểm "${spot.formattedAddress || spot.areaLabel}" đã được lưu.`
      );
    },
    [showToast]
  );

  const handleAddSyncedSpotAndPlace = useCallback(
    (newSpot: DomSpot, newPlace: SavedGoogleMapPlace | null) => {
      updateSpotsAndPersist((prev) => [newSpot, ...prev]);
      if (newPlace) {
        setSavedPlaces((prev) => {
          const updated = [newPlace, ...prev];
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              SAVED_GMAPS_STORAGE_KEY,
              JSON.stringify(updated)
            );
          }
          return updated;
        });
        setSelectedSpot(newSpot);
        showToast(
          'Đã Liên Kết Địa Điểm Google Maps Với Web!',
          `Đã lưu "${newPlace.title}" và ghim trực tiếp lên bản đồ.`
        );
      } else {
        setViewMode('list');
        setSelectedSpot(newSpot);
        showToast(
          'Đã Lưu Bài Viết Vào Giao Diện Danh Sách',
          'Bài viết chưa có địa chỉ số nhà/tên đường cụ thể nên không gán tọa độ ảo lên Bản đồ.'
        );
      }
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleFocusSpotOnWebMap = useCallback(
    (spotId?: string, lat?: number, lng?: number) => {
      setViewMode('map');
      if (spotId) {
        const found = spots.find((s) => s.id === spotId);
        if (found) {
          setSelectedSpot(found);
          if (isSpotPinAllowedOnMap(found)) {
            setFocusCoordsTrigger({
              lat: found.publicLat,
              lng: found.publicLng,
              ts: Date.now(),
            });
          }
          return;
        }
      }
      if (typeof lat === 'number' && typeof lng === 'number') {
        setCoords((prev) => ({
          ...prev,
          lat,
          lng,
          label: 'Địa điểm đã lưu trên Google Maps',
        }));
        setFocusCoordsTrigger({ lat, lng, ts: Date.now() });
      }
    },
    [spots, setCoords]
  );

  const visibleSpots = useMemo(() => {
    return spots.filter((s) => {
      if (s.lightPower <= 0 || s.status === 'FADED') return false;
      if (
        s.status === 'SHADOWBANNED' &&
        (!userSession || s.authorId !== userSession.id)
      ) {
        return false;
      }
      if (originFilter === 'USER_POST' && !isUserWebPost(s)) {
        return false;
      }
      if (originFilter === 'EXTERNAL' && isUserWebPost(s)) {
        return false;
      }
      if (regionFilter !== 'ALL') {
        const spotRegion = detectRegionFromAddress(
          s.formattedAddress || s.areaLabel,
          s.publicLat
        );
        if (spotRegion !== 'ALL' && spotRegion !== regionFilter) {
          return false;
        }
      }
      if (
        categoryFilter !== 'ALL' &&
        (s.entityCategory || 'INDIVIDUAL_PET') !== categoryFilter
      ) {
        return false;
      }
      if (activeFilter !== 'ALL' && s.spotType !== activeFilter) {
        return false;
      }
      return true;
    });
  }, [spots, originFilter, regionFilter, activeFilter, categoryFilter, userSession]);

  const mapPinnedSpots = useMemo(() => {
    return visibleSpots.filter(isSpotPinAllowedOnMap);
  }, [visibleSpots]);

  const totalMapPinsCount = useMemo(() => {
    return spots.filter(isSpotPinAllowedOnMap).length;
  }, [spots]);

  const nearbySpots = useMemo(() => {
    return spots.filter((s) => {
      if (!isSpotPinAllowedOnMap(s)) return false;
      const d = calculateDistanceMeters(
        coords.lat,
        coords.lng,
        s.publicLat,
        s.publicLng
      );
      return d <= searchRadiusMeters && s.lightPower > 0;
    });
  }, [spots, coords.lat, coords.lng, searchRadiusMeters]);

  const handlePatrolWalkStep = useCallback(
    (_targetLat?: number, _targetLng?: number) => {
      requestCurrentGps(
        (resolved) => {
          const within500 = spots
            .filter(
              (s) =>
                isSpotPinAllowedOnMap(s) &&
                s.entityCategory !== 'RESCUE_CENTER' &&
                s.lightPower > 0
            )
            .map((s) => ({
              s,
              d: calculateDistanceMeters(
                resolved.lat,
                resolved.lng,
                s.publicLat,
                s.publicLng
              ),
            }))
            .filter((x) => x.d <= 500)
            .sort((a, b) => a.d - b.d);

          if (within500.length > 0) {
            const nearest = within500[0];
            const msg = `Cách bạn ${nearest.d}m: ${nearest.s.title}`;
            showToast(
              `Có ${within500.length} tín hiệu trong 500m quanh bạn`,
              msg
            );
            triggerWebPushAlert('Đốm Nhỏ • Tín hiệu quanh 500m', msg);
          } else {
            showToast(
              'Radar 500m',
              'Hiện chưa có tín hiệu nào trong bán kính 500m quanh bạn.'
            );
          }
        },
        (reason) => showToast('Không lấy được vị trí GPS', reason)
      );
    },
    [spots, requestCurrentGps, showToast, triggerWebPushAlert]
  );

  const ensureAuthenticated = useCallback(
    (label: string, action: (session: UserSession) => void) => {
      if (userSession) {
        action(userSession);
        return;
      }
      setPendingAuthAction({ label, callback: action });
      setIsAuthModalOpen(true);
    },
    [userSession]
  );

  const handleBoostLight = useCallback(
    (spotId: string) => {
      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                lightPower: Math.min(500, s.lightPower + 15),
                boostCount: s.boostCount + 1,
              }
            : s
        )
      );
      setSelectedSpot((curr) =>
        curr && curr.id === spotId
          ? {
              ...curr,
              lightPower: Math.min(500, curr.lightPower + 15),
              boostCount: curr.boostCount + 1,
            }
          : curr
      );
      showToast(
        'Đã Truyền Lửa Ấm Áp',
        'Đốm sáng vừa được nạp thêm +15% năng lượng.'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleCreateSpot = useCallback(
    (payload: {
      spotType: SpotType;
      title: string;
      story: string;
      species: 'cat' | 'dog';
      breed: string;
      coatColor: string;
      traits: string[];
      imageUrl: string;
      compressedSizeKB: number;
      allowFoster: boolean;
      hasExactLocation: boolean;
      customAddress: string;
    }) => {
      const executeCreate = (session: UserSession) => {
        const rateCheck = checkAndIncrementDeviceRateLimit();
        if (!rateCheck.allowed) {
          showToast('Giới hạn bảo vệ chống Spam', rateCheck.reason || '');
          return;
        }

        const effectiveAddress = payload.customAddress.trim() || coords.label;
        const canPinOnMap =
          payload.hasExactLocation &&
          (coords.isRealGps || hasSpecificAddress(effectiveAddress));

        const fuzzed = canPinOnMap
          ? fuzzCoordinates(coords.lat, coords.lng)
          : { publicLat: 0, publicLng: 0, fuzzRadiusMeters: 0 };

        const gmapUrl = canPinOnMap
          ? `https://www.google.com/maps/search/?api=1&query=${fuzzed.publicLat},${fuzzed.publicLng}`
          : '';

        const nowIso = new Date().toISOString();
        const newSpot: DomSpot = {
          id: `dom-${Date.now().toString(36)}`,
          authorId: session.id,
          authorName: session.displayName,
          entityCategory: 'INDIVIDUAL_PET',
          publishedDate: nowIso,
          hasExactLocation: canPinOnMap,
          spotType: payload.spotType,
          status: rateCheck.isShadowbanned ? 'SHADOWBANNED' : 'ACTIVE',
          visibility: 'PUBLIC',
          title: payload.title,
          story: payload.story,
          species: payload.species,
          breed: payload.breed,
          coatColor: payload.coatColor,
          traits: payload.traits,
          images: [payload.imageUrl],
          publicLat: fuzzed.publicLat,
          publicLng: fuzzed.publicLng,
          fuzzRadiusMeters: fuzzed.fuzzRadiusMeters,
          areaLabel: effectiveAddress,
          formattedAddress: canPinOnMap ? effectiveAddress : '',
          googleMapsUrl: gmapUrl,
          googleMapsDirectionsUrl: canPinOnMap
            ? `https://www.google.com/maps/dir/?api=1&destination=${fuzzed.publicLat},${fuzzed.publicLng}&travelmode=two-wheeler`
            : '',
          googleMapsEmbedUrl: canPinOnMap
            ? `https://maps.google.com/maps?q=${fuzzed.publicLat},${fuzzed.publicLng}&hl=vi&z=16&output=embed`
            : '',
          isSavedToGoogleMaps: canPinOnMap,
          lightPower: 100,
          boostCount: 1,
          allowFoster: payload.allowFoster,
          maskedPhone: session.maskedPhone,
          rawPhoneSecret: session.rawPhone,
          sourceType: 'USER_POST',
          sourcePlatform: 'USER_POST',
          sourceUrl: gmapUrl,
          hoursAgo: 0,
          createdAt: nowIso,
          sightings: [],
        };

        updateSpotsAndPersist((prev) => [newSpot, ...prev]);
        setIsCameraModalOpen(false);
        setSelectedSpot(newSpot);

        if (canPinOnMap) {
          const matches = findDoubleMatchesWithin3Km(
            newSpot,
            spots.filter(isSpotPinAllowedOnMap)
          );
          handleSaveSpotToGoogleMapsVault(newSpot);
          setNewlyDroppedSpotId(newSpot.id);

          if (matches.length > 0) {
            setDoubleMatches(matches);
            triggerWebPushAlert(
              'Đốm Nhỏ • Khớp Lệnh Kép Trong 3km!',
              `Phát hiện "${matches[0].matchedSpot.title}" cách ${matches[0].distanceMeters}m có đặc điểm tương đồng!`
            );
          }
        } else {
          setViewMode('list');
          showToast(
            'Đã Đăng Bài Vào Danh Sách',
            'Bài viết của bạn đã hiển thị trong Danh sách (không gán tọa độ ảo lên bản đồ).'
          );
        }
      };

      ensureAuthenticated(
        'Nhập tên gọi 3 giây để đăng bài lên Đốm Nhỏ:',
        executeCreate
      );
    },
    [
      coords.lat,
      coords.lng,
      coords.label,
      coords.isRealGps,
      spots,
      ensureAuthenticated,
      updateSpotsAndPersist,
      handleSaveSpotToGoogleMapsVault,
      showToast,
      triggerWebPushAlert,
    ]
  );

  const handleAddSighting = useCallback(
    (spotId: string, sighting: SightingItem) => {
      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                lightPower: Math.min(500, s.lightPower + 20),
                sightings: [sighting, ...s.sightings],
              }
            : s
        )
      );
      setSelectedSpot((curr) =>
        curr && curr.id === spotId
          ? {
              ...curr,
              lightPower: Math.min(500, curr.lightPower + 20),
              sightings: [sighting, ...curr.sightings],
            }
          : curr
      );
      showToast(
        'Đã Cập Nhật Dấu Vết Mới',
        'Vị trí bắt gặp mới đã được ghim vào hành trình của bé.'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleUnlockContactOrAdopt = useCallback(
    (
      spot: DomSpot,
      _message: string,
      requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
    ) => {
      if (!isUserWebPost(spot)) {
        if (spot.sourceUrl && typeof window !== 'undefined') {
          window.open(spot.sourceUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      ensureAuthenticated(
        'Nhập biệt danh & SĐT để mở khóa liên hệ trực tiếp:',
        () => {
          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spot.id ? { ...s, isContactUnlockedForViewer: true } : s
            )
          );
          setSelectedSpot((curr) =>
            curr && curr.id === spot.id
              ? { ...curr, isContactUnlockedForViewer: true }
              : curr
          );
          showToast(
            'Đã Mở Khóa Liên Hệ Thực Tế',
            `Đã mở thông tin liên hệ (${requestType}) của ${spot.authorName}.`
          );
        }
      );
    },
    [ensureAuthenticated, updateSpotsAndPersist, showToast]
  );

  const handleResolveSpotToPeace = useCallback(
    (spotId: string) => {
      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                spotType: 'GREEN_PEACE',
                status: 'RESOLVED',
                lightPower: 200,
              }
            : s
        )
      );
      setSelectedSpot((curr) =>
        curr && curr.id === spotId
          ? {
              ...curr,
              spotType: 'GREEN_PEACE',
              status: 'RESOLVED',
              lightPower: 200,
            }
          : curr
      );
      showToast(
        'Đã Chuyển Sang Đốm Xanh (Bình Yên)',
        'Địa điểm đã được lưu vào Bản đồ Kỷ niệm.'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleAddWeeklyMemorySnap = useCallback(
    (snapInput: {
      petName: string;
      caption: string;
      moodTag: string;
      weightKg?: number;
      imageUrl: string;
    }) => {
      const nextWeek = memorySnaps.length + 1;
      const newSnap: MemorySnap = {
        id: `mem-${Date.now()}`,
        postId: '',
        petName: snapInput.petName,
        weekNumber: nextWeek,
        imageUrl: snapInput.imageUrl,
        caption: snapInput.caption,
        moodTag: snapInput.moodTag,
        weightKg: snapInput.weightKg,
        sentToRescuer: false,
        rescuerName: '',
        areaLabel: coords.label,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
        createdAt: new Date().toLocaleDateString('vi-VN'),
      };
      setMemorySnaps((prev) => {
        const updated = [newSnap, ...prev];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            MEMORY_STORAGE_KEY,
            JSON.stringify(updated)
          );
        }
        return updated;
      });
      showToast(
        `Đã Lưu Kỷ Niệm Tuần Thứ ${nextWeek}`,
        'Ảnh cập nhật đã được lưu vào nhật ký trưởng thành.'
      );
    },
    [memorySnaps.length, coords.label, coords.lat, coords.lng, showToast]
  );

  const handleActivateEmergencyBoost = useCallback(
    (spotId: string) => {
      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                lightPower: 300,
                isEmergencyBoosted: true,
              }
            : s
        )
      );
      showToast(
        'Đã Kích Hoạt Truyền Lửa Khẩn Cấp (5km)',
        'Đốm Đỏ được ưu tiên hiển thị nổi bật.'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleLinkPartnerName = useCallback(
    (partnerName: string) => {
      ensureAuthenticated(
        'Tạo biệt danh của bạn trước khi ghép đôi Bản đồ Kỷ niệm:',
        (session) => {
          const updated: UserSession = {
            ...session,
            partnerName,
          };
          setUserSession(updated);
          persistPermanentSession(updated);
          showToast(
            'Đã Kết Nối Bản Đồ Kỷ Niệm Cặp Đôi',
            `Không gian riêng tư của ${updated.displayName} & ${partnerName} đã được kích hoạt.`
          );
        }
      );
    },
    [ensureAuthenticated, showToast]
  );

  const activeTheme = DOM_THEMES[themeId];

  return (
    <main
      className="relative w-screen h-[100dvh] overflow-hidden select-none transition-colors duration-700"
      style={{
        backgroundColor: activeTheme.bgHex,
        color: activeTheme.textHex,
      }}
    >
      {viewMode === 'map' ? (
        <DomNhoMapCanvas
          themeId={themeId}
          spots={mapPinnedSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot) => setSelectedSpot(spot)}
          userCoords={coords}
          patrolModeActive={patrolModeActive}
          searchRadiusMeters={searchRadiusMeters}
          focusCoordsTrigger={focusCoordsTrigger}
          onStepPatrolWalk={handlePatrolWalkStep}
          onRequestRealGps={handleRequestUserGpsWithToast}
          onOpenNearbySearch={() => setIsNearbySearchOpen(true)}
          showVetStations={showVetStations}
          vetStations={vetStations}
          newlyDroppedSpotId={newlyDroppedSpotId}
        />
      ) : (
        <SpotListView
          themeId={themeId}
          spots={visibleSpots}
          vetStations={vetStations}
          showVetStations={showVetStations}
          userCoords={coords}
          originFilter={originFilter}
          onChangeOriginFilter={setOriginFilter}
          regionFilter={regionFilter}
          onChangeRegionFilter={handleChangeRegionFilter}
          onSelectSpotDetail={(spot) => setSelectedSpot(spot)}
          onFocusSpotOnMap={(spot) => {
            setViewMode('map');
            setSelectedSpot(spot);
            if (isSpotPinAllowedOnMap(spot)) {
              setFocusCoordsTrigger({
                lat: spot.publicLat,
                lng: spot.publicLng,
                ts: Date.now(),
              });
            }
          }}
          onOpenCameraModal={() => setIsCameraModalOpen(true)}
          onOpenCrawlHub={() => setIsGoogleMapsVaultOpen(true)}
          onBoostLight={handleBoostLight}
        />
      )}

      <TopStatusAndThemeBar
        themeId={themeId}
        onChangeTheme={handleChangeTheme}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        nearby500mCount={nearbySpots.length}
        totalSpotsCount={spots.length}
        mapPinsCount={totalMapPinsCount}
        savedGoogleMapsCount={savedPlaces.length}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        originFilter={originFilter}
        onChangeOriginFilter={setOriginFilter}
        regionFilter={regionFilter}
        onChangeRegionFilter={handleChangeRegionFilter}
        userSession={userSession}
        userLocationLabel={coords.label}
        isRealGps={coords.isRealGps}
        isLocatingGps={isLocating}
        onRequestRealGps={handleRequestUserGpsWithToast}
        onOpenNearbySearchModal={() => setIsNearbySearchOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenGoogleMapsVault={() => setIsGoogleMapsVaultOpen(true)}
        onOpenCameraModal={() => setIsCameraModalOpen(true)}
        showVetStations={showVetStations}
        onToggleVetStations={() => setShowVetStations((v) => !v)}
        isCrawlingLive={isCrawlingLive}
        onTriggerLiveCrawl={() => handleTriggerLiveCrawl('ALL')}
        categoryFilter={categoryFilter}
        onChangeCategoryFilter={setCategoryFilter}
      />

      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md rounded-[24px] px-4 py-3 shadow-xl backdrop-blur-2xl flex items-start gap-3 pointer-events-none"
            style={{
              backgroundColor: activeTheme.frostedSheetBg,
              color: activeTheme.textHex,
            }}
          >
            <span className="w-8 h-8 rounded-full bg-[#E63946]/15 text-[#E63946] flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold">{toastBanner.title}</p>
              <p
                className="text-[11px] mt-0.5 leading-snug"
                style={{ color: activeTheme.mutedTextHex }}
              >
                {toastBanner.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'map' && (
        <AdoptSwipeSheet
          themeId={themeId}
          spots={visibleSpots}
          userCoords={coords}
          isExpanded={isSwipeSheetExpanded}
          onToggleExpand={setIsSwipeSheetExpanded}
          onOpenCameraModal={() => setIsCameraModalOpen(true)}
          onBoostLight={handleBoostLight}
          onRequestAdoptOrFoster={(spot, mode) => {
            setSelectedSpot(spot);
            handleUnlockContactOrAdopt(
              spot,
              mode === 'FOSTER'
                ? 'Mình muốn đăng ký làm Trạm Tạm Trú (Foster) chăm sóc bé!'
                : 'Mình muốn đón bé về nuôi và cam kết Chạm Ảnh Mỗi Tuần!',
              mode === 'FOSTER' ? 'FOSTER_OFFER' : 'ADOPT_REQUEST'
            );
          }}
          onSelectSpotOnMap={(spot) => setSelectedSpot(spot)}
        />
      )}

      <IosInstallPrompt
        themeId={themeId}
        onEnablePush={() => requestPushPermission()}
      />

      <SpotDetailModal
        spot={selectedSpot}
        themeId={themeId}
        userCoords={coords}
        userSession={userSession}
        onClose={() => setSelectedSpot(null)}
        onBoostLight={handleBoostLight}
        onAddSighting={handleAddSighting}
        onUnlockContactRequest={handleUnlockContactOrAdopt}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onSaveSpotToGoogleMapsVault={handleSaveSpotToGoogleMapsVault}
      />

      <GoogleMapsVaultModal
        isOpen={isGoogleMapsVaultOpen}
        themeId={themeId}
        savedPlaces={savedPlaces}
        spots={spots}
        userCoords={coords}
        isCrawlingLive={isCrawlingLive}
        onClose={() => setIsGoogleMapsVaultOpen(false)}
        onFocusSpotOnWebMap={handleFocusSpotOnWebMap}
        onAddSyncedSpotAndPlace={handleAddSyncedSpotAndPlace}
        onTriggerPlatformCrawl={handleTriggerLiveCrawl}
      />

      <NearbySearchModal
        isOpen={isNearbySearchOpen}
        themeId={themeId}
        spots={spots}
        vetStations={vetStations}
        userCoords={coords}
        isLocatingGps={isLocating}
        gpsError={gpsError}
        searchRadiusMeters={searchRadiusMeters}
        onChangeSearchRadius={(r) => setSearchRadiusMeters(r)}
        onRequestRealGps={handleRequestUserGpsWithToast}
        onSelectCustomLocation={(lat, lng, label) => {
          setCustomLocation(lat, lng, label);
          showToast(
            '📍 Đã Cập Nhật Vị Trí Tìm Kiếm Gần Bạn',
            `Đang quét các đốm cứu hộ quanh "${label}".`
          );
        }}
        onSelectSpotOnMap={(spot) => {
          setSelectedSpot(spot);
          if (isSpotPinAllowedOnMap(spot)) {
            setViewMode('map');
            setFocusCoordsTrigger({
              lat: spot.publicLat,
              lng: spot.publicLng,
              ts: Date.now(),
            });
          }
        }}
        onFocusCoordsOnMap={(lat, lng) => {
          setViewMode('map');
          setFocusCoordsTrigger({ lat, lng, ts: Date.now() });
        }}
        onClose={() => setIsNearbySearchOpen(false)}
      />

      <CameraQuickModal
        isOpen={isCameraModalOpen}
        themeId={themeId}
        userCoords={coords}
        onClose={() => setIsCameraModalOpen(false)}
        onCreateSpot={handleCreateSpot}
      />

      <ProfileMemoryModal
        isOpen={isProfileModalOpen}
        themeId={themeId}
        userSession={userSession}
        spots={spots}
        memorySnaps={memorySnaps}
        patrolModeActive={patrolModeActive}
        onTogglePatrolMode={() => setPatrolModeActive((v) => !v)}
        onClose={() => setIsProfileModalOpen(false)}
        onRequireAuth={() => {
          setIsProfileModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onAddWeeklyMemorySnap={handleAddWeeklyMemorySnap}
        onActivateEmergencyBoost={handleActivateEmergencyBoost}
        onLinkPartnerName={handleLinkPartnerName}
      />

      <ZeroVerifyAuthModal
        isOpen={isAuthModalOpen}
        themeId={themeId}
        pendingActionLabel={pendingAuthAction?.label}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={(session) => {
          setUserSession(session);
          setIsAuthModalOpen(false);
          showToast(
            `Chào mừng ${session.displayName} đến với Đốm Nhỏ!`,
            'Tài khoản của bạn đã sẵn sàng.'
          );
          if (pendingAuthAction) {
            const cb = pendingAuthAction.callback;
            setPendingAuthAction(null);
            cb(session);
          }
        }}
      />

      <DoubleMatchAlertModal
        matches={doubleMatches}
        themeId={themeId}
        onClose={() => setDoubleMatches([])}
        onOpenMatchedSpot={(spot) => setSelectedSpot(spot)}
      />
    </main>
  );
}
