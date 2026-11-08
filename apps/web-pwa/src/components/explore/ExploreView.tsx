'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Home,
  Info,
  LayoutGrid,
  LifeBuoy,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import PetCard from '@/components/explore/PetCard';
import ContextMapCard from '@/components/explore/ContextMapCard';
import SuccessStoryCard from '@/components/explore/SuccessStoryCard';
import {
  DomSpot,
  ExploreCategory,
  OriginFilter,
  PlatformFilter,
  RegionFilter,
  UserSession,
  getSpotBadgeMeta,
  isSpotOwnedByUser,
  isUserWebPost,
} from '@/lib/types';
import { calculateDistanceMeters } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';
import { compressImageToWebpClient } from '@/lib/image-compressor';
import {
  VisualAnalysisResult,
  VisualMatchItem,
  rankSpotsByVisualSimilarity,
} from '@/lib/visual-matcher';

interface ExploreViewProps {
  spots: DomSpot[];
  userCoords: { lat: number; lng: number; label: string };
  locationLabel: string;
  onOpenLocationPicker: () => void;
  onRequestRealGps?: () => void;
  onOpenFullMap: () => void;
  onOpenStory: () => void;
  onOpenFilterModal: () => void;
  onSelectDetail: (spot: DomSpot) => void;
  savedSpotIds: Set<string>;
  onToggleSaveSpot: (spot: DomSpot) => void;
  regionFilter: RegionFilter;
  onChangeRegionFilter: (reg: RegionFilter) => void;
  originFilter: OriginFilter;
  onChangeOriginFilter: (origin: OriginFilter) => void;
  platformFilter?: PlatformFilter;
  onChangePlatformFilter?: (p: PlatformFilter) => void;
  isSavedView?: boolean;
  onBackToExplore?: () => void;
  onTriggerUpdate?: () => void;
  isUpdating?: boolean;
  currentUserId?: string;
  userSession?: UserSession | null;
  onEditSpot?: (spot: DomSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
}

type SortOption = 'NEAREST' | 'NEWEST' | 'URGENT';

function PawCategoryIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="5.5" r="2.2" fill="currentColor" />
      <circle cx="17" cy="7.5" r="2.2" fill="currentColor" />
      <path
        d="M7.2 16C6.4 12.8 9 10.8 12 10.8C15 10.8 17.6 12.8 16.8 16C16.2 18.2 14.3 19.6 12 19.6C9.7 19.6 7.8 18.2 7.2 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ExploreView({
  spots,
  userCoords,
  locationLabel,
  onOpenLocationPicker,
  onRequestRealGps,
  onOpenFullMap,
  onOpenStory,
  onOpenFilterModal,
  onSelectDetail,
  savedSpotIds,
  onToggleSaveSpot,
  regionFilter,
  onChangeRegionFilter,
  originFilter,
  onChangeOriginFilter,
  platformFilter = 'ALL',
  onChangePlatformFilter,
  isSavedView = false,
  onBackToExplore,
  onTriggerUpdate,
  isUpdating = false,
  currentUserId,
  userSession,
  onEditSpot,
  onDeleteSpot,
}: ExploreViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEAREST');
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const visualInputRef = useRef<HTMLInputElement | null>(null);
  const [visualSearchImage, setVisualSearchImage] = useState<string | null>(
    null
  );
  const [visualAnalyzing, setVisualAnalyzing] = useState<boolean>(false);
  const [visualAnalysis, setVisualAnalysis] =
    useState<VisualAnalysisResult | null>(null);
  const [visualMatches, setVisualMatches] = useState<VisualMatchItem[]>([]);
  const [visualError, setVisualError] = useState<string | null>(null);

  const handleVisualFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisualAnalyzing(true);
    setVisualError(null);
    try {
      const compressed = await compressImageToWebpClient(file, 960, 0.8);
      setVisualSearchImage(compressed.dataUrl);

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: compressed.dataUrl,
          candidateSpots: spots,
          userCoords,
        }),
      });
      const data = await res.json();
      if (data.ok && data.analysis) {
        const analysisData: VisualAnalysisResult = data.analysis;
        setVisualAnalysis(analysisData);
        if (analysisData.isPet === false) {
          setVisualError(
            'Ảnh tải lên không phải thú cưng (chó/mèo). Vui lòng chọn ảnh thực tế của bé.'
          );
          setVisualMatches([]);
        } else {
          const ranked =
            Array.isArray(data.matches) && data.matches.length > 0
              ? (data.matches as VisualMatchItem[])
              : rankSpotsByVisualSimilarity(analysisData, spots, userCoords);
          setVisualMatches(ranked);
        }
      } else {
        setVisualError(
          'Không thể phân tích ảnh lúc này. Vui lòng thử lại với bức ảnh rõ nét hơn.'
        );
        setVisualMatches([]);
      }
    } catch {
      setVisualError('Không thể đọc hoặc phân tích ảnh. Vui lòng thử lại.');
      setVisualMatches([]);
    } finally {
      setVisualAnalyzing(false);
      if (e.target) e.target.value = '';
    }
  };

  const clearVisualSearch = () => {
    setVisualSearchImage(null);
    setVisualAnalysis(null);
    setVisualMatches([]);
    setVisualError(null);
    setVisualAnalyzing(false);
  };

  const resetAllFilters = () => {
    setCategory('ALL');
    setSearchQuery('');
    onChangeRegionFilter('ALL');
    onChangeOriginFilter('ALL');
    onChangePlatformFilter?.('ALL');
    clearVisualSearch();
  };

  const visualMatchMap = useMemo(() => {
    const map = new Map<
      string,
      { matchPercent: number; matchReasons: string[] }
    >();
    for (const m of visualMatches) {
      map.set(m.spot.id, {
        matchPercent: m.matchPercent,
        matchReasons: m.matchReasons,
      });
    }
    return map;
  }, [visualMatches]);

  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let sourceSpots = isSavedView
      ? spots.filter((s) => savedSpotIds.has(s.id))
      : spots;

    if (visualSearchImage && !visualAnalyzing) {
      const matchedIds = new Set(visualMatches.map((m) => m.spot.id));
      sourceSpots = sourceSpots.filter((s) => matchedIds.has(s.id));
    }

    const filtered = sourceSpots.filter((spot) => {
      const badgeMeta = getSpotBadgeMeta(spot);
      if (category === 'RESCUE' && badgeMeta.categoryKind !== 'RESCUE') {
        return false;
      }
      if (category === 'LOST' && badgeMeta.categoryKind !== 'LOST') {
        return false;
      }
      if (category === 'ADOPT' && badgeMeta.categoryKind !== 'ADOPT') {
        return false;
      }

      if (!q) return true;

      const haystack = [
        spot.title,
        spot.story,
        spot.authorName,
        spot.breed,
        spot.coatColor,
        spot.areaLabel,
        spot.formattedAddress || '',
        ...(spot.traits || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (visualSearchImage) {
        const scoreA = visualMatchMap.get(a.id)?.matchPercent || 0;
        const scoreB = visualMatchMap.get(b.id)?.matchPercent || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
      }

      if (Boolean(a.isEmergencyBoosted) !== Boolean(b.isEmergencyBoosted)) {
        return a.isEmergencyBoosted ? -1 : 1;
      }

      const aIsUser = isUserWebPost(a);
      const bIsUser = isUserWebPost(b);
      if (aIsUser !== bIsUser) {
        return aIsUser ? -1 : 1;
      }

      if (sortBy === 'URGENT') {
        const score = (s: DomSpot) =>
          s.spotType === 'RED_SOS'
            ? 4
            : s.spotType === 'ORANGE_SIGHT'
            ? 3
            : s.spotType === 'YELLOW_ADOPT'
            ? 2
            : 1;
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
      }

      if (sortBy === 'NEAREST') {
        const aExact = isSpotPinAllowedOnMap(a);
        const bExact = isSpotPinAllowedOnMap(b);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (aExact && bExact) {
          const dA = calculateDistanceMeters(
            userCoords.lat,
            userCoords.lng,
            a.publicLat,
            a.publicLng
          );
          const dB = calculateDistanceMeters(
            userCoords.lat,
            userCoords.lng,
            b.publicLat,
            b.publicLng
          );
          return dA - dB;
        }
      }

      const tA = Date.parse(a.publishedDate || a.createdAt) || 0;
      const tB = Date.parse(b.publishedDate || b.createdAt) || 0;
      return tB - tA;
    });
  }, [
    spots,
    isSavedView,
    savedSpotIds,
    visualSearchImage,
    visualAnalyzing,
    visualMatches,
    visualMatchMap,
    category,
    searchQuery,
    sortBy,
    userCoords.lat,
    userCoords.lng,
  ]);

  const activeFiltersCount =
    (category !== 'ALL' ? 1 : 0) +
    (regionFilter !== 'ALL' ? 1 : 0) +
    (originFilter !== 'ALL' ? 1 : 0) +
    (originFilter !== 'USER_POST' && platformFilter !== 'ALL' ? 1 : 0);

  const toggleOriginCheckbox = (target: 'USER_POST' | 'EXTERNAL') => {
    if (originFilter === target) {
      onChangeOriginFilter('ALL');
    } else {
      onChangeOriginFilter(target);
    }
  };

  const handleQuickReportSighting = () => {
    const target =
      filteredSpots.find(
        (s) =>
          getSpotBadgeMeta(s).categoryKind === 'LOST' ||
          getSpotBadgeMeta(s).categoryKind === 'RESCUE'
      ) || filteredSpots[0];
    if (target) {
      onSelectDetail(target);
    } else {
      onOpenFullMap();
    }
  };

  const handleQuickContactPoster = () => {
    const communitySpot =
      filteredSpots.find((s) => isUserWebPost(s)) || filteredSpots[0];
    if (communitySpot) {
      onSelectDetail(communitySpot);
    } else {
      onChangeOriginFilter('USER_POST');
    }
  };

  const handleSharePage = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Đốm Nhỏ — Cứu trợ, tìm thú lạc và nhận nuôi',
          text: 'Cùng chung tay hỗ trợ các bé thú cưng đang cần giúp đỡ quanh bạn trên Đốm Nhỏ.',
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5F6F2] pb-12 text-ink">
      <input
        ref={visualInputRef}
        type="file"
        accept="image/*"
        onChange={handleVisualFileChange}
        className="hidden"
      />

      <div className="max-w-[1320px] mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Desktop Toolbar Row (matches desktop-explore.png) */}
        <div className="hidden lg:flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[28px] xl:text-[32px] font-extrabold text-ink leading-tight">
              {isSavedView ? 'Bài viết đã lưu' : 'Tin cứu trợ, tìm thú lạc quanh bạn'}
            </h1>
            <p className="text-sm text-ink-secondary mt-0.5">
              {isSavedView
                ? 'Những trường hợp bạn đã đánh dấu để theo dõi và hỗ trợ.'
                : 'Cứu trợ, tìm thú lạc và nhận nuôi'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-1 max-w-[680px] justify-end">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, đặc điểm, khu vực..."
                className="w-full h-[44px] pl-10 pr-8 rounded-[10px] bg-white border border-[#DDE2DC] text-sm text-ink placeholder-ink-secondary focus:border-brand outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F6F2] text-xs flex items-center justify-center text-ink"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => visualInputRef.current?.click()}
              disabled={visualAnalyzing}
              className={`min-h-[44px] px-3.5 rounded-[10px] border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
                visualSearchImage
                  ? 'bg-brand-soft border-brand text-brand'
                  : 'bg-white border-[#DDE2DC] hover:border-brand text-ink'
              }`}
              title="Tải ảnh thú cưng lên để AI đối chiếu bài viết tương đồng"
            >
              {visualAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" />
              ) : (
                <Camera className="w-4 h-4 text-brand shrink-0" />
              )}
              <span>{visualAnalyzing ? 'Đang quét...' : 'Tìm bằng ảnh'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFilterModal}
              className="min-h-[44px] px-4 rounded-[10px] bg-white hover:bg-brand-soft/50 border border-[#DDE2DC] hover:border-brand text-ink text-sm font-bold flex items-center gap-2 shrink-0 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-ink shrink-0" />
              <span>Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-brand text-white text-[11px] font-bold leading-none">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Controls Stack (matches 01 · KHÁM PHÁ in mobile-explore-detail.png) */}
        <div className="lg:hidden space-y-2.5">
          {/* Row 1: Location Selector + GPS Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-[10px] bg-white border border-[#DDE2DC] text-xs sm:text-sm font-bold text-ink flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                <span className="truncate">
                  {locationLabel || 'Thủ Đức, TP.HCM'}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-ink-secondary shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onRequestRealGps) onRequestRealGps();
                else onOpenLocationPicker();
              }}
              aria-label="Định vị GPS hiện tại của tôi"
              title="Định vị GPS hiện tại của tôi"
              className="min-w-[44px] min-h-[44px] rounded-[10px] bg-white border border-[#DDE2DC] hover:border-brand text-ink flex items-center justify-center shrink-0"
            >
              <Crosshair className="w-4 h-4 text-brand" />
            </button>
          </div>

          {/* Row 2: Search Input + Camera AI Search + Filter Modal Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-ink-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, đặc điểm, khu vực..."
                className="w-full min-h-[44px] pl-10 pr-8 rounded-[10px] bg-white border border-[#DDE2DC] text-sm text-ink placeholder-ink-secondary focus:border-brand outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F6F2] text-xs flex items-center justify-center text-ink"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => visualInputRef.current?.click()}
              disabled={visualAnalyzing}
              aria-label="Tìm kiếm bằng hình ảnh thú cưng"
              title="Tìm bằng ảnh"
              className={`min-w-[44px] min-h-[44px] px-2.5 rounded-[10px] border flex items-center justify-center gap-1 shrink-0 transition-colors ${
                visualSearchImage
                  ? 'bg-brand-soft border-brand text-brand'
                  : 'bg-white border-[#DDE2DC] text-ink'
              }`}
            >
              {visualAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
              ) : (
                <Camera className="w-4 h-4 text-brand" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenFilterModal}
              aria-label="Mở bộ lọc"
              title="Bộ lọc"
              className="relative min-w-[44px] min-h-[44px] px-2.5 rounded-[10px] bg-white border border-[#DDE2DC] text-ink flex items-center justify-center shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Row 3: Mobile Category Segmented Row */}
          <div className="p-1 rounded-[10px] bg-white border border-[#DDE2DC] flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'RESCUE', label: 'Cứu trợ' },
                { id: 'LOST', label: 'Thú lạc' },
                { id: 'ADOPT', label: 'Nhận nuôi' },
              ] as { id: ExploreCategory; label: string }[]
            ).map((item) => {
              const active = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={active}
                  className={`flex-1 min-h-[38px] px-2.5 py-1.5 rounded-[8px] text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink hover:bg-[#F5F6F2]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Row 4: Mobile Heading + Sort Dropdown */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div role="heading" aria-level={1} className="text-xl font-extrabold text-ink">
              {isSavedView ? 'Bài viết đã lưu' : 'Tin cứu trợ, tìm thú lạc quanh bạn'}
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-[38px] pl-3 pr-7 rounded-[8px] bg-transparent text-xs font-bold text-ink appearance-none cursor-pointer outline-none"
                aria-label="Sắp xếp kết quả"
              >
                <option value="NEAREST">Gần nhất</option>
                <option value="NEWEST">Mới nhất</option>
                <option value="URGENT">Ưu tiên SOS</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-ink-secondary pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Visual Search Active Banner */}
        {visualSearchImage && (
          <div className="p-3.5 rounded-[12px] bg-white border border-brand flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={visualSearchImage}
                alt="Ảnh đang dùng để tìm kiếm"
                className="w-14 h-14 rounded-[8px] object-cover border border-[#DDE2DC] shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-xs sm:text-sm font-bold text-ink">
                  {visualAnalyzing
                    ? 'Đang phân tích hình ảnh và lọc bài viết trùng khớp...'
                    : visualError
                    ? visualError
                    : `Kết quả phân tích ảnh: ${
                        visualAnalysis?.breed || 'Thú cưng'
                      } (${visualAnalysis?.coatColor || 'Rõ đặc điểm'}) — ${
                        visualMatches.length
                      } bài viết trùng khớp`}
                </p>
                {visualAnalysis &&
                  Array.isArray(visualAnalysis.traits) &&
                  visualAnalysis.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {visualAnalysis.traits.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded bg-brand-soft text-brand text-[11px] font-semibold"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => visualInputRef.current?.click()}
                className="min-h-[38px] px-3 rounded-[10px] border border-[#DDE2DC] bg-[#F5F6F2] hover:bg-brand-soft/50 text-xs font-semibold text-ink"
              >
                Đổi ảnh khác
              </button>
              <button
                type="button"
                onClick={clearVisualSearch}
                className="min-h-[38px] px-3 rounded-[10px] bg-[#FFF0E8] text-[#A83D20] text-xs font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bỏ lọc ảnh</span>
              </button>
            </div>
          </div>
        )}

        {/* Main 3-Column Desktop Grid / 1-Column Mobile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[235px_minmax(0,1fr)_320px] xl:grid-cols-[250px_minmax(0,1fr)_340px] gap-5 items-start">
          {/* Column 1: Left Filter Sidebar (Desktop) */}
          <aside className="hidden lg:flex flex-col bg-white rounded-[12px] border border-[#DDE2DC] p-4 space-y-5 sticky top-20 shadow-[0_2px_10px_rgba(21,37,31,0.03)]">
            <div className="space-y-2">
              <h2 className="text-sm font-extrabold text-ink px-1">
                Loại tin
              </h2>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setCategory('ALL')}
                  aria-pressed={category === 'ALL'}
                  className={`w-full min-h-[42px] px-3 rounded-[10px] text-sm font-bold flex items-center gap-2.5 transition-colors ${
                    category === 'ALL'
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink hover:bg-[#F5F6F2]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-brand shrink-0" />
                  <span>Tất cả</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('RESCUE')}
                  aria-pressed={category === 'RESCUE'}
                  className={`w-full min-h-[42px] px-3 rounded-[10px] text-sm font-bold flex items-center gap-2.5 transition-colors ${
                    category === 'RESCUE'
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink hover:bg-[#F5F6F2]'
                  }`}
                >
                  <LifeBuoy className="w-4 h-4 text-[#A83D20] shrink-0" />
                  <span>Cứu trợ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('LOST')}
                  aria-pressed={category === 'LOST'}
                  className={`w-full min-h-[42px] px-3 rounded-[10px] text-sm font-bold flex items-center gap-2.5 transition-colors ${
                    category === 'LOST'
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink hover:bg-[#F5F6F2]'
                  }`}
                >
                  <PawCategoryIcon className="w-4 h-4 text-[#D4942A] shrink-0" />
                  <span>Thú lạc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('ADOPT')}
                  aria-pressed={category === 'ADOPT'}
                  className={`w-full min-h-[42px] px-3 rounded-[10px] text-sm font-bold flex items-center gap-2.5 transition-colors ${
                    category === 'ADOPT'
                      ? 'bg-brand-soft text-brand'
                      : 'text-ink hover:bg-[#F5F6F2]'
                  }`}
                >
                  <Home className="w-4 h-4 text-[#275B3A] shrink-0" />
                  <span>Nhận nuôi</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DDE2DC] space-y-2.5">
              <h2 className="text-sm font-extrabold text-ink px-1">
                Nguồn tin
              </h2>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => toggleOriginCheckbox('USER_POST')}
                  aria-pressed={originFilter === 'USER_POST'}
                  className="w-full min-h-[38px] px-2 rounded-[8px] hover:bg-[#F5F6F2] flex items-center gap-2.5 text-sm font-medium text-ink text-left"
                >
                  <span
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                      originFilter === 'USER_POST'
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-ink-secondary/50'
                    }`}
                  >
                    {originFilter === 'USER_POST' && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </span>
                  <span>Tin cộng đồng</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleOriginCheckbox('EXTERNAL')}
                  aria-pressed={originFilter === 'EXTERNAL'}
                  className="w-full min-h-[38px] px-2 rounded-[8px] hover:bg-[#F5F6F2] flex items-center gap-2.5 text-sm font-medium text-ink text-left"
                >
                  <span
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                      originFilter === 'EXTERNAL'
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-ink-secondary/50'
                    }`}
                  >
                    {originFilter === 'EXTERNAL' && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </span>
                  <span>Tin tổng hợp</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DDE2DC] space-y-2.5">
              <h2 className="text-sm font-extrabold text-ink px-1">
                Khu vực
              </h2>
              <button
                type="button"
                onClick={onOpenLocationPicker}
                className="w-full min-h-[42px] px-3 rounded-[10px] bg-white hover:bg-[#F5F6F2] border border-[#DDE2DC] text-xs font-semibold text-ink flex items-center justify-between gap-2 transition-colors"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="truncate">
                    {locationLabel || 'Thủ Đức, TP.HCM'}
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
              </button>
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="w-full min-h-[42px] px-3 rounded-[10px] bg-white hover:bg-[#F5F6F2] border border-[#DDE2DC] text-xs font-bold text-ink flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-secondary" />
              <span>Xóa bộ lọc</span>
            </button>
          </aside>

          {/* Column 2: Center Feed */}
          <div className="min-w-0 flex flex-col gap-3.5">
            {/* Desktop Sort & Status Bar */}
            <div className="hidden lg:flex items-center justify-between px-4 py-2.5 rounded-[12px] bg-white border border-[#DDE2DC]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-secondary">
                  Sắp xếp:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="min-h-[34px] pr-6 bg-transparent text-sm font-extrabold text-ink appearance-none cursor-pointer outline-none"
                    aria-label="Sắp xếp bài viết"
                  >
                    <option value="NEAREST">Gần nhất</option>
                    <option value="NEWEST">Mới nhất</option>
                    <option value="URGENT">Ưu tiên SOS</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-ink pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-ink-secondary">
                  Hiển thị {filteredSpots.length} bài viết
                </span>
                {onTriggerUpdate && (
                  <button
                    type="button"
                    onClick={onTriggerUpdate}
                    disabled={isUpdating}
                    className="min-h-[34px] px-3 rounded-[8px] bg-[#F5F6F2] hover:bg-brand-soft text-xs font-bold text-brand inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        isUpdating ? 'animate-spin' : ''
                      }`}
                    />
                    <span>{isUpdating ? 'Đang làm mới...' : 'Làm mới'}</span>
                  </button>
                )}
              </div>
            </div>

            {filteredSpots.length === 0 ? (
              <div className="p-8 sm:p-10 text-center rounded-[12px] bg-white border border-[#DDE2DC] space-y-3">
                <p className="text-base font-bold text-ink">
                  {visualSearchImage
                    ? 'Không tìm thấy bài viết nào có hình ảnh trùng khớp'
                    : isSavedView
                    ? 'Bạn chưa lưu bài viết nào'
                    : 'Không tìm thấy bài viết nào phù hợp'}
                </p>
                <p className="text-xs sm:text-sm text-ink-secondary">
                  {visualSearchImage
                    ? 'Hệ thống chỉ lọc những bài viết cùng loài và có đặc điểm ngoại hình tương đồng với ảnh bạn tải lên.'
                    : isSavedView
                    ? 'Bấm nút Lưu tin trên mỗi bài viết để lưu lại theo dõi.'
                    : 'Thử tìm với từ khóa khác hoặc bấm Xóa bộ lọc để xem toàn bộ bài viết.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (visualSearchImage) {
                      clearVisualSearch();
                    } else if (isSavedView && onBackToExplore) {
                      onBackToExplore();
                    } else {
                      resetAllFilters();
                    }
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-[10px] bg-brand text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {visualSearchImage
                      ? 'Bỏ lọc ảnh & Xem tất cả'
                      : isSavedView
                      ? 'Quay lại khám phá'
                      : 'Xóa bộ lọc'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 min-w-0">
                {filteredSpots.map((spot) => (
                  <PetCard
                    key={spot.id}
                    spot={spot}
                    userCoords={userCoords}
                    onSelectDetail={onSelectDetail}
                    onToggleSave={onToggleSaveSpot}
                    isSaved={savedSpotIds.has(spot.id)}
                    isAuthor={isSpotOwnedByUser(
                      spot,
                      userSession || currentUserId
                    )}
                    onEditSpot={onEditSpot}
                    onDeleteSpot={onDeleteSpot}
                    matchInfo={
                      visualSearchImage
                        ? visualMatchMap.get(spot.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            <p className="lg:hidden flex items-center gap-1.5 text-xs text-ink-secondary pt-1 px-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Hiển thị theo khu vực bạn chọn ({locationLabel}).</span>
            </p>
          </div>

          {/* Column 3: Right Context Sidebar */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
            <ContextMapCard
              spots={spots}
              onOpenFullMap={onOpenFullMap}
              onOpenLocationPicker={onOpenLocationPicker}
              userCoords={userCoords}
            />

            {/* Action Guide Card (matches desktop-explore.png "Bạn có thể giúp bằng cách nào?") */}
            <div className="bg-white rounded-[12px] border border-[#DDE2DC] p-4 space-y-2.5 shadow-[0_2px_10px_rgba(21,37,31,0.04)]">
              <h3 className="text-base font-extrabold text-ink">
                Bạn có thể giúp bằng cách nào?
              </h3>

              <div className="divide-y divide-[#DDE2DC]">
                <button
                  type="button"
                  onClick={handleQuickReportSighting}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-ink hover:text-brand transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-brand shrink-0" />
                    <span>Báo nơi nhìn thấy</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleQuickContactPoster}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-ink hover:text-brand transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-brand shrink-0" />
                    <span>Liên hệ người đăng</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleSharePage}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-ink hover:text-brand transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <Share2 className="w-4 h-4 text-brand shrink-0" />
                    <span>
                      {copiedShareLink
                        ? 'Đã sao chép liên kết chia sẻ!'
                        : 'Chia sẻ bài viết'}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>
            </div>

            <SuccessStoryCard onOpenStory={onOpenStory} />
          </aside>
        </div>
      </div>
    </div>
  );
}
