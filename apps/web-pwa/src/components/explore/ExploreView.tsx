'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Feather,
  Heart,
  Home,
  LifeBuoy,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import DogCatLineArt from '@/components/illustrations/DogCatLineArt';
import PetCard from '@/components/explore/PetCard';
import ContextMapCard from '@/components/explore/ContextMapCard';
import SuccessStoryCard from '@/components/explore/SuccessStoryCard';
import { DomSpot, ExploreCategory, OriginFilter, RegionFilter } from '@/lib/types';
import { calculateDistanceMeters } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

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

  const categoryCounts = useMemo(() => {
    const base = isSavedView
      ? spots.filter((s) => savedSpotIds.has(s.id))
      : spots;
    return {
      ALL: base.length,
      RESCUE: base.filter((s) => s.spotType === 'RED_SOS').length,
      LOST: base.filter((s) => s.spotType === 'ORANGE_SIGHT').length,
      ADOPT: base.filter(
        (s) =>
          s.spotType === 'YELLOW_ADOPT' ||
          s.entityCategory === 'RESCUE_CENTER'
      ).length,
    };
  }, [spots, isSavedView, savedSpotIds]);

  const filteredSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceSpots = isSavedView
      ? spots.filter((s) => savedSpotIds.has(s.id))
      : spots;

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
      <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-10 py-4 sm:py-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-5">
            <section className="hero-sanctuary-surface relative rounded-[22px] sm:rounded-[26px] border border-[#DDDCD4] p-4 sm:p-7 overflow-hidden shadow-[0_8px_30px_rgba(20,40,32,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE6] border border-[#0E513B]/15 text-[#0E513B] text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#0E513B] animate-pulse" />
                  <span>Nhịp cầu cứu trợ &amp; nhận nuôi thực tế</span>
                </div>

                <button
                  type="button"
                  onClick={onOpenLocationPicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-semibold text-[#142820] shadow-sm transition-all active:scale-95 max-w-full"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#AF421F] shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-[240px]">
                    {locationLabel || 'Thủ Đức, TP.HCM'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2.5 max-w-xl">
                  <h1 className="text-2xl sm:text-[34px] font-extrabold tracking-tight text-[#142820] leading-[1.18]">
                    Một kết nối nhỏ.{' '}
                    <span className="font-serif-letter italic text-[#0E513B] font-bold">
                      Một mái ấm mới.
                    </span>
                  </h1>
                  <p className="text-xs sm:text-[15px] text-[#52605A] leading-relaxed">
                    Mỗi bài đăng trên Đốm Nhỏ là một sinh linh có thật đang chờ được giúp đỡ, tìm lại gia đình hoặc đón về một mái nhà yêu thương quanh bạn.
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={onOpenStory}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FFF0E5] hover:bg-[#FFE4D1] border border-[#AF421F]/25 text-[#AF421F] text-xs font-bold transition-all active:scale-95 shadow-sm"
                    >
                      <Feather className="w-3.5 h-3.5" />
                      <span>Đọc bức thư về mục đích dự án →</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenFullMap}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-[#F1EFE8] border border-[#DDDCD4] text-[#142820] text-xs font-bold transition-all active:scale-95 shadow-sm"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#0E513B]" />
                      <span>Mở bản đồ ({spots.filter((s) => isSpotPinAllowedOnMap(s)).length} ghim)</span>
                    </button>
                  </div>
                </div>

                <DogCatLineArt className="hidden sm:block w-[135px] lg:w-[155px] shrink-0" />
              </div>
            </section>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#52605A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo giống chó mèo, màu lông, tên trạm hoặc khu vực..."
                  className="w-full h-12 pl-10 pr-9 rounded-[12px] bg-white border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder-[#52605A]/75 focus:border-[#0E513B] focus:ring-2 focus:ring-[#0E513B]/15 outline-none shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F1EFE8] hover:bg-[#DDDCD4] text-xs flex items-center justify-center text-[#142820]"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onTriggerUpdate && (
                  <button
                    type="button"
                    onClick={onTriggerUpdate}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none h-11 sm:h-12 px-4 rounded-[12px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all disabled:opacity-75"
                    title="Cập nhật bài viết mới nhất từ cộng đồng"
                    aria-label="Cập nhật tin mới"
                  >
                    <RotateCcw className={`w-4 h-4 shrink-0 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span>
                      {isUpdating ? 'Đang cập nhật...' : 'Cập nhật tin mới'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenFilterModal}
                  className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-[12px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs sm:text-sm font-bold text-[#142820] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all shrink-0"
                  title="Mở bộ lọc chi tiết"
                  aria-label="Mở bộ lọc"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#0E513B]" />
                  <span>Bộ lọc</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#AF421F] text-white text-[10px] font-extrabold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: 'ALL' as ExploreCategory,
                  label: 'Tất cả',
                  sub: 'Mọi nhu cầu',
                  count: categoryCounts.ALL,
                  icon: Compass,
                  colorClass: 'text-[#0E513B]',
                  badgeBg: 'bg-[#E8EFE6] text-[#0E513B]',
                },
                {
                  id: 'RESCUE' as ExploreCategory,
                  label: 'Cứu trợ',
                  sub: 'Khẩn cấp SOS',
                  count: categoryCounts.RESCUE,
                  icon: LifeBuoy,
                  colorClass: 'text-[#AF421F]',
                  badgeBg: 'bg-[#FFF0E5] text-[#AF421F]',
                },
                {
                  id: 'LOST' as ExploreCategory,
                  label: 'Thú lạc',
                  sub: 'Tìm về nhà',
                  count: categoryCounts.LOST,
                  icon: MapPin,
                  colorClass: 'text-[#80570D]',
                  badgeBg: 'bg-[#FFF3D8] text-[#80570D]',
                },
                {
                  id: 'ADOPT' as ExploreCategory,
                  label: 'Nhận nuôi',
                  sub: 'Chờ mái ấm',
                  count: categoryCounts.ADOPT,
                  icon: Home,
                  colorClass: 'text-[#0E513B]',
                  badgeBg: 'bg-[#E8EFE6] text-[#0E513B]',
                },
              ].map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-[14px] text-left flex items-center justify-between gap-2 transition-all active:scale-95 border ${
                      active
                        ? 'bg-[#0E513B] text-white border-[#0E513B] shadow-md'
                        : 'bg-white text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]/50 hover:bg-[#FAF7F1]'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          active ? 'bg-white/15 text-white' : cat.badgeBg
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">
                          {cat.label}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            active ? 'text-white/80' : 'text-[#52605A]'
                          }`}
                        >
                          {cat.sub}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${
                        active
                          ? 'bg-white text-[#0E513B]'
                          : 'bg-[#F1EFE8] text-[#142820]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-[20px] font-extrabold text-[#142820]">
                  {isSavedView
                    ? `Bài viết bạn đã lưu (${filteredSpots.length})`
                    : `Các bé đang cần hỗ trợ (${filteredSpots.length})`}
                </h2>

                {(regionFilter !== 'ALL' || originFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeRegionFilter('ALL');
                      onChangeOriginFilter('ALL');
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#FFF0E5] text-[#AF421F] text-[11px] font-bold flex items-center gap-1 hover:bg-[#FFE4D1] transition-colors"
                  >
                    <span>Đang bật bộ lọc vùng/nguồn • Xóa lọc ✕</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-[#F1EFE8] p-1 rounded-[10px] border border-[#DDDCD4]/70">
                  {[
                    { id: 'ALL' as RegionFilter, label: 'Toàn quốc' },
                    { id: 'SOUTH' as RegionFilter, label: 'Miền Nam' },
                    { id: 'CENTRAL' as RegionFilter, label: 'Miền Trung' },
                    { id: 'NORTH' as RegionFilter, label: 'Miền Bắc' },
                  ].map((r) => {
                    const active = regionFilter === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onChangeRegionFilter(r.id)}
                        className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold transition-all ${
                          active
                            ? 'bg-white text-[#0E513B] shadow-sm'
                            : 'text-[#52605A] hover:text-[#142820]'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="h-9 pl-3 pr-7 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-bold text-[#142820] appearance-none cursor-pointer outline-none hover:border-[#0E513B] transition-colors shadow-sm"
                    aria-label="Sắp xếp kết quả"
                  >
                    <option value="NEAREST">Gần bạn nhất</option>
                    <option value="NEWEST">Mới cập nhật</option>
                    <option value="URGENT">Ưu tiên SOS</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#52605A] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {filteredSpots.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-[18px] bg-white border border-[#DDDCD4] space-y-3 shadow-sm">
                <p className="text-base font-bold text-[#142820]">
                  {isSavedView
                    ? 'Bạn chưa lưu bài viết nào'
                    : 'Không tìm thấy bài viết nào phù hợp'}
                </p>
                <p className="text-xs sm:text-sm text-[#52605A] max-w-md mx-auto">
                  {isSavedView
                    ? 'Hãy bấm biểu tượng trái tim ở góc trên bên phải mỗi bài viết để lưu lại những trường hợp bạn quan tâm.'
                    : 'Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc danh mục để xem tất cả các bé.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (isSavedView && onBackToExplore) {
                      onBackToExplore();
                    } else {
                      setCategory('ALL');
                      setSearchQuery('');
                      onChangeRegionFilter('ALL');
                      onChangeOriginFilter('ALL');
                    }
                  }}
                  className="px-4 py-2.5 rounded-[10px] bg-[#0E513B] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {isSavedView ? 'Khám phá các bé ngay' : 'Xem tất cả các bé'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {filteredSpots.map((spot) => (
                  <PetCard
                    key={spot.id}
                    spot={spot}
                    userCoords={userCoords}
                    onSelectDetail={onSelectDetail}
                    onToggleSave={onToggleSaveSpot}
                    isSaved={savedSpotIds.has(spot.id)}
                  />
                ))}
              </div>
            )}

            <div className="lg:hidden flex flex-col gap-5 pt-3">
              <SuccessStoryCard onOpenStory={onOpenStory} />
              <ContextMapCard
                spots={spots}
                onOpenFullMap={onOpenFullMap}
                userCoords={userCoords}
              />
            </div>

            <div className="text-center py-5 border-t border-[#DDDCD4]/70 mt-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#52605A]">
              <Heart className="w-4 h-4 text-[#AF421F] fill-[#AF421F] shrink-0" />
              <span>Không thể đón bé? Một lượt chia sẻ của bạn cũng là một cơ hội đổi đời cho bé.</span>
            </div>
          </div>

          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-24">
            <SuccessStoryCard onOpenStory={onOpenStory} />

            <ContextMapCard
              spots={spots}
              onOpenFullMap={onOpenFullMap}
              userCoords={userCoords}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
