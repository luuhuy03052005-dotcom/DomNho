'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronDown,
  Crosshair,
  Home,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Stethoscope,
  X,
} from 'lucide-react';
import DomNhoMapCanvas from '@/components/map/DomNhoMapCanvas';
import {
  DomSpot,
  ExploreCategory,
  VetStation,
  getFriendlySourceName,
  getSpotBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80';

interface FullMapViewProps {
  spots: DomSpot[];
  selectedSpot: DomSpot | null;
  onSelectSpot: (spot: DomSpot | null) => void;
  onOpenSpotDetail: (spot: DomSpot) => void;
  userCoords: { lat: number; lng: number; label: string; isRealGps?: boolean };
  onOpenLocationPicker: () => void;
  onRequestRealGps: () => void;
  onBackToExplore: () => void;
  onOpenCreatePost: () => void;
  vetStations: VetStation[];
  onOpenFilterModal?: () => void;
  onOpenGoogleMapsVault?: () => void;
}

function PawFilterIcon({ className = 'w-4 h-4' }: { className?: string }) {
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

export default function FullMapView({
  spots,
  selectedSpot,
  onSelectSpot,
  onOpenSpotDetail,
  userCoords,
  onOpenLocationPicker,
  onRequestRealGps,
  onBackToExplore,
  onOpenCreatePost,
  vetStations,
  onOpenFilterModal,
  onOpenGoogleMapsVault,
}: FullMapViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [showVets, setShowVets] = useState<boolean>(false);
  const [isMobileMapFilterOpen, setIsMobileMapFilterOpen] =
    useState<boolean>(false);
  const [areaQuery, setAreaQuery] = useState<string>('');
  const [focusTrigger, setFocusTrigger] = useState<{
    lat: number;
    lng: number;
    ts: number;
  } | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pinnableSpots = useMemo(
    () => spots.filter((spot) => isSpotPinAllowedOnMap(spot)),
    [spots]
  );

  const filteredSpots = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    return pinnableSpots.filter((spot) => {
      const meta = getSpotBadgeMeta(spot);
      if (category === 'RESCUE' && meta.categoryKind !== 'RESCUE') return false;
      if (category === 'LOST' && meta.categoryKind !== 'LOST') return false;
      if (category === 'ADOPT' && meta.categoryKind !== 'ADOPT') return false;

      if (!q) return true;
      const haystack = `${spot.title} ${spot.areaLabel} ${spot.formattedAddress || ''} ${spot.authorName || ''} ${spot.breed || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [pinnableSpots, category, areaQuery]);

  useEffect(() => {
    if (
      selectedSpot &&
      !filteredSpots.some((spot) => spot.id === selectedSpot.id)
    ) {
      onSelectSpot(null);
    }
  }, [filteredSpots, selectedSpot, onSelectSpot]);

  useEffect(() => {
    if (!selectedSpot) return;
    const node = cardRefs.current[selectedSpot.id];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedSpot]);

  const handleLocateMe = () => {
    onRequestRealGps();
    setFocusTrigger({
      lat: userCoords.lat,
      lng: userCoords.lng,
      ts: Date.now(),
    });
  };

  const getSpotSourceText = (spot: DomSpot) => {
    if (isUserWebPost(spot)) return 'Tự đăng';
    return getFriendlySourceName(
      spot.verificationInfo?.sourceDomain,
      spot.authorName,
      spot.sourceUrl
    );
  };

  const getCompactAreaLabel = (spot: DomSpot) => {
    const raw = spot.areaLabel || spot.formattedAddress || 'TP.HCM';
    return raw
      .replace(/^phường\s+/i, '')
      .replace(/,\s*TP\.?\s*HCM$/i, '')
      .replace(/\s*\(TP\.?\s*HCM\)$/i, '')
      .trim();
  };

  const shortUserLocationLabel = useMemo(() => {
    const raw = (userCoords.label || 'Thủ Đức').trim();
    if (/thủ đức/i.test(raw)) return 'Thủ Đức';
    return raw
      .replace(/^phường\s+/i, '')
      .replace(/,\s*TP\.?\s*HCM$/i, '')
      .split(',')[0]
      .trim();
  }, [userCoords.label]);

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(58px+env(safe-area-inset-bottom,0px))] z-20 md:static md:z-auto w-full md:h-[calc(100dvh-64px)] bg-[#F5F6F2] text-ink flex flex-col md:flex-row overflow-hidden">
      {/* MOBILE MAP TOP AREA: Priority 1 (assets/mobile-map-compact.png) */}
      <div className="md:hidden shrink-0 bg-[#F5F6F2] border-b border-[#E2E5DC] px-3 pt-[max(8px,env(safe-area-inset-top,0px))] pb-2 space-y-2 z-20 relative">
        {/* Row 1: Back + Bản đồ (Thủ Đức v) + Đăng tin */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBackToExplore}
              className="w-9 h-9 rounded-[10px] bg-white border border-[#E2E5DC] text-ink hover:bg-[#ECEFE7] flex items-center justify-center shrink-0 transition-colors"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="text-left min-w-0 px-1 py-0.5 rounded-lg hover:bg-[#ECEFE7]/70 transition-colors"
            >
              <span className="block text-[15px] font-extrabold text-ink leading-tight">
                Bản đồ
              </span>
              <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-secondary leading-tight max-w-[160px]">
                <span className="truncate">{shortUserLocationLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-ink-secondary" />
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="h-9 px-3.5 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Đăng tin</span>
          </button>
        </div>

        {/* Row 2: Tất cả | Cứu trợ | Thú lạc | Nhận nuôi + [Bộ lọc] */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              aria-pressed={category === 'ALL'}
              className={`h-8 px-2.5 rounded-full text-xs font-bold border flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                category === 'ALL'
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink border-[#E2E5DC]'
              }`}
            >
              <span>Tất cả</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('RESCUE')}
              aria-pressed={category === 'RESCUE'}
              className={`h-8 px-2.5 rounded-full text-xs font-bold border flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                category === 'RESCUE'
                  ? 'bg-[#FDECE7] text-[#C84E2B] border-[#C84E2B]'
                  : 'bg-white text-ink border-[#E2E5DC]'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5 text-[#C84E2B] shrink-0" />
              <span>Cứu trợ</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('LOST')}
              aria-pressed={category === 'LOST'}
              className={`h-8 px-2.5 rounded-full text-xs font-bold border flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                category === 'LOST'
                  ? 'bg-[#F2D272] text-ink border-[#D9881E]'
                  : 'bg-white text-ink border-[#E2E5DC]'
              }`}
            >
              <PawFilterIcon className="w-3.5 h-3.5 text-[#9A5D0A] shrink-0" />
              <span>Thú lạc</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('ADOPT')}
              aria-pressed={category === 'ADOPT'}
              className={`h-8 px-2.5 rounded-full text-xs font-bold border flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                category === 'ADOPT'
                  ? 'bg-brand-soft text-brand border-brand'
                  : 'bg-white text-ink border-[#E2E5DC]'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Nhận nuôi</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMapFilterOpen((v) => !v)}
            aria-expanded={isMobileMapFilterOpen}
            aria-label="Mở bộ lọc bản đồ"
            className={`relative w-8 h-8 rounded-[10px] border flex items-center justify-center shrink-0 transition-colors ${
              isMobileMapFilterOpen || showVets
                ? 'bg-brand-soft border-brand text-brand'
                : 'bg-white border-[#E2E5DC] text-ink'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showVets && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand border border-white" />
            )}
          </button>
        </div>

        {/* Mobile Map Filter Popover (contains Thú y 24/7 + Nguồn/Khu vực + Sổ tay vị trí) */}
        {isMobileMapFilterOpen && (
          <div className="pt-1.5 border-t border-[#E2E5DC] grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setShowVets((v) => !v)}
              aria-pressed={showVets}
              className={`min-h-[38px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                showVets
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink border-[#E2E5DC]'
              }`}
            >
              <Stethoscope
                className={`w-3.5 h-3.5 shrink-0 ${
                  showVets ? 'text-white' : 'text-brand'
                }`}
              />
              <span>Thú y 24/7 {showVets ? '(Bật)' : ''}</span>
            </button>

            <button
              type="button"
              onClick={handleLocateMe}
              className="min-h-[38px] px-2.5 rounded-[10px] bg-white border border-[#E2E5DC] text-xs font-bold text-ink flex items-center justify-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Vị trí của tôi</span>
            </button>

            {onOpenFilterModal && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMapFilterOpen(false);
                  onOpenFilterModal();
                }}
                className="min-h-[38px] px-2.5 rounded-[10px] bg-white border border-[#E2E5DC] text-xs font-bold text-ink flex items-center justify-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Lọc nguồn &amp; vùng</span>
              </button>
            )}

            {onOpenGoogleMapsVault && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMapFilterOpen(false);
                  onOpenGoogleMapsVault();
                }}
                className="min-h-[38px] px-2.5 rounded-[10px] bg-white border border-[#E2E5DC] text-xs font-bold text-ink flex items-center justify-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Sổ tay vị trí</span>
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="hidden md:flex w-[360px] lg:w-[390px] shrink-0 h-full bg-[#F5F6F2] border-r border-[#E2E5DC] flex-col overflow-y-auto">
        <div className="p-4 lg:px-6 lg:py-5 space-y-3.5 border-b border-[#E2E5DC]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#FFF3D8] text-[#D4942A] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </span>
                <h1 className="text-xl font-extrabold text-ink">
                  Quanh bạn
                </h1>
              </div>
              <p className="text-xs text-ink-secondary mt-1">
                Tin cứu hộ, thú lạc và nhận nuôi
              </p>
            </div>

            {onOpenGoogleMapsVault && (
              <button
                type="button"
                onClick={onOpenGoogleMapsVault}
                className="h-8 px-2.5 rounded-[10px] bg-white border border-[#E2E5DC] hover:border-brand text-xs font-bold text-brand inline-flex items-center gap-1 shrink-0 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Sổ tay vị trí</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                placeholder="Tìm khu vực..."
                className="w-full h-10 pl-9 pr-20 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-medium text-ink placeholder-ink-secondary/75 focus:border-brand outline-none"
              />
              {areaQuery ? (
                <button
                  type="button"
                  onClick={() => setAreaQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F1EFE8] text-[10px] flex items-center justify-center text-ink"
                  aria-label="Xóa từ khóa khu vực"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLocationPicker}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md bg-[#FAF7F1] hover:bg-brand-soft border border-[#DDDCD4] text-[11px] font-semibold text-brand"
                >
                  Chọn vùng
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              aria-pressed={category === 'ALL'}
              className={`min-h-[42px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                category === 'ALL'
                  ? 'bg-[#D7E5D9] text-brand border-brand/40'
                  : 'bg-white text-ink border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-brand shrink-0" />
              <span className=" whitespace-nowrap">Tất cả</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('RESCUE')}
              aria-pressed={category === 'RESCUE'}
              className={`min-h-[42px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                category === 'RESCUE'
                  ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F]'
                  : 'bg-white text-ink border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <LifeBuoy className="w-4 h-4 text-[#C84B24] shrink-0" />
              <span className="whitespace-nowrap">Cứu trợ</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('LOST')}
              aria-pressed={category === 'LOST'}
              className={`min-h-[42px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                category === 'LOST'
                  ? 'bg-[#FFF3D8] text-[#80570D] border-[#80570D]'
                  : 'bg-white text-ink border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <PawFilterIcon className="w-4 h-4 text-[#D4942A] shrink-0" />
              <span className="whitespace-nowrap">Thú lạc</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('ADOPT')}
              aria-pressed={category === 'ADOPT'}
              className={`min-h-[42px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                category === 'ADOPT'
                  ? 'bg-brand-soft text-brand border-brand'
                  : 'bg-white text-ink border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <Home className="w-4 h-4 text-brand shrink-0" />
              <span className="whitespace-nowrap">Trạm &amp; Nhận nuôi</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowVets((v) => !v)}
              aria-pressed={showVets}
              className={`min-h-[40px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                showVets
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <Stethoscope
                className={`w-3.5 h-3.5 shrink-0 ${
                  showVets ? 'text-white' : 'text-brand'
                }`}
              />
              <span className="whitespace-nowrap">Thú y 24/7</span>
            </button>

            <button
              type="button"
              onClick={handleLocateMe}
              className="min-h-[40px] px-2.5 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-brand text-xs font-bold text-ink flex items-center justify-center gap-1.5 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5 text-brand shrink-0" />
              <span className="whitespace-nowrap">Vị trí của tôi</span>
            </button>
          </div>
        </div>

        <div className="p-4 lg:px-6 lg:py-5 flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">
              Tin trong khu vực
            </h2>
            <span className="text-xs font-semibold text-ink-secondary">
              {filteredSpots.length} điểm
            </span>
          </div>

          {filteredSpots.length > 0 ? (
            <div className="space-y-3">
              {filteredSpots.map((spot) => {
                const isSelected = selectedSpot?.id === spot.id;
                const badgeMeta = getSpotBadgeMeta(spot);
                const areaDisplay = getCompactAreaLabel(spot);
                const sourceText = getSpotSourceText(spot);

                return (
                  <div
                    key={spot.id}
                    ref={(el) => {
                      cardRefs.current[spot.id] = el;
                    }}
                    onClick={() => onSelectSpot(spot)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSpot(spot);
                      }
                    }}
                    className={`rounded-[12px] p-3 bg-white border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-brand ring-1 ring-brand bg-[#F6FAF7] shadow-sm'
                        : 'border-[#DDDCD4] hover:border-brand/60'
                    }`}
                  >
                    <img
                      src={spot.images?.[0] || FALLBACK_PET_IMAGE}
                      alt={spot.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== FALLBACK_PET_IMAGE) {
                          target.src = FALLBACK_PET_IMAGE;
                        }
                      }}
                      className="w-[82px] h-[82px] rounded-[10px] object-cover shrink-0 bg-[#F1EFE8] border border-[#DDDCD4]"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
                        style={{
                          backgroundColor: badgeMeta.bgHex,
                          color: badgeMeta.textHex,
                        }}
                      >
                        {badgeMeta.uppercaseLabel}
                      </span>

                      <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2">
                        {spot.title}
                      </h3>

                      <p className="text-xs text-ink-secondary flex items-center gap-1 flex-wrap">
                        <MapPin className="w-3 h-3 text-ink-secondary shrink-0" />
                        <span className="truncate">
                          {areaDisplay} · {sourceText}
                        </span>
                      </p>

                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSpot(spot);
                            onOpenSpotDetail(spot);
                          }}
                          className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                        >
                          <span>Xem chi tiết</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[12px] bg-white border border-[#DDDCD4] p-4 text-center space-y-2.5">
              <p className="text-xs font-semibold text-ink">
                Chưa có điểm ghim phù hợp với bộ lọc này.
              </p>
              <p className="text-xs text-ink-secondary">
                Bạn có thể đổi bộ lọc sang mục khác hoặc xóa từ khóa tìm khu
                vực.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategory('ALL');
                  setAreaQuery('');
                }}
                className="h-9 px-3.5 rounded-[10px] bg-brand text-white text-xs font-bold"
              >
                Xem tất cả điểm ghim
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        <div className="flex-1 min-h-[160px] relative">
          <DomNhoMapCanvas
            themeId="morning_sun"
            spots={filteredSpots}
            selectedSpot={selectedSpot}
            onSelectSpot={(spot) => onSelectSpot(spot)}
            userCoords={userCoords}
            patrolModeActive={false}
            searchRadiusMeters={15000}
            focusCoordsTrigger={focusTrigger}
            onStepPatrolWalk={() => {}}
            onRequestRealGps={handleLocateMe}
            onOpenNearbySearch={() => {}}
            showVetStations={showVets}
            vetStations={vetStations}
            newlyDroppedSpotId={null}
          />

          {filteredSpots.length === 0 && (
            <div className="md:hidden absolute top-3 inset-x-3 z-20 rounded-[10px] bg-white/95 border border-[#DDDCD4] p-2.5 shadow-sm flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink">
                Không có điểm ghim ở bộ lọc này.
              </span>
              <button
                type="button"
                onClick={() => setCategory('ALL')}
                className="px-2.5 py-1 rounded-md bg-brand text-white text-xs font-bold shrink-0"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>

        {selectedSpot && (
          <div className="md:hidden shrink-0 max-h-[34dvh] overflow-y-auto bg-[#F5F6F2] border-t border-[#E2E5DC] p-3 z-20">
            {(() => {
              const areaDisplay = getCompactAreaLabel(selectedSpot);
              const sourceText = getSpotSourceText(selectedSpot);

              return (
                <div className="rounded-[16px] bg-white border border-[#E2E5DC] p-3 flex items-start gap-3 shadow-sm">
                  <img
                    src={selectedSpot.images?.[0] || FALLBACK_PET_IMAGE}
                    alt={selectedSpot.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== FALLBACK_PET_IMAGE) {
                        target.src = FALLBACK_PET_IMAGE;
                      }
                    }}
                    className="w-[76px] h-[76px] rounded-[12px] object-cover shrink-0 bg-[#ECEFE7] border border-[#E2E5DC]"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-extrabold text-ink leading-snug line-clamp-1">
                        {selectedSpot.title}
                      </h3>

                      <button
                        type="button"
                        onClick={() => onSelectSpot(null)}
                        className="w-7 h-7 -mt-0.5 -mr-1 rounded-md text-ink-secondary hover:bg-[#ECEFE7] flex items-center justify-center shrink-0"
                        aria-label="Đóng tóm tắt ghim"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-ink-secondary flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                      <span className="truncate">
                        {areaDisplay} · {sourceText}
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={() => onOpenSpotDetail(selectedSpot)}
                      className="w-full h-9 px-3 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
