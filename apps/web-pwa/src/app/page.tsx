'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import DomNhoHeader from '@/components/navigation/DomNhoHeader';
import MobileBottomNav from '@/components/navigation/MobileBottomNav';
import ExploreView from '@/components/explore/ExploreView';
import FullMapView from '@/components/map/FullMapView';
import SpotDetailModal from '@/components/modals/SpotDetailModal';
import StoryDetailModal from '@/components/modals/StoryDetailModal';
import LocationPickerModal from '@/components/modals/LocationPickerModal';
import FilterModal from '@/components/modals/FilterModal';
import CameraQuickModal from '@/components/camera-modal/CameraQuickModal';
import ProfileMemoryModal from '@/components/modals/ProfileMemoryModal';
import GoogleMapsVaultModal from '@/components/modals/GoogleMapsVaultModal';
import DoubleMatchAlertModal from '@/components/modals/DoubleMatchAlertModal';
import ZeroVerifyAuthModal from '@/components/modals/ZeroVerifyAuthModal';
import IosInstallPrompt from '@/components/ios-prompt/IosInstallPrompt';
import {
  DomSpot,
  MainTab,
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
  isSpotPinAllowedOnMap,
} from '@/lib/spot-validation';

const REAL_SPOTS_STORAGE_KEY = 'dom_nho_real_verified_spots_v8';
const SAVED_GMAPS_STORAGE_KEY = 'dom_nho_saved_gmaps_places_v8';
const MEMORY_STORAGE_KEY = 'dom_nho_real_memories_v8';
const SAVED_SPOT_IDS_KEY = 'dom_nho_saved_spot_ids_v1';

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
  'dom_nho_real_verified_spots_v7',
  'dom_nho_saved_gmaps_places_v7',
  'dom_nho_real_memories_v7',
];

export default function DomNhoHomePage() {
  const [mainTab, setMainTab] = useState<MainTab>('explore');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('ALL');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('ALL');
  const [spots, setSpots] = useState<DomSpot[]>(INITIAL_DOM_SPOTS);
  const [vetStations, setVetStations] = useState<VetStation[]>(
    VET_EMERGENCY_STATIONS
  );
  const [savedPlaces, setSavedPlaces] = useState<SavedGoogleMapPlace[]>(
    SAVED_GOOGLE_MAPS_PLACES
  );
  const [memorySnaps, setMemorySnaps] =
    useState<MemorySnap[]>(INITIAL_MEMORY_SNAPS);
  const [savedSpotIds, setSavedSpotIds] = useState<Set<string>>(new Set());
  const [isUpdatingFeed, setIsUpdatingFeed] = useState<boolean>(false);

  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [patrolModeActive, setPatrolModeActive] = useState<boolean>(true);
  const [selectedSpot, setSelectedSpot] = useState<DomSpot | null>(null);

  const [isStoryModalOpen, setIsStoryModalOpen] = useState<boolean>(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
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

  const [toastBanner, setToastBanner] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);

  const {
    coords,
    setCoords,
    isLocating,
    requestCurrentGps,
    setCustomLocation,
  } = useGeolocation(patrolModeActive);
  const { triggerWebPushAlert, requestPushPermission } = usePushNotification();

  const showToast = useCallback((title: string, subtitle: string) => {
    setToastBanner({ title, subtitle });
    window.setTimeout(() => {
      setToastBanner((curr) => (curr?.title === title ? null : curr));
    }, 4500);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    LEGACY_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));

    const savedRealSpots = window.localStorage.getItem(REAL_SPOTS_STORAGE_KEY);
    if (savedRealSpots) {
      try {
        const parsed = filterTrustedSpots(JSON.parse(savedRealSpots) as DomSpot[]);
        if (parsed.length > 0) {
          const specIds = new Set(INITIAL_DOM_SPOTS.slice(0, 2).map((s) => s.id));
          const merged = [
            ...INITIAL_DOM_SPOTS.slice(0, 2),
            ...parsed.filter((s) => !specIds.has(s.id)),
          ];
          setSpots(merged);
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

    const storedSavedIds = window.localStorage.getItem(SAVED_SPOT_IDS_KEY);
    if (storedSavedIds) {
      try {
        const parsed = JSON.parse(storedSavedIds);
        if (Array.isArray(parsed)) {
          setSavedSpotIds(new Set(parsed));
        }
      } catch {
        window.localStorage.removeItem(SAVED_SPOT_IDS_KEY);
      }
    }

    loadPermanentSession().then((session) => {
      if (session) {
        setUserSession(session);
        setPatrolModeActive(session.patrolModeActive);
      }
    });
  }, []);

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

  const handleToggleSaveSpot = useCallback((spot: DomSpot) => {
    setSavedSpotIds((prev) => {
      const next = new Set(prev);
      const isCurrentlySaved = next.has(spot.id);
      if (isCurrentlySaved) {
        next.delete(spot.id);
        showToast('Đã bỏ lưu tin', `Đã gỡ bài viết "${spot.title}" khỏi mục Đã lưu.`);
      } else {
        next.add(spot.id);
        showToast('Đã lưu bài viết', `Đã thêm "${spot.title}" vào danh sách quan tâm của bạn.`);
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          SAVED_SPOT_IDS_KEY,
          JSON.stringify(Array.from(next))
        );
      }
      return next;
    });
  }, [showToast]);

  const handleRequestUserGpsWithToast = useCallback(() => {
    requestCurrentGps(
      (resolved) => {
        showToast(
          'Đã nhận vị trí thực tế của bạn',
          `${resolved.label} (Độ chính xác ±${resolved.accuracyMeters}m)`
        );
      },
      (reason) => {
        showToast('Gợi ý định vị', reason);
        setIsLocationPickerOpen(true);
      }
    );
  }, [requestCurrentGps, showToast]);

  const handleSelectPresetLocation = useCallback(
    (lat: number, lng: number, label: string) => {
      setCustomLocation(lat, lng, label);
      setIsLocationPickerOpen(false);
      showToast('Đã đổi khu vực', `Đang ưu tiên tin tức cứu trợ quanh ${label}`);
    },
    [setCustomLocation, showToast]
  );

  const handleTriggerLiveCrawl = useCallback(
    async (targetPlatform: PlatformFilter = 'ALL', isAuto: boolean = false) => {
      setIsUpdatingFeed(true);
      if (!isAuto) {
        showToast(
          'Đang cập nhật tin mới...',
          'Hệ thống đang kết nối dữ liệu từ cộng đồng và các kênh cứu hộ.'
        );
      }
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
          updateSpotsAndPersist((prev) => {
            const userPosts = prev.filter((s) => s.sourceType === 'USER_POST');
            const specPosts = prev.filter((s) => s.id.startsWith('featured-'));
            const otherUserPosts = userPosts.filter((s) => !s.id.startsWith('featured-'));
            return [...specPosts, ...otherUserPosts, ...trusted];
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
          showToast(
            `Đã cập nhật ${trusted.length} bài viết mới`,
            'Dữ liệu đã được kiểm duyệt và sẵn sàng hỗ trợ.'
          );
        } else if (!isAuto) {
          showToast(
            'Đã đồng bộ đầy đủ',
            data?.error || 'Các trạm cứu trợ hiện đều đã được cập nhật đầy đủ.'
          );
        }
      } catch {
        if (!isAuto) {
          showToast(
            'Không thể kết nối mạng',
            'Vui lòng kiểm tra lại đường truyền internet của bạn.'
          );
        }
      } finally {
        setIsUpdatingFeed(false);
      }
    },
    [updateSpotsAndPersist, showToast]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const AUTO_UPDATE_INTERVAL_MS = 10 * 60 * 1000;
    const lastAutoUpdate = window.sessionStorage.getItem('dom_nho_last_auto_update');
    const now = Date.now();
    if (!lastAutoUpdate || now - Number(lastAutoUpdate) > AUTO_UPDATE_INTERVAL_MS) {
      window.sessionStorage.setItem('dom_nho_last_auto_update', String(now));
      handleTriggerLiveCrawl('ALL', true);
    }
  }, [handleTriggerLiveCrawl]);

  const ensureAuthenticated = useCallback(
    (actionLabel: string, callback: (session: UserSession) => void) => {
      if (userSession) {
        callback(userSession);
        return;
      }
      setPendingAuthAction({ label: actionLabel, callback });
      setIsAuthModalOpen(true);
    },
    [userSession]
  );

  const handleBoostLight = useCallback(
    (spotId: string) => {
      const rateCheck = checkAndIncrementDeviceRateLimit();
      if (!rateCheck.allowed) {
        showToast(
          'Bạn thao tác quá nhanh',
          'Vui lòng chờ giây lát trước khi tiếp tục thắp lửa.'
        );
        return;
      }
      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                lightPower: Math.min(s.lightPower + 40, 300),
                boostCount: (s.boostCount || 0) + 1,
              }
            : s
        )
      );
      showToast(
        'Đã tiếp thêm hy vọng',
        'Bài viết đã nhận thêm sự quan tâm từ cộng đồng!'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleCreateNewSpot = useCallback(
    (payload: {
      spotType: SpotType;
      title: string;
      story: string;
      species: 'cat' | 'dog';
      breed: string;
      coatColor: string;
      traits: string[];
      images: string[];
      compressedSizeKB: number;
      allowFoster: boolean;
      hasExactLocation: boolean;
      customAddress: string;
      pinnedLat?: number;
      pinnedLng?: number;
    }) => {
      ensureAuthenticated('Đăng tin tìm kiếm hoặc cứu hộ thú cưng', (session) => {
        const rateCheck = checkAndIncrementDeviceRateLimit();
        if (!rateCheck.allowed) {
          showToast(
            'Giới hạn tạo tin',
            'Bạn đã tạo nhiều tin trong hôm nay. Vui lòng thử lại sau.'
          );
          return;
        }

        const exactLoc = payload.hasExactLocation;
        let coordsToUse = { publicLat: 0, publicLng: 0, fuzzRadiusMeters: 0 };

        if (payload.pinnedLat && payload.pinnedLng) {
          coordsToUse = {
            publicLat: payload.pinnedLat,
            publicLng: payload.pinnedLng,
            fuzzRadiusMeters: 50,
          };
        } else if (exactLoc) {
          coordsToUse = fuzzCoordinates(coords.lat, coords.lng);
        }

        const newSpot: DomSpot = {
          id: `spot-${Date.now()}`,
          authorId: session.id,
          authorName: session.displayName,
          spotType: payload.spotType,
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          title: payload.title,
          story: payload.story,
          species: payload.species,
          breed: payload.breed || 'Chưa rõ giống',
          coatColor: payload.coatColor || 'Chưa rõ màu lông',
          traits: payload.traits,
          images:
            payload.images.length > 0
              ? payload.images
              : [
                  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80',
                ],
          publicLat: coordsToUse.publicLat,
          publicLng: coordsToUse.publicLng,
          fuzzRadiusMeters: coordsToUse.fuzzRadiusMeters,
          areaLabel: payload.customAddress || coords.label,
          formattedAddress: payload.customAddress || coords.label,
          hasExactLocation: exactLoc,
          publishedDate: new Date().toISOString(),
          hoursAgo: 0,
          createdAt: new Date().toISOString(),
          isSavedToGoogleMaps: false,
          lightPower: 120,
          boostCount: 1,
          allowFoster: payload.allowFoster,
          maskedPhone: session.maskedPhone,
          rawPhoneSecret: session.rawPhone,
          sourceType: 'USER_POST',
          sourcePlatform: 'RESCUE_PORTAL',
          isVerified: true,
          sightings: [],
        };

        updateSpotsAndPersist((prev) => [newSpot, ...prev]);
        setIsCameraModalOpen(false);

        if (exactLoc && coordsToUse.publicLat > 0) {
          const matched = findDoubleMatchesWithin3Km(newSpot, spots);
          if (matched.length > 0) {
            setDoubleMatches(matched);
            triggerWebPushAlert(
              'Tìm thấy thông tin trùng khớp quanh bạn!',
              `Có ${matched.length} trường hợp rất giống đặc điểm bé bạn vừa đăng trong bán kính 3km.`
            );
          }
        }

        showToast(
          'Đăng tin thành công',
          `Đã chia sẻ thông tin của bé kèm ${payload.images.length} ảnh đến cộng đồng Đốm Nhỏ.`
        );
      });
    },
    [
      ensureAuthenticated,
      coords,
      spots,
      updateSpotsAndPersist,
      triggerWebPushAlert,
      showToast,
    ]
  );

  const handleUnlockContactOrAdopt = useCallback(
    (
      spot: DomSpot,
      _message: string,
      _requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
    ) => {
      if (!isUserWebPost(spot)) {
        if (spot.sourceUrl && typeof window !== 'undefined') {
          window.open(spot.sourceUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      ensureAuthenticated('Mở thông tin liên hệ', () => {
        updateSpotsAndPersist((prev) =>
          prev.map((s) =>
            s.id === spot.id
              ? { ...s, isContactUnlockedForViewer: true }
              : s
          )
        );
        setSelectedSpot((curr) =>
          curr && curr.id === spot.id
            ? { ...curr, isContactUnlockedForViewer: true }
            : curr
        );
        showToast(
          'Đã kết nối thành công',
          'Bạn đã có thể liên hệ trực tiếp với người chăm sóc bé.'
        );
      });
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
        'Đã cập nhật trạng thái',
        'Bé đã tìm được mái ấm bình yên.'
      );
    },
    [updateSpotsAndPersist, showToast]
  );

  const handleSaveSpotToGoogleMapsVault = useCallback(
    (spot: DomSpot) => {
      if (!isSpotPinAllowedOnMap(spot)) {
        showToast(
          'Chưa có tọa độ bản đồ',
          'Bài viết này hiển thị ở chế độ danh sách khu vực chung.'
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
        'Đã lưu địa điểm',
        `Địa điểm "${spot.formattedAddress || spot.areaLabel}" đã được lưu.`
      );
    },
    [showToast]
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
        `Đã lưu kỷ niệm tuần thứ ${nextWeek}`,
        'Khoảnh khắc của bé đã được ghi nhớ.'
      );
    },
    [memorySnaps.length, coords.label, coords.lat, coords.lng, showToast]
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
            'Đã kết nối cặp đôi',
            `Không gian riêng tư của ${updated.displayName} & ${partnerName} đã được kích hoạt.`
          );
        }
      );
    },
    [ensureAuthenticated, showToast]
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
      return true;
    });
  }, [spots, originFilter, regionFilter, userSession]);

  const handleTabChange = (nextTab: MainTab) => {
    if (nextTab === 'stories') {
      setIsStoryModalOpen(true);
      return;
    }
    if (nextTab === 'profile') {
      setIsProfileModalOpen(true);
      return;
    }
    setMainTab(nextTab);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#142820] flex flex-col font-sans selection:bg-[#E8EFE6] selection:text-[#0E513B]">
      {mainTab !== 'map' && (
        <DomNhoHeader
          activeTab={mainTab}
          onChangeTab={handleTabChange}
          locationLabel={coords.label}
          onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
          onOpenCreatePost={() => setIsCameraModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          userSession={userSession}
        />
      )}

      <main className="flex-1 w-full pb-16 md:pb-0">
        {mainTab === 'map' ? (
          <FullMapView
            spots={spots}
            selectedSpot={selectedSpot}
            onSelectSpot={setSelectedSpot}
            onOpenSpotDetail={(spot) => setSelectedSpot(spot)}
            userCoords={coords}
            onRequestRealGps={handleRequestUserGpsWithToast}
            onBackToExplore={() => setMainTab('explore')}
            onOpenCreatePost={() => setIsCameraModalOpen(true)}
            vetStations={vetStations}
          />
        ) : (
          <ExploreView
            spots={visibleSpots}
            userCoords={coords}
            locationLabel={coords.label}
            onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
            onOpenFullMap={() => setMainTab('map')}
            onOpenStory={() => setIsStoryModalOpen(true)}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            onSelectDetail={(spot) => setSelectedSpot(spot)}
            savedSpotIds={savedSpotIds}
            onToggleSaveSpot={handleToggleSaveSpot}
            regionFilter={regionFilter}
            onChangeRegionFilter={setRegionFilter}
            originFilter={originFilter}
            onChangeOriginFilter={setOriginFilter}
            isSavedView={mainTab === 'saved'}
            onBackToExplore={() => setMainTab('explore')}
            onTriggerUpdate={() => handleTriggerLiveCrawl('ALL')}
            isUpdating={isUpdatingFeed}
          />
        )}
      </main>

      <MobileBottomNav
        activeTab={mainTab}
        onChangeTab={handleTabChange}
        savedCount={savedSpotIds.size}
      />

      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md rounded-2xl px-4 py-3 bg-white border border-[#DDDCD4] shadow-xl flex items-start gap-3 pointer-events-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center shrink-0 mt-0.5">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#142820]">
                {toastBanner.title}
              </p>
              <p className="text-[11px] mt-0.5 leading-snug text-[#52605A]">
                {toastBanner.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StoryDetailModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
      />

      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        currentLabel={coords.label}
        onSelectLocation={handleSelectPresetLocation}
        onRequestGps={handleRequestUserGpsWithToast}
        isLocatingGps={isLocating}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        regionFilter={regionFilter}
        onChangeRegionFilter={setRegionFilter}
        originFilter={originFilter}
        onChangeOriginFilter={setOriginFilter}
        platformFilter={platformFilter}
        onChangePlatformFilter={setPlatformFilter}
        totalResultsCount={visibleSpots.length}
        onResetFilters={() => {
          setRegionFilter('ALL');
          setOriginFilter('ALL');
          setPlatformFilter('ALL');
          setIsFilterModalOpen(false);
        }}
      />

      <SpotDetailModal
        spot={selectedSpot}
        themeId="morning_sun"
        userCoords={coords}
        userSession={userSession}
        onClose={() => setSelectedSpot(null)}
        onBoostLight={handleBoostLight}
        onAddSighting={(spotId, sighting) => {
          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spotId
                ? { ...s, sightings: [sighting, ...(s.sightings || [])] }
                : s
            )
          );
          showToast('Đã gửi thông tin nhìn thấy', 'Cảm ơn bạn đã hỗ trợ tìm kiếm bé!');
        }}
        onUnlockContactRequest={handleUnlockContactOrAdopt}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onSaveSpotToGoogleMapsVault={handleSaveSpotToGoogleMapsVault}
        onFocusSpotOnMap={(spot) => {
          setSelectedSpot(spot);
          setMainTab('map');
        }}
      />

      <CameraQuickModal
        isOpen={isCameraModalOpen}
        themeId="morning_sun"
        userCoords={coords}
        onClose={() => setIsCameraModalOpen(false)}
        onCreateSpot={handleCreateNewSpot}
      />

      <ProfileMemoryModal
        isOpen={isProfileModalOpen}
        themeId="morning_sun"
        userSession={userSession}
        spots={spots}
        memorySnaps={memorySnaps}
        patrolModeActive={patrolModeActive}
        onTogglePatrolMode={() => setPatrolModeActive((v) => !v)}
        onClose={() => setIsProfileModalOpen(false)}
        onRequireAuth={() => {
          setPendingAuthAction({
            label: 'Đăng nhập tài khoản',
            callback: () => setIsProfileModalOpen(true),
          });
          setIsAuthModalOpen(true);
        }}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onAddWeeklyMemorySnap={handleAddWeeklyMemorySnap}
        onActivateEmergencyBoost={(spotId) => {
          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spotId
                ? { ...s, lightPower: 300, isEmergencyBoosted: true }
                : s
            )
          );
          showToast('Đã ưu tiên hiển thị', 'Bài viết đã được đưa lên đầu danh sách.');
        }}
        onLinkPartnerName={handleLinkPartnerName}
      />

      <GoogleMapsVaultModal
        isOpen={isGoogleMapsVaultOpen}
        themeId="morning_sun"
        savedPlaces={savedPlaces}
        spots={spots}
        userCoords={coords}
        onClose={() => setIsGoogleMapsVaultOpen(false)}
        onFocusSpotOnWebMap={(spotId) => {
          if (spotId) {
            const found = spots.find((s) => s.id === spotId);
            if (found) setSelectedSpot(found);
          }
          setMainTab('map');
        }}
        onAddSyncedSpotAndPlace={(newSpot, newPlace) => {
          updateSpotsAndPersist((prev) => [newSpot, ...prev]);
          if (newPlace) {
            setSavedPlaces((prev) => [newPlace, ...prev.filter((p) => p.id !== newPlace.id)]);
          }
          setSelectedSpot(newSpot);
          setMainTab('explore');
        }}
        onTriggerPlatformCrawl={handleTriggerLiveCrawl}
      />

      <DoubleMatchAlertModal
        matches={doubleMatches}
        themeId="morning_sun"
        onClose={() => setDoubleMatches([])}
        onOpenMatchedSpot={(spot) => {
          setSelectedSpot(spot);
          setDoubleMatches([]);
        }}
      />

      <ZeroVerifyAuthModal
        isOpen={isAuthModalOpen}
        themeId="morning_sun"
        pendingActionLabel={pendingAuthAction?.label}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAuthAction(null);
        }}
        onSuccess={(session) => {
          setUserSession(session);
          persistPermanentSession(session);
          setIsAuthModalOpen(false);
          if (pendingAuthAction) {
            pendingAuthAction.callback(session);
            setPendingAuthAction(null);
          }
          showToast('Chào mừng bạn', `Đã đăng nhập với tên ${session.displayName}.`);
        }}
      />

      <IosInstallPrompt
        themeId="morning_sun"
        onEnablePush={requestPushPermission}
      />
    </div>
  );
}
