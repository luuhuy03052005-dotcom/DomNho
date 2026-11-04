'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  Home,
  LayoutGrid,
  LifeBuoy,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
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
  RegionFilter,
  getSpotBadgeMeta,
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
  isSavedView?: boolean;
  onBackToExplore?: () => void;
  onTriggerUpdate?: () => void;
  isUpdating?: boolean;
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
  isSavedView = false,
  onBackToExplore,
  onTriggerUpdate,
  isUpdating = false,
}: ExploreViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEAREST');

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
        const ranked =
          Array.isArray(data.matches) && data.matches.length > 0
            ? (data.matches as VisualMatchItem[])
            : rankSpotsByVisualSimilarity(analysisData, spots, userCoords);
        setVisualMatches(ranked);
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
    (originFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-[#FAF7F1] pb-10 md:pb-12 text-[#142820]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
          <div className="lg:col-span-8 min-w-0 flex flex-col gap-3.5 sm:gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-[#AF421F]">
                    {isSavedView ? 'MỤC ĐÃ LƯU' : 'QUANH BẠN'}
                  </span>
                  <span className="w-7 h-[1.5px] bg-[#D8724D]/60 rounded-full" />
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#142820] leading-tight">
                  {isSavedView
                    ? 'Bài viết bạn đã lưu'
                    : 'Mỗi bé, một cơ hội.'}
                </h1>

                <p className="text-xs sm:text-sm text-[#52605A]">
                  {isSavedView
                    ? 'Những trường hợp cứu trợ, tìm thú lạc và nhận nuôi bạn đang theo dõi.'
                    : 'Cứu trợ, tìm thú lạc và nhận nuôi quanh bạn.'}
                </p>
              </div>

              <svg
                viewBox="0 0 180 76"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="hidden sm:block w-36 h-16 shrink-0 pointer-events-none select-none"
                aria-hidden="true"
              >
                <path
                  d="M8 66C24 62 36 56 48 64"
                  stroke="#D8724D"
                  strokeWidth="1.6"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                />
                <circle cx="28" cy="54" r="2.2" fill="#AF421F" />
                <circle cx="33" cy="51" r="2.2" fill="#AF421F" />
                <circle cx="37" cy="54" r="2.2" fill="#AF421F" />
                <path
                  d="M30 59C29.5 56.5 31.5 55 33.5 55C35.5 55 37.5 56.5 37 59C36.5 60.5 35 61.5 33.5 61.5C32 61.5 30.5 60.5 30 59Z"
                  fill="#AF421F"
                />
                <path
                  d="M64 64C64 46 78 32 96 32C110 32 120 42 122 56L124 64H64Z"
                  stroke="#AF421F"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M78 36C72 38 68 45 70 52C72 56 78 56 82 50"
                  stroke="#AF421F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="92" cy="46" r="1.8" fill="#AF421F" />
                <path
                  d="M122 64C122 50 132 40 144 40C156 40 164 50 164 64H122Z"
                  stroke="#AF421F"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M132 42L135 32L141 39M153 42L150 32L144 39"
                  stroke="#AF421F"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M52 65H172"
                  stroke="#AF421F"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="sm:hidden flex items-center justify-between w-full min-h-[44px] px-3.5 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-bold text-[#142820]"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-[#0E513B] shrink-0" />
                <span className="truncate">
                  {locationLabel || 'Thủ Đức, TP.HCM'}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#52605A] shrink-0" />
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#52605A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, đặc điểm, khu vực..."
                  className="w-full h-11 pl-10 pr-8 rounded-[10px] bg-white border border-[#DDDCD4] text-xs sm:text-sm text-[#142820] placeholder-[#52605A]/75 focus:border-[#0E513B] outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F1EFE8] text-xs flex items-center justify-center text-[#142820]"
                    aria-label="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                <input
                  ref={visualInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleVisualFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => visualInputRef.current?.click()}
                  disabled={visualAnalyzing}
                  className={`flex-1 sm:flex-none min-h-[44px] px-3.5 rounded-[10px] border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    visualSearchImage
                      ? 'bg-[#E8EFE6] border-[#0E513B] text-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] hover:border-[#0E513B] text-[#142820]'
                  }`}
                  title="Tải ảnh lên để lọc các bài viết có hình ảnh thú cưng trùng khớp"
                >
                  {visualAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E513B] shrink-0" />
                  ) : (
                    <Camera className="w-4 h-4 text-[#0E513B] shrink-0" />
                  )}
                  <span className="truncate">
                    {visualAnalyzing ? 'Đang đối chiếu...' : 'Tìm bằng ảnh'}
                  </span>
                </button>

                {onTriggerUpdate && (
                  <button
                    type="button"
                    onClick={onTriggerUpdate}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none min-h-[44px] px-3.5 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-[#142820] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-65"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 text-[#0E513B] shrink-0 ${
                        isUpdating ? 'animate-spin' : ''
                      }`}
                    />
                    <span className="truncate">
                      {isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenFilterModal}
                  className="min-h-[44px] px-3.5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>Bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-[#0E513B] text-[10px] font-extrabold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {visualSearchImage && (
              <div className="p-3.5 rounded-xl bg-white border border-[#0E513B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={visualSearchImage}
                    alt="Ảnh đang dùng để tìm kiếm"
                    className="w-14 h-14 rounded-lg object-cover border border-[#DDDCD4] shrink-0"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-[#142820]">
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
                              className="px-2 py-0.5 rounded bg-[#E8EFE6] text-[#0E513B] text-[11px] font-semibold"
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
                    className="min-h-[38px] px-3 rounded-[10px] border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#F1EFE8] text-xs font-semibold text-[#142820]"
                  >
                    Đổi ảnh khác
                  </button>
                  <button
                    type="button"
                    onClick={clearVisualSearch}
                    className="min-h-[38px] px-3 rounded-[10px] bg-[#FFF0E5] text-[#AF421F] text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bỏ lọc ảnh</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('ALL')}
                  aria-pressed={category === 'ALL'}
                  className={`min-h-[42px] px-3.5 rounded-[10px] text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-colors ${
                    category === 'ALL'
                      ? 'bg-[#0E513B] text-white border-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>Tất cả</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('RESCUE')}
                  aria-pressed={category === 'RESCUE'}
                  className={`min-h-[42px] px-3.5 rounded-[10px] text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-colors ${
                    category === 'RESCUE'
                      ? 'bg-[#0E513B] text-white border-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <LifeBuoy
                    className={`w-4 h-4 shrink-0 ${
                      category === 'RESCUE' ? 'text-white' : 'text-[#AF421F]'
                    }`}
                  />
                  <span>Cứu trợ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('LOST')}
                  aria-pressed={category === 'LOST'}
                  className={`min-h-[42px] px-3.5 rounded-[10px] text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-colors ${
                    category === 'LOST'
                      ? 'bg-[#0E513B] text-white border-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <PawCategoryIcon
                    className={`w-4 h-4 shrink-0 ${
                      category === 'LOST' ? 'text-white' : 'text-[#80570D]'
                    }`}
                  />
                  <span>Thú lạc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('ADOPT')}
                  aria-pressed={category === 'ADOPT'}
                  className={`min-h-[42px] px-3.5 rounded-[10px] text-xs sm:text-sm font-bold border flex items-center justify-center gap-2 transition-colors ${
                    category === 'ADOPT'
                      ? 'bg-[#0E513B] text-white border-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <Home
                    className={`w-4 h-4 shrink-0 ${
                      category === 'ADOPT' ? 'text-white' : 'text-[#0E513B]'
                    }`}
                  />
                  <span>Nhận nuôi</span>
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                <div className="flex items-baseline gap-1.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#142820]">
                    {isSavedView ? 'Đã lưu' : 'Tin quanh bạn'}
                  </h2>
                  <span className="text-xs font-semibold text-[#52605A]">
                    ({filteredSpots.length} tin)
                  </span>
                </div>

                <div className="relative shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-[42px] pl-3 pr-8 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-bold text-[#142820] appearance-none cursor-pointer outline-none hover:border-[#0E513B]"
                    aria-label="Sắp xếp kết quả"
                  >
                    <option value="NEAREST">Gần nhất</option>
                    <option value="NEWEST">Mới nhất</option>
                    <option value="URGENT">Ưu tiên SOS</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#52605A] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {filteredSpots.length === 0 ? (
              <div className="p-8 sm:p-10 text-center rounded-xl bg-white border border-[#DDDCD4] space-y-3">
                <p className="text-sm sm:text-base font-bold text-[#142820]">
                  {visualSearchImage
                    ? 'Không tìm thấy bài viết nào có hình ảnh trùng khớp cao'
                    : isSavedView
                    ? 'Bạn chưa lưu bài viết nào'
                    : 'Không tìm thấy bài viết nào phù hợp'}
                </p>
                <p className="text-xs text-[#52605A]">
                  {visualSearchImage
                    ? 'Hệ thống chỉ lọc ra những bài viết có cùng loài và đặc điểm ngoại hình tương đồng với ảnh bạn tải lên.'
                    : isSavedView
                    ? 'Bấm biểu tượng trái tim ở dưới mỗi bài viết để lưu lại.'
                    : 'Thử tìm với từ khóa khác hoặc đặt lại bộ lọc.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (visualSearchImage) {
                      clearVisualSearch();
                    } else if (isSavedView && onBackToExplore) {
                      onBackToExplore();
                    } else {
                      setCategory('ALL');
                      setSearchQuery('');
                      onChangeRegionFilter('ALL');
                      onChangeOriginFilter('ALL');
                    }
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-[10px] bg-[#0E513B] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {visualSearchImage
                      ? 'Bỏ lọc ảnh & Xem tất cả'
                      : isSavedView
                      ? 'Quay lại khám phá'
                      : 'Xem tất cả'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-stretch min-w-0">
                {filteredSpots.map((spot) => (
                  <PetCard
                    key={spot.id}
                    spot={spot}
                    userCoords={userCoords}
                    onSelectDetail={onSelectDetail}
                    onToggleSave={onToggleSaveSpot}
                    isSaved={savedSpotIds.has(spot.id)}
                    matchInfo={
                      visualSearchImage
                        ? visualMatchMap.get(spot.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            <div className="lg:hidden flex flex-col gap-4 pt-2">
              <ContextMapCard
                spots={spots}
                onOpenFullMap={onOpenFullMap}
                onOpenLocationPicker={onOpenLocationPicker}
                userCoords={userCoords}
              />
              <SuccessStoryCard onOpenStory={onOpenStory} />
            </div>
          </div>

          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-20">
            <ContextMapCard
              spots={spots}
              onOpenFullMap={onOpenFullMap}
              onOpenLocationPicker={onOpenLocationPicker}
              userCoords={userCoords}
            />

            <SuccessStoryCard onOpenStory={onOpenStory} />
          </aside>
        </div>
      </div>
    </div>
  );
}
