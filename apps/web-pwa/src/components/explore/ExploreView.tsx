'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Heart,
  Home,
  LifeBuoy,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
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
  onChangeRegionFilter: _onChangeRegionFilter,
  originFilter,
  onChangeOriginFilter: _onChangeOriginFilter,
  isSavedView = false,
  onBackToExplore,
  onTriggerUpdate,
  isUpdating = false,
}: ExploreViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEAREST');

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
  }, [spots, category, searchQuery, sortBy, userCoords.lat, userCoords.lng]);

  const activeFiltersCount =
    (category !== 'ALL' ? 1 : 0) +
    (regionFilter !== 'ALL' ? 1 : 0) +
    (originFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="w-full min-h-screen bg-[#FAF7F1] pb-24 md:pb-16 text-[#142820]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="hidden sm:block text-2xl sm:text-[34px] font-extrabold tracking-tight text-[#142820] leading-tight font-sans">
                  Một kết nối nhỏ. Một mái ấm mới.
                </h1>
                <h1 className="sm:hidden text-[24px] font-extrabold tracking-tight text-[#142820] leading-tight font-sans">
                  Gần bạn, có bé cần giúp.
                </h1>
                <p className="hidden sm:block text-sm sm:text-base text-[#52605A]">
                  Cứu trợ, tìm thú lạc và nhận nuôi quanh bạn.
                </p>
              </div>

              <DogCatLineArt className="hidden sm:block w-[130px] lg:w-[150px] shrink-0" />
            </div>

            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="sm:hidden flex items-center justify-between w-full h-11 px-3.5 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] shadow-sm active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 text-[#0E513B] shrink-0" />
                <span className="truncate">{locationLabel || 'Thủ Đức, TP.HCM'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#52605A] shrink-0" />
            </button>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#52605A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bé, khu vực..."
                  className="w-full h-12 pl-10 pr-9 rounded-[10px] bg-white border border-[#DDDCD4] text-sm text-[#142820] placeholder-[#52605A]/70 focus:border-[#0E513B] focus:ring-1 focus:ring-[#0E513B] outline-none shadow-sm transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/10 text-xs flex items-center justify-center text-[#52605A]"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              {onTriggerUpdate && (
                <button
                  type="button"
                  onClick={onTriggerUpdate}
                  disabled={isUpdating}
                  className="h-12 px-3 sm:px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm active:scale-95 transition-all shrink-0 disabled:opacity-75"
                  title="Cập nhật bài viết mới nhất từ cộng đồng"
                  aria-label="Cập nhật tin mới"
                >
                  <RotateCcw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {isUpdating ? 'Đang cập nhật...' : 'Cập nhật tin mới'}
                  </span>
                  <span className="sm:hidden">
                    {isUpdating ? '...' : 'Cập nhật'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenFilterModal}
                className="h-12 px-3 sm:px-4 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-sm font-semibold text-[#142820] flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all shrink-0"
                title="Mở bộ lọc chi tiết"
                aria-label="Mở bộ lọc"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#142820]" />
                <span className="hidden sm:inline">Bộ lọc</span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#0E513B] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                {
                  id: 'ALL' as ExploreCategory,
                  label: 'Tất cả',
                  icon: Compass,
                  colorClass: 'text-[#0E513B]',
                },
                {
                  id: 'RESCUE' as ExploreCategory,
                  label: 'Cứu trợ',
                  icon: LifeBuoy,
                  colorClass: 'text-[#AF421F]',
                },
                {
                  id: 'LOST' as ExploreCategory,
                  label: 'Thú lạc',
                  icon: MapPin,
                  colorClass: 'text-[#80570D]',
                },
                {
                  id: 'ADOPT' as ExploreCategory,
                  label: 'Nhận nuôi',
                  icon: Home,
                  colorClass: 'text-[#0E513B]',
                },
              ].map((cat) => {
                const Icon = cat.icon;
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`h-12 px-3 rounded-[10px] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border ${
                      active
                        ? 'bg-[#0E513B] text-white border-[#0E513B] shadow-sm'
                        : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:bg-[#E8EFE6] hover:border-[#DDDCD4]'
                    }`}
                    aria-pressed={active}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-white' : cat.colorClass
                      }`}
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <h2 className="text-lg sm:text-[22px] font-bold text-[#142820]">
                {isSavedView ? `Tin bạn đã lưu (${filteredSpots.length})` : 'Cần bạn hôm nay'}
              </h2>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-9 pl-3 pr-7 rounded-[8px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] appearance-none cursor-pointer outline-none hover:border-[#0E513B] transition-colors shadow-sm"
                  aria-label="Sắp xếp kết quả"
                >
                  <option value="NEAREST">Gần nhất</option>
                  <option value="NEWEST">Mới nhất</option>
                  <option value="URGENT">Ưu tiên SOS</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#52605A] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {filteredSpots.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-[14px] bg-white border border-[#DDDCD4] space-y-3">
                <p className="text-base font-bold text-[#142820]">
                  {isSavedView
                    ? 'Bạn chưa lưu bài viết nào'
                    : 'Không tìm thấy bài viết nào phù hợp'}
                </p>
                <p className="text-xs text-[#52605A]">
                  {isSavedView
                    ? 'Hãy bấm biểu tượng trái tim ở góc thẻ để lưu lại các bé bạn quan tâm.'
                    : 'Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc danh mục.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (isSavedView && onBackToExplore) {
                      onBackToExplore();
                    } else {
                      setCategory('ALL');
                      setSearchQuery('');
                    }
                  }}
                  className="px-4 py-2 rounded-[10px] bg-[#0E513B] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {isSavedView ? 'Khám phá các bé ngay' : 'Xem tất cả các bé'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
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

            <div className="text-center py-5 border-t border-[#DDDCD4]/60 mt-2 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#52605A]">
              <Heart className="w-4 h-4 text-[#AF421F] fill-[#AF421F] shrink-0" />
              <span>Không thể đón bé? Một lượt chia sẻ cũng là một cơ hội.</span>
            </div>
          </div>

          <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-24">
            <ContextMapCard
              spots={spots}
              onOpenFullMap={onOpenFullMap}
              userCoords={userCoords}
            />

            <SuccessStoryCard onOpenStory={onOpenStory} />
          </div>
        </div>
      </div>
    </div>
  );
}
