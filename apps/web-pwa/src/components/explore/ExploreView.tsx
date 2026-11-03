'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronRight,
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
import { DomSpot, ExploreCategory, OriginFilter, RegionFilter } from '@/lib/types';
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
  const [visualSearchImage, setVisualSearchImage] = useState<string | null>(null);
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
    const map = new Map<string, { matchPercent: number; matchReasons: string[] }>();
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
      if (category === 'RESCUE') {
        if (spot.spotType !== 'RED_SOS') return false;
      } else if (category === 'LOST') {
        if (spot.spotType !== 'ORANGE_SIGHT') return false;
      } else if (category === 'ADOPT') {
        if (
          spot.spotType !== 'YELLOW_ADOPT' &&
          spot.entityCategory !== 'RESCUE_CENTER'
        ) {
          return false;
        }
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
    <div className="w-full min-h-screen bg-[#FAF7F1] pb-24 md:pb-16 text-[#142820]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#142820]">
                  {isSavedView
                    ? 'Bài viết bạn đã lưu'
                    : 'Cứu trợ, tìm thú lạc & nhận nuôi quanh bạn'}
                </h1>
                <p className="text-xs sm:text-sm text-[#52605A] mt-0.5">
                  Tra cứu theo khu vực hoặc tải ảnh lên để lọc những bài viết có hình ảnh trùng khớp.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenLocationPicker}
                className="sm:hidden flex items-center justify-between w-full h-10 px-3 rounded-lg bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820]"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span className="truncate">{locationLabel || 'Thủ Đức, TP.HCM'}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#52605A] shrink-0" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#52605A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo giống chó mèo, màu lông, khu vực..."
                  className="w-full h-11 pl-9 pr-8 rounded-lg bg-white border border-[#DDDCD4] text-xs sm:text-sm text-[#142820] placeholder-[#52605A]/75 focus:border-[#0E513B] outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F1EFE8] text-xs flex items-center justify-center text-[#142820]"
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
                  className={`flex-1 sm:flex-none h-11 px-3.5 rounded-lg border text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    visualSearchImage
                      ? 'bg-[#E8EFE6] border-[#0E513B] text-[#0E513B]'
                      : 'bg-white border-[#DDDCD4] hover:border-[#0E513B] text-[#142820]'
                  }`}
                  title="Tải ảnh lên để lọc các bài viết có hình ảnh thú cưng trùng khớp"
                >
                  {visualAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E513B]" />
                  ) : (
                    <Camera className="w-4 h-4 text-[#0E513B]" />
                  )}
                  <span>
                    {visualAnalyzing ? 'Đang đối chiếu ảnh...' : 'Tìm bằng ảnh'}
                  </span>
                </button>

                {onTriggerUpdate && (
                  <button
                    type="button"
                    onClick={onTriggerUpdate}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none h-11 px-3.5 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span>{isUpdating ? 'Đang cập nhật...' : 'Cập nhật'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenFilterModal}
                  className="h-11 px-3.5 rounded-lg bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs sm:text-sm font-semibold text-[#142820] flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#142820]" />
                  <span>Bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#0E513B] text-white text-[10px] font-bold flex items-center justify-center">
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
                    className="h-9 px-3 rounded-lg border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#F1EFE8] text-xs font-semibold text-[#142820]"
                  >
                    Đổi ảnh khác
                  </button>
                  <button
                    type="button"
                    onClick={clearVisualSearch}
                    className="h-9 px-3 rounded-lg bg-[#FFF0E5] text-[#AF421F] text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bỏ lọc ảnh</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#DDDCD4]">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'ALL' as ExploreCategory, label: 'Tất cả' },
                  { id: 'RESCUE' as ExploreCategory, label: 'Cứu trợ' },
                  { id: 'LOST' as ExploreCategory, label: 'Thú lạc' },
                  { id: 'ADOPT' as ExploreCategory, label: 'Nhận nuôi' },
                ].map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`h-9 px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                        active
                          ? 'bg-[#0E513B] text-white'
                          : 'bg-white border border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[#52605A] hidden sm:inline">
                  {filteredSpots.length} kết quả
                </span>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-9 pl-2.5 pr-7 rounded-lg bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] appearance-none cursor-pointer outline-none hover:border-[#0E513B]"
                    aria-label="Sắp xếp kết quả"
                  >
                    <option value="NEAREST">Gần nhất</option>
                    <option value="NEWEST">Mới nhất</option>
                    <option value="URGENT">Ưu tiên SOS</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#52605A] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
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
                    ? 'Bấm biểu tượng trái tim ở góc ảnh mỗi bài viết để lưu lại.'
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
                  className="px-4 py-2 rounded-lg bg-[#0E513B] text-white text-xs font-semibold inline-flex items-center gap-1.5"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                userCoords={userCoords}
              />
              <SuccessStoryCard onOpenStory={onOpenStory} />
            </div>
          </div>

          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-20">
            <ContextMapCard
              spots={spots}
              onOpenFullMap={onOpenFullMap}
              userCoords={userCoords}
            />

            <SuccessStoryCard onOpenStory={onOpenStory} />
          </aside>
        </div>
      </div>
    </div>
  );
}
