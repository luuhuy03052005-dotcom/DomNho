'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import DomNhoHeader from '@/components/navigation/DomNhoHeader';
import DomNhoFooter from '@/components/navigation/DomNhoFooter';
import MobileBottomNav from '@/components/navigation/MobileBottomNav';
import ExploreView from '@/components/explore/ExploreView';
import FullMapView from '@/components/map/FullMapView';
import StoryPageView from '@/components/story/StoryPageView';
import SpotDetailModal from '@/components/modals/SpotDetailModal';
import LocationPickerModal from '@/components/modals/LocationPickerModal';
import FilterModal from '@/components/modals/FilterModal';
import CameraQuickModal from '@/components/camera-modal/CameraQuickModal';
import ProfileMemoryModal, {
  ProfileModalTab,
} from '@/components/modals/ProfileMemoryModal';
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
  detectPlatformFromUrl,
  detectRegionFromAddress,
  isSpotDeletedOrHidden,
  isSpotOwnedByUser,
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
  checkAndIncrementBoostRateLimit,
  checkAndIncrementDeviceRateLimit,
  decrementDeviceRateLimit,
  findDoubleMatchesWithin3Km,
} from '@/lib/security';
import {
  broadcastCommunitySpotRealtime,
  broadcastDeleteSpotRealtime,
  clearPermanentSession,
  linkCouplePartnerInSupabase,
  loadPermanentSession,
  persistPermanentSession,
  subscribeToRealtimeCommunityFeed,
  syncPatrolModeInSupabase,
} from '@/lib/supabase';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePushNotification } from '@/hooks/usePushNotification';
import {
  filterTrustedSpots,
  isSpotPinAllowedOnMap,
} from '@/lib/spot-validation';
import { rankSpotsByVisualSimilarity } from '@/lib/visual-matcher';

const REAL_SPOTS_STORAGE_KEY = 'dom_nho_real_verified_spots_v11';
const SAVED_GMAPS_STORAGE_KEY = 'dom_nho_saved_gmaps_places_v10';
const MEMORY_STORAGE_KEY = 'dom_nho_real_memories_v10';
const SAVED_SPOT_IDS_KEY = 'dom_nho_saved_spot_ids_v1';
const DELETED_SPOT_IDS_KEY = 'dom_nho_deleted_spot_ids_v1';

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
  'dom_nho_real_verified_spots_v8',
  'dom_nho_saved_gmaps_places_v8',
  'dom_nho_real_memories_v8',
  'dom_nho_real_verified_spots_v9',
  'dom_nho_saved_gmaps_places_v9',
  'dom_nho_real_memories_v9',
  'dom_nho_real_verified_spots_v10',
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
  const [detailSpot, setDetailSpot] = useState<DomSpot | null>(null);
  const [editingSpot, setEditingSpot] = useState<DomSpot | null>(null);

  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileInitialTab, setProfileInitialTab] =
    useState<ProfileModalTab>('MY_SPOTS');
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
    tone?: 'success' | 'info' | 'error' | 'processing';
  } | null>(null);

  const exploreScrollYRef = useRef<number>(0);
  const toastTimerRef = useRef<number | null>(null);
  const isSubmittingPostRef = useRef<boolean>(false);
  const deletedSpotIdsRef = useRef<Set<string>>(new Set());

  const {
    coords,
    setCoords,
    isLocating,
    requestCurrentGps,
    setCustomLocation,
  } = useGeolocation(patrolModeActive);
  const {
    permission: notificationPermission,
    platform: notificationPlatform,
    settings: notificationSettings,
    history: notificationHistory,
    updateNotificationSetting,
    clearNotificationHistory,
    triggerWebPushAlert,
    requestPushPermission,
  } = usePushNotification();

  const recordDeletedSpotIds = useCallback((ids: string[]) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    let changed = false;
    for (const id of ids) {
      if (id && !deletedSpotIdsRef.current.has(id)) {
        deletedSpotIdsRef.current.add(id);
        changed = true;
      }
    }
    if (changed && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          DELETED_SPOT_IDS_KEY,
          JSON.stringify(Array.from(deletedSpotIdsRef.current))
        );
      } catch {
        // Ignore storage error
      }
    }
  }, []);

  const showToast = useCallback(
    (
      title: string,
      subtitle: string,
      tone: 'success' | 'info' | 'error' | 'processing' = 'info'
    ) => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToastBanner({ title, subtitle, tone });
      if (tone !== 'processing') {
        toastTimerRef.current = window.setTimeout(() => {
          setToastBanner((curr) => (curr?.title === title ? null : curr));
        }, 4500);
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (
      tabParam === 'map' ||
      tabParam === 'stories' ||
      tabParam === 'saved' ||
      tabParam === 'explore'
    ) {
      setMainTab(tabParam);
    } else if (tabParam === 'profile') {
      setIsProfileModalOpen(true);
    }
    if (params.get('create') === '1') {
      setIsCameraModalOpen(true);
    }

    LEGACY_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));

    const storedDeletedIds = window.localStorage.getItem(DELETED_SPOT_IDS_KEY);
    if (storedDeletedIds) {
      try {
        const parsedDeleted = JSON.parse(storedDeletedIds);
        if (Array.isArray(parsedDeleted)) {
          deletedSpotIdsRef.current = new Set(parsedDeleted.map(String));
        }
      } catch {
        window.localStorage.removeItem(DELETED_SPOT_IDS_KEY);
      }
    }

    const savedRealSpots = window.localStorage.getItem(REAL_SPOTS_STORAGE_KEY);
    if (savedRealSpots) {
      try {
        const parsed = filterTrustedSpots(
          JSON.parse(savedRealSpots) as DomSpot[]
        ).filter((s) => !isSpotDeletedOrHidden(s, deletedSpotIdsRef.current));
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

    const savedMemories = window.localStorage.getItem(MEMORY_STORAGE_KEY);
    if (savedMemories) {
      try {
        const parsed = JSON.parse(savedMemories) as MemorySnap[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemorySnaps(parsed);
        }
      } catch {
        window.localStorage.removeItem(MEMORY_STORAGE_KEY);
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
        const rawNext = updater(prev);
        const seenIds = new Set<string>();
        const next: DomSpot[] = [];
        for (const sp of rawNext) {
          if (!sp || !sp.id || seenIds.has(sp.id)) continue;
          if (isSpotDeletedOrHidden(sp, deletedSpotIdsRef.current)) continue;
          seenIds.add(sp.id);
          next.push(sp);
        }
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              REAL_SPOTS_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch {
            // Bỏ qua nếu vượt hạn mức localStorage (dữ liệu chính lưu trên Supabase)
          }
        }
        return next;
      });
    },
    []
  );

  const syncCommunityFeed = useCallback(
    async (viewerId?: string | null) => {
      try {
        const query = new URLSearchParams({ includeMemories: '1' });
        if (viewerId) query.set('viewerId', viewerId);
        const res = await fetch(`/api/spots?${query.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data?.ok) return;

        if (Array.isArray(data.deletedSpotIds) && data.deletedSpotIds.length > 0) {
          recordDeletedSpotIds(data.deletedSpotIds.map(String));
        }

        if (Array.isArray(data.spots)) {
          const trustedIncoming = filterTrustedSpots(
            data.spots as DomSpot[]
          ).filter((s) => !isSpotDeletedOrHidden(s, deletedSpotIdsRef.current));
          updateSpotsAndPersist((prev) => {
            const incomingIds = new Set(trustedIncoming.map((s) => s.id));
            // Giữ lại các bài crawl thêm từ phiên hiện tại chưa có trong batch đầu
            const extraCrawled = prev.filter(
              (s) =>
                s.sourceType !== 'USER_POST' &&
                !incomingIds.has(s.id) &&
                !isSpotDeletedOrHidden(s, deletedSpotIdsRef.current)
            );
            return [...trustedIncoming, ...extraCrawled];
          });
        }

        if (Array.isArray(data.memorySnaps) && data.memorySnaps.length > 0) {
          setMemorySnaps((prev) => {
            const seen = new Set<string>();
            const merged: MemorySnap[] = [];
            for (const m of [...(data.memorySnaps as MemorySnap[]), ...prev]) {
              if (!m?.id || seen.has(m.id)) continue;
              seen.add(m.id);
              merged.push(m);
            }
            return merged;
          });
        }
      } catch {
        // Giữ danh sách hiện có nếu ngoại tuyến
      }
    },
    [updateSpotsAndPersist]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    syncCommunityFeed(userSession?.id);
  }, [syncCommunityFeed, userSession?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsubscribe = subscribeToRealtimeCommunityFeed(
      (incomingSpot, deletedSpotId) => {
        if (deletedSpotId) {
          recordDeletedSpotIds([deletedSpotId]);
          updateSpotsAndPersist((prev) =>
            prev.filter((s) => s.id !== deletedSpotId)
          );
          setDoubleMatches((prev) =>
            prev.filter((m) => m.matchedSpot.id !== deletedSpotId)
          );
          setSelectedSpot((curr) =>
            curr && curr.id === deletedSpotId ? null : curr
          );
          setDetailSpot((curr) =>
            curr && curr.id === deletedSpotId ? null : curr
          );
          fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SYNC_DELETE_SPOT',
              spotId: deletedSpotId,
            }),
          }).catch(() => null);
          return;
        }

        if (
          incomingSpot &&
          incomingSpot.id &&
          !isSpotDeletedOrHidden(incomingSpot, deletedSpotIdsRef.current)
        ) {
          updateSpotsAndPersist((prev) => [
            incomingSpot,
            ...prev.filter((s) => s.id !== incomingSpot.id),
          ]);
          fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'SYNC_SPOT',
              spot: incomingSpot,
            }),
          }).catch(() => null);
        }
        syncCommunityFeed(userSession?.id);
      }
    );

    const handleFocus = () => {
      syncCommunityFeed(userSession?.id);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncCommunityFeed, updateSpotsAndPersist, userSession?.id]);

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
          'Hệ thống đang kết nối dữ liệu từ cộng đồng và các kênh cứu hộ.',
          'info'
        );
      }
      try {
        const simulateMode =
          typeof window !== 'undefined'
            ? (window as any).__domNhoSimulateCrawlMode || 'NONE'
            : 'NONE';

        const res = await fetch('/api/crawl-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlatform, simulateMode }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          if (!isAuto) {
            showToast(
              'Cập nhật chưa thành công',
              'Không thể tải tin mới lúc này. Đang giữ nguyên danh sách hiện có.',
              'error'
            );
          }
          return;
        }

        const trusted = Array.isArray(data.spots)
          ? filterTrustedSpots(data.spots)
          : [];
        const newlyAddedCount = Number(data.newlyAddedCount || 0);

        if (trusted.length > 0) {
          updateSpotsAndPersist((prev) => {
            const prevMap = new Map(prev.map((s) => [s.id, s]));
            const userPosts = prev.filter((s) => s.sourceType === 'USER_POST');
            const mergedCrawled = trusted.map((sp) => {
              const old = prevMap.get(sp.id);
              if (!old) return sp;
              return {
                ...sp,
                lightPower: Math.max(old.lightPower || 0, sp.lightPower || 0),
                boostCount: Math.max(old.boostCount || 0, sp.boostCount || 0),
                status:
                  old.status === 'RESOLVED' ? 'RESOLVED' : sp.status,
                spotType:
                  old.spotType === 'GREEN_PEACE' ? 'GREEN_PEACE' : sp.spotType,
                isEmergencyBoosted: Boolean(
                  old.isEmergencyBoosted || sp.isEmergencyBoosted
                ),
                isContactUnlockedForViewer: Boolean(
                  old.isContactUnlockedForViewer ||
                    sp.isContactUnlockedForViewer
                ),
                sightings:
                  Array.isArray(old.sightings) && old.sightings.length > 0
                    ? old.sightings
                    : sp.sightings,
              };
            });
            return [...userPosts, ...mergedCrawled];
          });
          if (
            Array.isArray(data.savedGoogleMapsPlaces) &&
            data.savedGoogleMapsPlaces.length > 0
          ) {
            setSavedPlaces((prev) => {
              const incoming =
                data.savedGoogleMapsPlaces as SavedGoogleMapPlace[];
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
        }

        await syncCommunityFeed(userSession?.id);

        if (!isAuto) {
          if (newlyAddedCount > 0) {
            showToast(
              `Đã cập nhật ${newlyAddedCount} tin mới`,
              'Các bài viết mới đã được bổ sung vào danh sách quanh bạn.',
              'success'
            );
          } else {
            showToast(
              'Chưa có thêm tin mới',
              'Danh sách hiện tại đã có đầy đủ các bài viết mới nhất.',
              'info'
            );
          }
        }
      } catch {
        if (!isAuto) {
          showToast(
            'Cập nhật chưa thành công',
            'Không thể kết nối máy chủ cập nhật lúc này. Đang giữ nguyên danh sách hiện có.',
            'error'
          );
        }
      } finally {
        setIsUpdatingFeed(false);
      }
    },
    [updateSpotsAndPersist, syncCommunityFeed, userSession?.id, showToast]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    fetch('/api/crawl-live', { method: 'GET' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.spots)) return;
        const trusted = filterTrustedSpots(data.spots);
        if (trusted.length > 0) {
          updateSpotsAndPersist((prev) => {
            const prevMap = new Map(prev.map((s) => [s.id, s]));
            const userPosts = prev.filter((s) => s.sourceType === 'USER_POST');
            const mergedCrawled = trusted.map((sp) => {
              const old = prevMap.get(sp.id);
              if (!old) return sp;
              return {
                ...sp,
                lightPower: Math.max(old.lightPower || 0, sp.lightPower || 0),
                boostCount: Math.max(old.boostCount || 0, sp.boostCount || 0),
                status:
                  old.status === 'RESOLVED' ? 'RESOLVED' : sp.status,
                spotType:
                  old.spotType === 'GREEN_PEACE' ? 'GREEN_PEACE' : sp.spotType,
                isEmergencyBoosted: Boolean(
                  old.isEmergencyBoosted || sp.isEmergencyBoosted
                ),
                isContactUnlockedForViewer: Boolean(
                  old.isContactUnlockedForViewer ||
                    sp.isContactUnlockedForViewer
                ),
                sightings:
                  Array.isArray(old.sightings) && old.sightings.length > 0
                    ? old.sightings
                    : sp.sightings,
              };
            });
            return [...userPosts, ...mergedCrawled];
          });
        }
      })
      .catch(() => {
        // Keep local seed data if offline
      });
    return () => {
      cancelled = true;
    };
  }, [updateSpotsAndPersist]);

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
    async (spotId: string) => {
      const rateCheck = checkAndIncrementBoostRateLimit(spotId);
      if (!rateCheck.allowed) {
        showToast(
          'Bạn thao tác quá nhanh',
          rateCheck.reason ||
            'Vui lòng chờ giây lát trước khi tiếp tục thắp lửa.'
        );
        return;
      }

      updateSpotsAndPersist((prev) =>
        prev.map((s) =>
          s.id === spotId
            ? {
                ...s,
                lightPower: Math.min(s.lightPower + 20, 500),
                boostCount: (s.boostCount || 0) + 1,
              }
            : s
        )
      );

      setDetailSpot((curr) =>
        curr && curr.id === spotId
          ? {
              ...curr,
              lightPower: Math.min(curr.lightPower + 20, 500),
              boostCount: (curr.boostCount || 0) + 1,
            }
          : curr
      );

      try {
        const res = await fetch('/api/spots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'BOOST_LIGHT',
            spotId,
            delta: 20,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && typeof data.lightPower === 'number') {
          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spotId
                ? {
                    ...s,
                    lightPower: data.lightPower,
                    boostCount: data.boostCount ?? s.boostCount,
                  }
                : s
            )
          );
        }
      } catch {
        // Giữ cập nhật tức thời nếu mạng chậm
      }

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
      species: 'cat' | 'dog' | 'other';
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
      if (isSubmittingPostRef.current) return;

      ensureAuthenticated(
        'Đăng tin tìm kiếm hoặc cứu hộ thú cưng',
        async (session) => {
          if (isSubmittingPostRef.current) return;

          if (!Array.isArray(payload.images) || payload.images.length === 0) {
            showToast(
              'Thiếu hình ảnh thực tế',
              'Vui lòng chụp hoặc tải lên ít nhất 1 bức ảnh thực tế của bé.',
              'error'
            );
            return;
          }

          const accountRateKey = session.rawPhone || session.id;
          const rateCheck = checkAndIncrementDeviceRateLimit(accountRateKey);
          if (!rateCheck.allowed) {
            setIsCameraModalOpen(false);
            setEditingSpot(null);
            showToast(
              'Giới hạn tạo tin',
              rateCheck.reason ||
                'Mỗi tài khoản được đăng tối đa 3 bài/ngày để chống tin rác.',
              'error'
            );
            return;
          }

          // Đóng ngay giao diện đăng tin để người dùng không phải chờ đợi trong modal
          isSubmittingPostRef.current = true;
          setIsCameraModalOpen(false);
          setEditingSpot(null);
          showToast(
            'Đang xử lý bài viết của bạn...',
            'Hệ thống đang lưu ảnh, bảo mật thông tin liên hệ và đồng bộ tin lên cộng đồng.',
            'processing'
          );

          const exactLat = payload.pinnedLat || coords.lat;
          const exactLng = payload.pinnedLng || coords.lng;
          const effectiveAddress = payload.customAddress || coords.label;

          try {
            const res = await fetch('/api/spots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authorId: session.id,
                authorName: session.displayName,
                rawPhone: session.rawPhone,
                pinCode: session.pinCode,
                spotType: payload.spotType,
                title: payload.title,
                story: payload.story,
                species: payload.species,
                breed: payload.breed,
                coatColor: payload.coatColor,
                traits: payload.traits,
                images: payload.images,
                exactLat,
                exactLng,
                hasExactLocation: payload.hasExactLocation,
                areaLabel: effectiveAddress,
                formattedAddress: effectiveAddress,
                allowFoster: payload.allowFoster,
              }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok || !data.spot) {
              decrementDeviceRateLimit(accountRateKey);
              showToast(
                'Không thể đăng tin',
                data?.error ||
                  'Vui lòng kiểm tra kết nối mạng hoặc thông tin bài đăng.',
                'error'
              );
              return;
            }

            const createdSpot: DomSpot = data.spot;

            // Đồng bộ lại ID hồ sơ nếu máy chủ đối chiếu hồ sơ trên Supabase
            if (createdSpot.authorId && createdSpot.authorId !== session.id) {
              const syncedSession: UserSession = {
                ...session,
                id: createdSpot.authorId,
              };
              setUserSession(syncedSession);
              persistPermanentSession(syncedSession);
            }

            updateSpotsAndPersist((prev) => [
              createdSpot,
              ...prev.filter((s) => s.id !== createdSpot.id),
            ]);
            broadcastCommunitySpotRealtime(createdSpot);

            const activePool = spots.filter(
              (s) =>
                s.id !== createdSpot.id &&
                !isSpotDeletedOrHidden(s, deletedSpotIdsRef.current)
            );

            const visualMatches = rankSpotsByVisualSimilarity(
              {
                species: createdSpot.species,
                breed: createdSpot.breed,
                coatColor: createdSpot.coatColor,
                primaryColors: [createdSpot.coatColor],
                coatPattern: '',
                traits: createdSpot.traits,
                suggestedTitle: createdSpot.title,
              },
              activePool,
              createdSpot.publicLat > 0
                ? { lat: createdSpot.publicLat, lng: createdSpot.publicLng }
                : { lat: coords.lat, lng: coords.lng },
              createdSpot.id,
              deletedSpotIdsRef.current
            ).filter((m) => m.matchPercent >= 62);

            const serverMatches = Array.isArray(data.matches)
              ? (data.matches as SpotMatchResult[]).filter(
                  (m) =>
                    m?.matchedSpot &&
                    !isSpotDeletedOrHidden(
                      m.matchedSpot,
                      deletedSpotIdsRef.current
                    )
                )
              : [];

            if (visualMatches.length > 0) {
              const alertMatches: SpotMatchResult[] = visualMatches
                .slice(0, 4)
                .map((m) => ({
                  matchedSpot: m.spot,
                  distanceMeters: m.distanceMeters || 0,
                  similarityScore: m.matchPercent / 100,
                  commonTraits: m.matchReasons,
                }));
              setDoubleMatches(alertMatches);
              triggerWebPushAlert(
                'Phát hiện bài viết trùng khớp!',
                `Có ${alertMatches.length} bài viết có hình ảnh & đặc điểm rất giống bé bạn vừa đăng.`,
                'doubleMatch'
              );
            } else if (serverMatches.length > 0) {
              setDoubleMatches(serverMatches);
              triggerWebPushAlert(
                'Tìm thấy thông tin trùng khớp quanh bạn!',
                `Có ${serverMatches.length} trường hợp rất giống đặc điểm bé bạn vừa đăng trong bán kính 3km.`,
                'doubleMatch'
              );
            } else if (payload.hasExactLocation && createdSpot.publicLat > 0) {
              const matched = findDoubleMatchesWithin3Km(
                createdSpot,
                activePool
              );
              if (matched.length > 0) {
                setDoubleMatches(matched);
                triggerWebPushAlert(
                  'Tìm thấy thông tin trùng khớp quanh bạn!',
                  `Có ${matched.length} trường hợp rất giống đặc điểm bé bạn vừa đăng trong bán kính 3km.`,
                  'doubleMatch'
                );
              }
            }

            showToast(
              'Đăng tin thành công',
              'Bài viết đã được lưu lên hệ thống chung và hiển thị cho mọi người trong cộng đồng Đốm Nhỏ.',
              'success'
            );
            triggerWebPushAlert(
              'Đăng tin thành công',
              `Bài viết "${createdSpot.title}" đã được hiển thị trên cộng đồng Đốm Nhỏ.`,
              'postStatus'
            );
          } catch {
            decrementDeviceRateLimit(accountRateKey);
            showToast(
              'Lỗi kết nối máy chủ',
              'Không thể lưu bài viết lên hệ thống lúc này. Vui lòng thử lại.',
              'error'
            );
          } finally {
            isSubmittingPostRef.current = false;
          }
        }
      );
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

  const handleOpenCreatePost = useCallback(() => {
    setEditingSpot(null);
    setIsCameraModalOpen(true);
  }, []);

  const handleOpenEditSpot = useCallback((spot: DomSpot) => {
    setDetailSpot(null);
    setEditingSpot(spot);
    setIsCameraModalOpen(true);
  }, []);

  const handleUpdateExistingSpot = useCallback(
    (
      spotId: string,
      payload: {
        spotType: SpotType;
        title: string;
        story: string;
        species: 'cat' | 'dog' | 'other';
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
      }
    ) => {
      if (isSubmittingPostRef.current) return;

      ensureAuthenticated(
        'Chỉnh sửa bài đăng của bạn',
        async (session) => {
          if (isSubmittingPostRef.current) return;
          isSubmittingPostRef.current = true;

          // Đóng ngay giao diện chỉnh sửa và hiển thị thông báo đang xử lý
          setIsCameraModalOpen(false);
          setEditingSpot(null);
          showToast(
            'Đang lưu thay đổi bài viết...',
            'Hệ thống đang cập nhật thông tin bài đăng của bạn lên cộng đồng.',
            'processing'
          );

          const effectiveAddress = payload.customAddress || coords.label;
          try {
            const res = await fetch('/api/spots', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'UPDATE_SPOT',
                spotId,
                authorId: session.id,
                authorName: session.displayName,
                rawPhone: session.rawPhone,
                spotType: payload.spotType,
                title: payload.title,
                story: payload.story,
                species: payload.species,
                breed: payload.breed,
                coatColor: payload.coatColor,
                traits: payload.traits,
                images: payload.images,
                exactLat: payload.pinnedLat,
                exactLng: payload.pinnedLng,
                hasExactLocation: payload.hasExactLocation,
                areaLabel: effectiveAddress,
                formattedAddress: effectiveAddress,
                allowFoster: payload.allowFoster,
              }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.ok) {
              showToast(
                'Không thể lưu chỉnh sửa',
                data?.error ||
                  'Vui lòng kiểm tra thông tin bài viết và thử lại.',
                'error'
              );
              return;
            }

            let updatedSpotToBroadcast: DomSpot | null = data.spot || null;

            updateSpotsAndPersist((prev) =>
              prev.map((s) => {
                if (s.id !== spotId) return s;
                const merged: DomSpot = {
                  ...s,
                  ...(data.spot || {}),
                  spotType: payload.spotType,
                  title: payload.title,
                  story: payload.story,
                  species: payload.species,
                  breed: payload.breed,
                  coatColor: payload.coatColor,
                  traits: payload.traits,
                  images: payload.images,
                  areaLabel: effectiveAddress,
                  formattedAddress: effectiveAddress,
                  hasExactLocation: payload.hasExactLocation,
                  allowFoster: payload.allowFoster,
                };
                updatedSpotToBroadcast = merged;
                return merged;
              })
            );

            if (updatedSpotToBroadcast) {
              setSelectedSpot((curr) =>
                curr && curr.id === spotId ? updatedSpotToBroadcast : curr
              );
              setDetailSpot((curr) =>
                curr && curr.id === spotId ? updatedSpotToBroadcast : curr
              );
              broadcastCommunitySpotRealtime(updatedSpotToBroadcast);
            }

            showToast(
              'Đã cập nhật bài đăng',
              'Thông tin bài viết đã được lưu và đồng bộ tới cộng đồng.',
              'success'
            );
            triggerWebPushAlert(
              'Đã cập nhật bài đăng',
              `Bài viết "${payload.title}" đã được cập nhật thành công.`,
              'postStatus'
            );
          } catch {
            showToast(
              'Lỗi kết nối máy chủ',
              'Không thể cập nhật bài viết lúc này. Vui lòng thử lại.',
              'error'
            );
          } finally {
            isSubmittingPostRef.current = false;
          }
        }
      );
    },
    [
      ensureAuthenticated,
      coords.label,
      updateSpotsAndPersist,
      showToast,
      triggerWebPushAlert,
    ]
  );

  const handleDeleteSpot = useCallback(
    (spotId: string) => {
      ensureAuthenticated('Xóa bài đăng của bạn', async (session) => {
        showToast(
          'Đang xóa bài đăng...',
          'Hệ thống đang gỡ bài viết khỏi bản đồ và danh sách cộng đồng.',
          'processing'
        );
        try {
          const res = await fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'DELETE_SPOT',
              spotId,
              authorId: session.id,
              rawPhone: session.rawPhone,
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            showToast(
              'Không thể xóa bài đăng',
              data?.error || 'Bạn chỉ có thể xóa bài viết do chính mình đăng.',
              'error'
            );
            return;
          }

          recordDeletedSpotIds([spotId]);
          decrementDeviceRateLimit(session.rawPhone || session.id);
          updateSpotsAndPersist((prev) =>
            prev.filter((s) => s.id !== spotId)
          );
          setDoubleMatches((prev) =>
            prev.filter((m) => m.matchedSpot.id !== spotId)
          );
          setSavedSpotIds((prev) => {
            if (!prev.has(spotId)) return prev;
            const next = new Set(prev);
            next.delete(spotId);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(
                SAVED_SPOT_IDS_KEY,
                JSON.stringify(Array.from(next))
              );
            }
            return next;
          });
          setSelectedSpot((curr) => (curr && curr.id === spotId ? null : curr));
          setDetailSpot((curr) => (curr && curr.id === spotId ? null : curr));
          broadcastDeleteSpotRealtime(spotId);

          showToast(
            'Đã xóa bài đăng',
            'Bài viết của bạn đã được xóa vĩnh viễn khỏi hệ thống và danh sách cộng đồng.',
            'success'
          );
        } catch {
          showToast(
            'Lỗi kết nối máy chủ',
            'Không thể xóa bài viết lúc này. Vui lòng thử lại.',
            'error'
          );
        }
      });
    },
    [ensureAuthenticated, recordDeletedSpotIds, updateSpotsAndPersist, showToast]
  );

  const handleUnlockContactOrAdopt = useCallback(
    (
      spot: DomSpot,
      message: string,
      requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
    ) => {
      if (!isUserWebPost(spot)) {
        if (spot.sourceUrl && typeof window !== 'undefined') {
          window.open(spot.sourceUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      ensureAuthenticated('Mở thông tin liên hệ', async (session) => {
        try {
          const res = await fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UNLOCK_CONTACT',
              spotId: spot.id,
              requesterId: session.id,
              requesterName: session.displayName,
              requesterPhone: session.rawPhone,
              requestType,
              message,
            }),
          });
          const data = await res.json().catch(() => null);
          const unlockedPhone = data?.rawPhone || spot.rawPhoneSecret || '';
          const unlockedZalo =
            data?.zaloLink ||
            (unlockedPhone
              ? `https://zalo.me/${unlockedPhone.replace(/\D/g, '')}`
              : '');

          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spot.id
                ? {
                    ...s,
                    isContactUnlockedForViewer: true,
                    rawPhoneSecret: unlockedPhone || s.rawPhoneSecret,
                    zaloLink: unlockedZalo || s.zaloLink,
                  }
                : s
            )
          );
          setSelectedSpot((curr) =>
            curr && curr.id === spot.id
              ? {
                  ...curr,
                  isContactUnlockedForViewer: true,
                  rawPhoneSecret: unlockedPhone || curr.rawPhoneSecret,
                  zaloLink: unlockedZalo || curr.zaloLink,
                }
              : curr
          );
          setDetailSpot((curr) =>
            curr && curr.id === spot.id
              ? {
                  ...curr,
                  isContactUnlockedForViewer: true,
                  rawPhoneSecret: unlockedPhone || curr.rawPhoneSecret,
                  zaloLink: unlockedZalo || curr.zaloLink,
                }
              : curr
          );
          showToast(
            'Đã mở khóa liên hệ thành công',
            unlockedPhone
              ? `Số điện thoại liên hệ của người đăng: ${unlockedPhone}`
              : 'Đã gửi lời nhắn kết nối tới người đăng tin.',
            'success'
          );
        } catch {
          showToast(
            'Không thể mở khóa liên hệ',
            'Vui lòng kiểm tra kết nối mạng và thử lại.',
            'error'
          );
        }
      });
    },
    [ensureAuthenticated, updateSpotsAndPersist, showToast]
  );

  const handleResolveSpotToPeace = useCallback(
    async (spotId: string) => {
      let resolvedSpotToBroadcast: DomSpot | null = null;
      updateSpotsAndPersist((prev) =>
        prev.map((s) => {
          if (s.id !== spotId) return s;
          const updated: DomSpot = {
            ...s,
            spotType: 'GREEN_PEACE',
            status: 'RESOLVED',
            lightPower: 200,
          };
          resolvedSpotToBroadcast = updated;
          return updated;
        })
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
      setDetailSpot((curr) =>
        curr && curr.id === spotId
          ? {
              ...curr,
              spotType: 'GREEN_PEACE',
              status: 'RESOLVED',
              lightPower: 200,
            }
          : curr
      );

      if (resolvedSpotToBroadcast) {
        broadcastCommunitySpotRealtime(resolvedSpotToBroadcast);
      }

      await fetch('/api/spots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_PEACE',
          spotId,
        }),
      }).catch(() => null);

      showToast(
        'Đã cập nhật trạng thái',
        'Bé đã tìm được mái ấm bình yên — thông tin đã đồng bộ tới cộng đồng.',
        'success'
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
    async (snapInput: {
      petName: string;
      caption: string;
      moodTag: string;
      weightKg?: number;
      imageUrl: string;
    }) => {
      const nextWeek = memorySnaps.length + 1;
      const myLatestSpot = userSession
        ? spots.find((s) => s.authorId === userSession.id)
        : undefined;

      try {
        const res = await fetch('/api/spots', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADD_MEMORY_SNAP',
            postId: myLatestSpot?.id,
            authorId: userSession?.id,
            authorName: userSession?.displayName,
            authorPhone: userSession?.rawPhone,
            petName: snapInput.petName,
            weekNumber: nextWeek,
            imageUrl: snapInput.imageUrl,
            caption: snapInput.caption,
            moodTag: snapInput.moodTag,
            weightKg: snapInput.weightKg,
            lat: coords.lat,
            lng: coords.lng,
          }),
        });
        const data = await res.json().catch(() => null);
        const savedSnap: MemorySnap = data?.snap || {
          id: `mem-${Date.now()}`,
          postId: myLatestSpot?.id || '',
          petName: snapInput.petName,
          weekNumber: nextWeek,
          imageUrl: snapInput.imageUrl,
          caption: snapInput.caption,
          moodTag: snapInput.moodTag,
          weightKg: snapInput.weightKg,
          sentToRescuer: true,
          rescuerName: myLatestSpot?.authorName || '',
          areaLabel: coords.label,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
          createdAt: new Date().toLocaleDateString('vi-VN'),
        };

        setMemorySnaps((prev) => {
          const updated = [
            savedSnap,
            ...prev.filter((m) => m.id !== savedSnap.id),
          ];
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(
                MEMORY_STORAGE_KEY,
                JSON.stringify(updated)
              );
            } catch {
              // Ignore quota
            }
          }
          return updated;
        });

        showToast(
          `Đã lưu kỷ niệm tuần thứ ${nextWeek}`,
          'Khoảnh khắc của bé đã được đồng bộ lên Nhật ký Kỷ niệm.',
          'success'
        );
      } catch {
        showToast(
          'Không thể lưu kỷ niệm',
          'Vui lòng kiểm tra kết nối mạng và thử lại.',
          'error'
        );
      }
    },
    [
      memorySnaps.length,
      userSession,
      spots,
      coords.label,
      coords.lat,
      coords.lng,
      showToast,
    ]
  );

  const handleLinkPartnerName = useCallback(
    (partnerName: string) => {
      ensureAuthenticated(
        'Đăng nhập nhanh để ghép đôi Không gian Đi dạo',
        async (session) => {
          const linked = await linkCouplePartnerInSupabase(
            session,
            partnerName
          );
          const updated: UserSession = {
            ...session,
            partnerName,
            coupleRoomCode: linked.roomCode,
          };
          setUserSession(updated);
          persistPermanentSession(updated);
          showToast(
            'Đã kết nối cặp đôi',
            `Không gian riêng tư ${linked.roomName} (Mã: ${linked.roomCode}) đã được đồng bộ.`,
            'success'
          );
        }
      );
    },
    [ensureAuthenticated, showToast]
  );

  const visibleSpots = useMemo(() => {
    return spots.filter((s) => {
      if (isSpotDeletedOrHidden(s, deletedSpotIdsRef.current)) return false;
      if (
        s.status === 'SHADOWBANNED' &&
        !isSpotOwnedByUser(s, userSession)
      ) {
        return false;
      }
      if (originFilter === 'USER_POST' && !isUserWebPost(s)) {
        return false;
      }
      if (originFilter === 'EXTERNAL' && isUserWebPost(s)) {
        return false;
      }
      if (originFilter !== 'USER_POST' && platformFilter !== 'ALL') {
        if (isUserWebPost(s)) return false;
        const detectedPlatform = detectPlatformFromUrl(
          s.sourceUrl,
          s.sourcePlatform || 'SOCIAL_MEDIA'
        );
        if (detectedPlatform !== platformFilter && s.sourcePlatform !== platformFilter) {
          return false;
        }
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
  }, [spots, originFilter, platformFilter, regionFilter, userSession]);

  const handleTabChange = useCallback(
    (nextTab: MainTab) => {
      if (nextTab === 'profile') {
        setIsProfileModalOpen(true);
        return;
      }
      if (typeof window !== 'undefined' && mainTab === 'explore') {
        exploreScrollYRef.current = window.scrollY;
      }
      setMainTab(nextTab);
      if (typeof window !== 'undefined') {
        if (nextTab === 'explore') {
          const savedY = exploreScrollYRef.current;
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior });
          });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
      }
    },
    [mainTab]
  );

  return (
    <div className="min-h-screen bg-[#F5F6F2] text-[#15251F] flex flex-col font-sans selection:bg-[#E4EDDD] selection:text-[#123F35]">
      <DomNhoHeader
        activeTab={mainTab}
        onChangeTab={handleTabChange}
        locationLabel={coords.label}
        onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        onOpenCreatePost={handleOpenCreatePost}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        userSession={userSession}
        savedCount={savedSpotIds.size}
        className={mainTab === 'map' ? 'hidden md:block' : ''}
      />

      <main className="flex-1 w-full">
        {mainTab === 'map' ? (
          <FullMapView
            spots={visibleSpots}
            selectedSpot={selectedSpot}
            onSelectSpot={setSelectedSpot}
            onOpenSpotDetail={(spot) => {
              setSelectedSpot(spot);
              setDetailSpot(spot);
            }}
            userCoords={coords}
            onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
            onRequestRealGps={handleRequestUserGpsWithToast}
            onBackToExplore={() => handleTabChange('explore')}
            onOpenCreatePost={handleOpenCreatePost}
            vetStations={vetStations}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            onOpenGoogleMapsVault={() => setIsGoogleMapsVaultOpen(true)}
          />
        ) : mainTab === 'stories' ? (
          <StoryPageView
            onBackToExplore={() => handleTabChange('explore')}
            onOpenMap={() => handleTabChange('map')}
          />
        ) : (
          <ExploreView
            spots={visibleSpots}
            userCoords={coords}
            locationLabel={coords.label}
            onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
            onRequestRealGps={handleRequestUserGpsWithToast}
            onOpenFullMap={() => handleTabChange('map')}
            onOpenStory={() => handleTabChange('stories')}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            onSelectDetail={(spot) => {
              setDetailSpot(spot);
            }}
            savedSpotIds={savedSpotIds}
            onToggleSaveSpot={handleToggleSaveSpot}
            regionFilter={regionFilter}
            onChangeRegionFilter={setRegionFilter}
            originFilter={originFilter}
            onChangeOriginFilter={setOriginFilter}
            platformFilter={platformFilter}
            onChangePlatformFilter={setPlatformFilter}
            isSavedView={mainTab === 'saved'}
            onBackToExplore={() => handleTabChange('explore')}
            onTriggerUpdate={() => handleTriggerLiveCrawl('ALL')}
            isUpdating={isUpdatingFeed}
            currentUserId={userSession?.id}
            userSession={userSession}
            onEditSpot={handleOpenEditSpot}
            onDeleteSpot={handleDeleteSpot}
          />
        )}
      </main>

      <DomNhoFooter
        activeTab={mainTab}
        onChangeTab={handleTabChange}
        onOpenCreatePost={handleOpenCreatePost}
        onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        savedCount={savedSpotIds.size}
        totalSpotsCount={visibleSpots.length}
      />

      <MobileBottomNav
        activeTab={mainTab}
        onChangeTab={handleTabChange}
        savedCount={savedSpotIds.size}
      />

      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            role="status"
            aria-live="polite"
            className={`fixed top-16 sm:top-20 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[130] max-w-md mx-auto rounded-xl px-3.5 py-3 bg-white border shadow-lg flex items-start gap-3 pointer-events-none overflow-hidden ${
              toastBanner.tone === 'error'
                ? 'border-[#AF421F]'
                : 'border-[#DDDCD4]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                toastBanner.tone === 'error'
                  ? 'bg-[#FFF0E5] text-[#AF421F]'
                  : 'bg-[#E8EFE6] text-[#0E513B]'
              }`}
            >
              {toastBanner.tone === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : toastBanner.tone === 'processing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : toastBanner.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1 break-words">
              <p className="text-xs font-extrabold text-[#142820] leading-snug break-words">
                {toastBanner.title}
              </p>
              <p className="text-[11px] mt-0.5 leading-snug text-[#52605A] break-words">
                {toastBanner.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        currentLabel={coords.label}
        currentLat={coords.lat}
        currentLng={coords.lng}
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
        spot={detailSpot}
        themeId="morning_sun"
        userCoords={coords}
        userSession={userSession}
        onClose={() => setDetailSpot(null)}
        onBoostLight={handleBoostLight}
        onAddSighting={async (spotId, sighting) => {
          updateSpotsAndPersist((prev) =>
            prev.map((s) =>
              s.id === spotId
                ? { ...s, sightings: [sighting, ...(s.sightings || [])] }
                : s
            )
          );
          setDetailSpot((curr) =>
            curr && curr.id === spotId
              ? { ...curr, sightings: [sighting, ...(curr.sightings || [])] }
              : curr
          );

          try {
            const res = await fetch('/api/spots', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'ADD_SIGHTING',
                spotId,
                reporterId: userSession?.id,
                reporterName: sighting.reporterName,
                reporterPhone: userSession?.rawPhone,
                imageUrl: sighting.imageUrl,
                note: sighting.note,
                emotionTag: sighting.emotionTag,
                lat: sighting.lat,
                lng: sighting.lng,
                originLat: detailSpot?.publicLat || coords.lat,
                originLng: detailSpot?.publicLng || coords.lng,
              }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.ok && data.sighting) {
              const savedSighting = data.sighting as SightingItem;
              let spotWithNewSighting: DomSpot | null = null;
              updateSpotsAndPersist((prev) =>
                prev.map((s) => {
                  if (s.id !== spotId) return s;
                  const updated: DomSpot = {
                    ...s,
                    sightings: [
                      savedSighting,
                      ...(s.sightings || []).filter(
                        (st) =>
                          st.id !== sighting.id && st.id !== savedSighting.id
                      ),
                    ],
                  };
                  spotWithNewSighting = updated;
                  return updated;
                })
              );
              if (spotWithNewSighting) {
                broadcastCommunitySpotRealtime(spotWithNewSighting);
              }
            }
          } catch {
            // Giữ cập nhật tức thời nếu mạng gián đoạn
          }

          showToast(
            'Đã gửi thông tin nhìn thấy',
            'Manh mối đã được đồng bộ lên hệ thống để hỗ trợ tìm kiếm bé!',
            'success'
          );
        }}
        onUnlockContactRequest={handleUnlockContactOrAdopt}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onSaveSpotToGoogleMapsVault={handleSaveSpotToGoogleMapsVault}
        onFocusSpotOnMap={(spot) => {
          setSelectedSpot(spot);
          setDetailSpot(null);
          handleTabChange('map');
        }}
        isSaved={detailSpot ? savedSpotIds.has(detailSpot.id) : false}
        onToggleSave={handleToggleSaveSpot}
        onEditSpot={handleOpenEditSpot}
        onDeleteSpot={handleDeleteSpot}
      />

      <CameraQuickModal
        isOpen={isCameraModalOpen}
        themeId="morning_sun"
        userCoords={coords}
        existingSpots={spots}
        editingSpot={editingSpot}
        onSelectMatchedSpot={(spot) => {
          setIsCameraModalOpen(false);
          setEditingSpot(null);
          setSelectedSpot(spot);
          setDetailSpot(spot);
        }}
        onClose={() => {
          setIsCameraModalOpen(false);
          setEditingSpot(null);
        }}
        onCreateSpot={handleCreateNewSpot}
        onUpdateSpot={handleUpdateExistingSpot}
      />

      <ProfileMemoryModal
        isOpen={isProfileModalOpen}
        themeId="morning_sun"
        initialTab={profileInitialTab}
        userSession={userSession}
        spots={spots}
        memorySnaps={memorySnaps}
        patrolModeActive={patrolModeActive}
        notificationSettings={notificationSettings}
        notificationPermission={notificationPermission}
        notificationPlatform={notificationPlatform}
        notificationHistory={notificationHistory}
        onUpdateNotificationSetting={updateNotificationSetting}
        onRequestPushPermission={requestPushPermission}
        onClearNotificationHistory={clearNotificationHistory}
        onTestNotification={() => {
          triggerWebPushAlert(
            'Thông báo thử nghiệm từ Đốm Nhỏ',
            'Hệ thống thông báo trên thiết bị của bạn đang hoạt động tốt!',
            'postStatus'
          );
          showToast(
            'Đã gửi thông báo thử nghiệm',
            'Kiểm tra âm báo và biểu ngữ thông báo trên màn hình của bạn.',
            'success'
          );
        }}
        onTogglePatrolMode={() => {
          setPatrolModeActive((prev) => {
            const nextVal = !prev;
            if (userSession) {
              const updatedSession: UserSession = {
                ...userSession,
                patrolModeActive: nextVal,
              };
              setUserSession(updatedSession);
              persistPermanentSession(updatedSession);
              syncPatrolModeInSupabase(updatedSession, nextVal);
            }
            return nextVal;
          });
        }}
        onClose={() => setIsProfileModalOpen(false)}
        onRequireAuth={() => {
          setPendingAuthAction({
            label: 'Đăng nhập nhanh tài khoản',
            callback: () => setIsProfileModalOpen(true),
          });
          setIsAuthModalOpen(true);
        }}
        onLogout={() => {
          clearPermanentSession();
          setUserSession(null);
          showToast(
            'Đã đăng xuất',
            'Bạn đã đăng xuất khỏi tài khoản trên thiết bị này.',
            'info'
          );
        }}
        onResolveSpotToPeace={handleResolveSpotToPeace}
        onAddWeeklyMemorySnap={handleAddWeeklyMemorySnap}
        onActivateEmergencyBoost={async (spotId) => {
          let boostedSpot: DomSpot | null = null;
          updateSpotsAndPersist((prev) =>
            prev.map((s) => {
              if (s.id !== spotId) return s;
              const updated: DomSpot = {
                ...s,
                lightPower: 300,
                isEmergencyBoosted: true,
              };
              boostedSpot = updated;
              return updated;
            })
          );
          if (boostedSpot) {
            broadcastCommunitySpotRealtime(boostedSpot);
          }
          await fetch('/api/spots', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'EMERGENCY_BOOST',
              spotId,
            }),
          }).catch(() => null);
          showToast(
            'Đã ưu tiên hiển thị',
            'Bài viết đã được kích hoạt khẩn cấp và đưa lên đầu danh sách cho mọi người.',
            'success'
          );
        }}
        onLinkPartnerName={handleLinkPartnerName}
        onOpenCreatePost={handleOpenCreatePost}
        onOpenEditSpot={handleOpenEditSpot}
        onDeleteSpot={handleDeleteSpot}
        onSelectSpotDetail={(spot) => {
          setSelectedSpot(spot);
          setDetailSpot(spot);
        }}
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
          setDetailSpot(spot);
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
