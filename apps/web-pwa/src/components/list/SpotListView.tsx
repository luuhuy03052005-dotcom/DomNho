'use client';

import React, { useMemo, useState } from 'react';
import {
  Camera,
  Compass,
  ExternalLink,
  Flame,
  MapPin,
  MessageCircle,
  Navigation,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import {
  DomSpot,
  OriginFilter,
  PlatformFilter,
  RegionFilter,
  ThemeId,
  VetStation,
  detectPlatformFromUrl,
  detectRegionFromAddress,
  getFriendlySourceName,
  getPlatformBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { DOM_THEMES, SPOT_LEXICON } from '@/lib/themes';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface SpotListViewProps {
  themeId: ThemeId;
  spots: DomSpot[];
  vetStations: VetStation[];
  showVetStations: boolean;
  userCoords: { lat: number; lng: number; label: string };
  originFilter: OriginFilter;
  onChangeOriginFilter: (origin: OriginFilter) => void;
  regionFilter?: RegionFilter;
  onChangeRegionFilter?: (reg: RegionFilter) => void;
  onSelectSpotDetail: (spot: DomSpot) => void;
  onFocusSpotOnMap: (spot: DomSpot) => void;
  onOpenCameraModal: () => void;
  onOpenCrawlHub?: () => void;
  onBoostLight: (spotId: string) => void;
}

type SortOption = 'NEWEST' | 'NEAREST' | 'URGENT';

const PLATFORM_TABS: { id: PlatformFilter; label: string }[] = [
  { id: 'ALL', label: 'Tất cả nền tảng' },
  { id: 'FACEBOOK', label: 'Facebook' },
  { id: 'INSTAGRAM', label: 'Instagram' },
  { id: 'THREADS', label: 'Threads' },
  { id: 'TIKTOK', label: 'TikTok' },
  { id: 'YOUTUBE', label: 'YouTube' },
  { id: 'RESCUE_PORTAL', label: 'Trạm Cứu Hộ' },
  { id: 'SOCIAL_MEDIA', label: 'Báo chí & Cộng đồng' },
];

export default function SpotListView({
  themeId,
  spots,
  vetStations,
  showVetStations,
  userCoords,
  originFilter,
  onChangeOriginFilter,
  regionFilter = 'ALL',
  onChangeRegionFilter,
  onSelectSpotDetail,
  onFocusSpotOnMap,
  onOpenCameraModal,
  onOpenCrawlHub,
  onBoostLight,
}: SpotListViewProps) {
  const theme = DOM_THEMES[themeId];
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEAREST');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('ALL');

  const counts = useMemo(() => {
    const userCount = spots.filter((s) => isUserWebPost(s)).length;
    const externalCount = spots.length - userCount;
    return {
      all: spots.length,
      user: userCount,
      external: externalCount,
    };
  }, [spots]);

  const platformCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: spots.length };
    for (const s of spots) {
      if (isUserWebPost(s)) continue;
      const p = detectPlatformFromUrl(s.sourceUrl, s.sourcePlatform);
      map[p] = (map[p] || 0) + 1;
      if (s.entityCategory === 'RESCUE_CENTER' && p !== 'RESCUE_PORTAL') {
        map.RESCUE_PORTAL = (map.RESCUE_PORTAL || 0) + 1;
      }
    }
    return map;
  }, [spots]);

  const displayedSpots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = spots.filter((spot) => {
      if (originFilter === 'USER_POST' && !isUserWebPost(spot)) return false;
      if (originFilter === 'EXTERNAL' && isUserWebPost(spot)) return false;

      if (regionFilter !== 'ALL') {
        const spotRegion = detectRegionFromAddress(
          spot.formattedAddress || spot.areaLabel,
          spot.publicLat
        );
        if (spotRegion !== 'ALL' && spotRegion !== regionFilter) {
          return false;
        }
      }

      if (platformFilter !== 'ALL') {
        if (isUserWebPost(spot)) return false;
        const p = detectPlatformFromUrl(spot.sourceUrl, spot.sourcePlatform);
        const matchPlatform =
          p === platformFilter ||
          (platformFilter === 'RESCUE_PORTAL' &&
            spot.entityCategory === 'RESCUE_CENTER');
        if (!matchPlatform) return false;
      }

      if (!q) return true;
      const sourceName = getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );
      const haystack = [
        spot.title,
        spot.story,
        spot.authorName,
        sourceName,
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
    originFilter,
    regionFilter,
    platformFilter,
    searchQuery,
    sortBy,
    userCoords.lat,
    userCoords.lng,
  ]);

  return (
    <div
      className="relative w-full h-full overflow-y-auto pt-24 pb-28 px-3 sm:px-6"
      style={{ backgroundColor: theme.bgHex, color: theme.textHex }}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        <div
          className="p-4 sm:p-5 rounded-[28px] shadow-md backdrop-blur-xl space-y-3.5"
          style={{ backgroundColor: theme.frostedSheetBg }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">
                Danh Sách Cứu Trợ, Tìm Thú Lạc & Nhận Nuôi Đa Nguồn
              </h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: theme.mutedTextHex }}
              >
                Tổng hợp từ Facebook, Instagram, Threads, TikTok, Báo chí & Bài tự đăng trên Web • Bài chưa rõ số nhà hiển thị đầy đủ tại đây.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {onOpenCrawlHub && (
                <button
                  type="button"
                  onClick={onOpenCrawlHub}
                  className="px-3.5 py-2.5 rounded-full text-xs font-bold bg-[#133E35] text-white shadow-md flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cập nhật tin mới</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenCameraModal}
                className="px-4 py-2.5 rounded-full text-xs font-bold text-white shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #D2673B 0%, #E63946 100%)',
                }}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng tin</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div
              className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-black/5"
              style={{ backgroundColor: theme.pillBg }}
            >
              <Search className="w-4 h-4 opacity-60 shrink-0 text-[#133E35]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm trạm cứu hộ, khu vực, giống chó mèo..."
                className="w-full bg-transparent text-xs outline-none"
                style={{ color: theme.textHex }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-black/5 text-xs opacity-60"
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {onChangeRegionFilter && (
                <div className="relative">
                  <select
                    value={regionFilter}
                    onChange={(e) => onChangeRegionFilter(e.target.value as RegionFilter)}
                    className="h-10 px-3 pr-7 rounded-2xl text-xs font-bold appearance-none cursor-pointer border border-black/5 outline-none transition-colors"
                    style={{
                      backgroundColor: regionFilter !== 'ALL' ? '#133E35' : theme.pillBg,
                      color: regionFilter !== 'ALL' ? '#FFFFFF' : theme.textHex,
                    }}
                    title="Lọc theo miền khu vực"
                  >
                    <option value="ALL" className="text-black bg-white">Toàn quốc</option>
                    <option value="SOUTH" className="text-black bg-white">Miền Nam</option>
                    <option value="CENTRAL" className="text-black bg-white">Miền Trung</option>
                    <option value="NORTH" className="text-black bg-white">Miền Bắc</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">
                    ▼
                  </span>
                </div>
              )}

              <div className="relative">
                <select
                  value={
                    originFilter === 'USER_POST'
                      ? 'USER_POST'
                      : platformFilter !== 'ALL'
                      ? platformFilter
                      : 'ALL'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ALL') {
                      onChangeOriginFilter('ALL');
                      setPlatformFilter('ALL');
                    } else if (val === 'USER_POST') {
                      onChangeOriginFilter('USER_POST');
                      setPlatformFilter('ALL');
                    } else {
                      onChangeOriginFilter('EXTERNAL');
                      setPlatformFilter(val as PlatformFilter);
                    }
                  }}
                  className="h-10 px-3 pr-7 rounded-2xl text-xs font-bold appearance-none cursor-pointer border border-black/5 outline-none transition-colors"
                  style={{
                    backgroundColor:
                      originFilter !== 'ALL' || platformFilter !== 'ALL'
                        ? '#133E35'
                        : theme.pillBg,
                    color:
                      originFilter !== 'ALL' || platformFilter !== 'ALL'
                        ? '#FFFFFF'
                        : theme.textHex,
                  }}
                  title="Lọc theo nguồn hoặc thể loại bài viết"
                >
                  <option value="ALL" className="text-black bg-white">Tất cả nguồn bài</option>
                  <option value="USER_POST" className="text-black bg-white">Bài tự đăng trên Web ({counts.user})</option>
                  <option value="RESCUE_PORTAL" className="text-black bg-white">Trạm cứu hộ ({platformCounts.RESCUE_PORTAL || 0})</option>
                  <option value="FACEBOOK" className="text-black bg-white">Facebook ({platformCounts.FACEBOOK || 0})</option>
                  <option value="INSTAGRAM" className="text-black bg-white">Instagram ({platformCounts.INSTAGRAM || 0})</option>
                  <option value="THREADS" className="text-black bg-white">Threads ({platformCounts.THREADS || 0})</option>
                  <option value="TIKTOK" className="text-black bg-white">TikTok ({platformCounts.TIKTOK || 0})</option>
                  <option value="SOCIAL_MEDIA" className="text-black bg-white">Báo chí & Cộng đồng ({platformCounts.SOCIAL_MEDIA || 0})</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">
                  ▼
                </span>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 px-3 pr-7 rounded-2xl text-xs font-bold appearance-none cursor-pointer border border-black/5 outline-none transition-colors"
                  style={{
                    backgroundColor: sortBy === 'NEAREST' ? '#D2673B' : theme.pillBg,
                    color: sortBy === 'NEAREST' ? '#FFFFFF' : theme.textHex,
                  }}
                  title="Thứ tự sắp xếp bài viết"
                >
                  <option value="NEAREST" className="text-black bg-white">Gần bạn nhất (Ưu tiên)</option>
                  <option value="NEWEST" className="text-black bg-white">Mới nhất</option>
                  <option value="URGENT" className="text-black bg-white">Ưu tiên khẩn cấp SOS</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">
                  ▼
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-0.5 px-1" style={{ color: theme.mutedTextHex }}>
            <span className="font-medium">
              Tìm thấy <strong className="text-[#133E35] font-bold">{displayedSpots.length}</strong> bài viết
              {sortBy === 'NEAREST' ? ' • Gần vị trí của bạn hiển thị trước' : ''}
            </span>
            {(searchQuery || regionFilter !== 'ALL' || originFilter !== 'ALL' || platformFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (onChangeRegionFilter) onChangeRegionFilter('ALL');
                  onChangeOriginFilter('ALL');
                  setPlatformFilter('ALL');
                }}
                className="text-[#D2673B] font-bold hover:underline"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>

        {showVetStations && vetStations.length > 0 && (
          <div
            className="p-4 rounded-[28px] shadow-sm space-y-2.5"
            style={{ backgroundColor: theme.frostedSheetBg }}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F766E]">
              <Stethoscope className="w-4 h-4" />
              <span>Bệnh viện & Phòng khám Thú y Cấp cứu 24/7 ({vetStations.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {vetStations.map((vet) => (
                <div
                  key={vet.id}
                  className="p-3 rounded-2xl flex flex-col justify-between gap-2"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <div>
                    <p className="text-xs font-bold">🏥 {vet.name}</p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: theme.mutedTextHex }}
                    >
                      {vet.address}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {vet.hotline && (
                      <a
                        href={`tel:${vet.hotline.replace(/\s+/g, '')}`}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0F766E] text-white"
                      >
                        📞 {vet.hotline}
                      </a>
                    )}
                    {vet.googleMapsDirectionsUrl && (
                      <a
                        href={vet.googleMapsDirectionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Chỉ đường
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayedSpots.length === 0 ? (
          <div
            className="p-8 rounded-[28px] text-center space-y-3"
            style={{ backgroundColor: theme.frostedSheetBg }}
          >
            <Sparkles className="w-9 h-9 text-[#E07A5F] mx-auto" />
            <p className="text-sm font-bold">
              Chưa có bài viết nào trong nhóm nền tảng này
            </p>
            <p className="text-xs" style={{ color: theme.mutedTextHex }}>
              Bạn có thể bấm “Cập nhật tin mới” để tải thêm bài viết hoặc chọn xem toàn quốc.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  onChangeOriginFilter('ALL');
                  if (onChangeRegionFilter) onChangeRegionFilter('ALL');
                  setPlatformFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-full text-xs font-bold"
                style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
              >
                Xem tất cả bài viết
              </button>
              {onOpenCrawlHub && (
                <button
                  type="button"
                  onClick={onOpenCrawlHub}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#133E35] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cập nhật tin mới</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCameraModal}
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#D2673B]"
              >
                + Đăng tin mới
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedSpots.map((spot) => {
              const isUserPost = isUserWebPost(spot);
              const isRescueCenter = spot.entityCategory === 'RESCUE_CENTER';
              const hasMapPin = isSpotPinAllowedOnMap(spot);
              const meta = SPOT_LEXICON[spot.spotType];
              const sourceName = getFriendlySourceName(
                spot.verificationInfo?.sourceDomain,
                spot.authorName,
                spot.sourceUrl
              );
              const platformBadge = getPlatformBadgeMeta(
                spot.sourcePlatform,
                spot.sourceUrl
              );

              const distMeters = hasMapPin
                ? calculateDistanceMeters(
                    userCoords.lat,
                    userCoords.lng,
                    spot.publicLat,
                    spot.publicLng
                  )
                : null;

              const publishedLabel = spot.publishedDate
                ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : null;

              const dotHex =
                spot.spotType === 'RED_SOS'
                  ? '#E63946'
                  : spot.spotType === 'ORANGE_SIGHT'
                  ? '#E07A5F'
                  : spot.spotType === 'YELLOW_ADOPT'
                  ? '#F4A261'
                  : '#2A9D8F';

              return (
                <article
                  key={spot.id}
                  className="rounded-[28px] shadow-md overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg"
                  style={{ backgroundColor: theme.frostedSheetBg }}
                >
                  <div>
                    <div
                      onClick={() => onSelectSpotDetail(spot)}
                      className="relative w-full aspect-[16/10] bg-black/10 overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={spot.images[0]}
                        alt={spot.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, transparent 45%, rgba(0,0,0,0.75) 100%)',
                        }}
                      />

                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {distMeters !== null ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-[#D2673B] text-white shadow-md flex items-center gap-1 shrink-0 ring-1 ring-white/30">
                              <MapPin className="w-3.5 h-3.5 fill-current" />
                              <span>{formatDistanceVi(distMeters)}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#133E35] text-white shadow-sm flex items-center gap-1 shrink-0">
                              <MapPin className="w-3 h-3" />
                              <span>{spot.areaLabel}</span>
                            </span>
                          )}

                          <span
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-sm"
                            style={{
                              backgroundColor: isRescueCenter
                                ? '#0F766E'
                                : dotHex,
                            }}
                          >
                            {isRescueCenter
                              ? 'Trạm cứu trợ'
                              : meta.shortName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isUserPost ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2A9D8F] text-white shadow-sm">
                              Tự đăng
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/70 text-white backdrop-blur-md">
                              {platformBadge.shortLabel}
                            </span>
                          )}

                          {spot.images.length > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/55 text-white backdrop-blur-md">
                              {spot.images.length} ảnh
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2 text-white">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                          {distMeters !== null && (
                            <span className="font-bold text-[#F4A261]">
                              {formatDistanceVi(distMeters)} •
                            </span>
                          )}
                          <span className="truncate">
                            {spot.authorName}
                            {publishedLabel ? ` • ${publishedLabel}` : ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBoostLight(spot.id);
                          }}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E07A5F] text-white flex items-center gap-1 shrink-0 active:scale-95"
                        >
                          <Flame className="w-3 h-3 fill-current" />
                          <span>{spot.lightPower}%</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <h2
                        onClick={() => onSelectSpotDetail(spot)}
                        className="text-sm sm:text-base font-bold leading-snug cursor-pointer hover:underline line-clamp-2"
                      >
                        {spot.title}
                      </h2>

                      <p
                        className="text-xs leading-relaxed line-clamp-3"
                        style={{ color: theme.mutedTextHex }}
                      >
                        {spot.story}
                      </p>

                      {spot.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {spot.traits.map((trait) => (
                            <span
                              key={trait}
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                              style={{
                                backgroundColor: theme.pillBg,
                                color: theme.textHex,
                              }}
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}

                      <div
                        className="p-2.5 rounded-2xl flex items-start justify-between gap-2"
                        style={{ backgroundColor: theme.frostedCardBg }}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              hasMapPin ? 'text-[#E63946]' : 'text-[#E07A5F]'
                            }`}
                          />
                          <div className="min-w-0">
                            {hasMapPin ? (
                              <>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {distMeters !== null && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#D2673B]/15 text-[#D2673B]">
                                      {formatDistanceVi(distMeters)}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold truncate text-[#133E35]">
                                    {spot.formattedAddress || spot.areaLabel}
                                  </span>
                                </div>
                                <p
                                  className="text-[11px] mt-0.5"
                                  style={{ color: theme.mutedTextHex }}
                                >
                                  Đã xác định vị trí chính xác trên bản đồ
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-[#133E35]">
                                  Khu vực: {spot.areaLabel || 'Chưa rõ địa chỉ'}
                                </p>
                                <p
                                  className="text-[11px] mt-0.5"
                                  style={{ color: theme.mutedTextHex }}
                                >
                                  Chưa có số nhà cụ thể (không gán vị trí ảo)
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {hasMapPin && (
                          <button
                            type="button"
                            onClick={() => onFocusSpotOnMap(spot)}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1 shrink-0 hover:bg-[#2A9D8F] hover:text-white transition-colors"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>Bản đồ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex items-center gap-2">
                    {isUserPost ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectSpotDetail(spot)}
                          className="flex-1 py-2.5 px-3.5 rounded-full text-xs font-bold text-white bg-[#E07A5F] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Báo phát hiện / Liên hệ trên Web</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectSpotDetail(spot)}
                          className="py-2.5 px-3.5 rounded-full text-xs font-bold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center justify-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {spot.sourceUrl && (
                          <a
                            href={spot.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-2.5 px-4 rounded-full text-xs font-bold text-white bg-[#2A9D8F] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                          >
                            <span>
                              Liên hệ tại {sourceName}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectSpotDetail(spot)}
                          className="py-2.5 px-3.5 rounded-full text-xs font-semibold shrink-0"
                          style={{
                            backgroundColor: theme.pillBg,
                            color: theme.textHex,
                          }}
                        >
                          Xem nội dung
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
