'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Crosshair,
  Home,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Plus,
  Search,
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
}: FullMapViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [showVets, setShowVets] = useState<boolean>(false);
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

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-20 md:static md:z-auto w-full md:h-[calc(100dvh-65px)] bg-[#FAF7F1] text-[#142820] flex flex-col md:flex-row overflow-hidden">
      <div className="md:hidden shrink-0 bg-[#FAF7F1] border-b border-[#DDDCD4] px-3 pt-[max(8px,env(safe-area-inset-top,0px))] pb-2 space-y-1.5 z-20">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToExplore}
            className="min-w-[44px] min-h-[44px] -ml-1 px-2 rounded-[10px] text-[#142820] hover:bg-[#F1EFE8] flex items-center justify-center transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base font-extrabold text-[#142820] truncate">
            Bản đồ
          </h1>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="min-h-[40px] px-3.5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng tin</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="flex-1 min-h-[42px] px-3 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
              <span className="truncate">
                {userCoords.label || 'Thủ Đức, TP.HCM'}
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            className="min-w-[44px] min-h-[42px] rounded-[10px] bg-white border border-[#DDDCD4] text-[#142820] hover:border-[#0E513B] flex items-center justify-center shrink-0"
            title="Vị trí của tôi"
            aria-label="Vị trí của tôi"
          >
            <Crosshair className="w-4 h-4 text-[#0E513B]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            aria-pressed={category === 'ALL'}
            className={`min-h-[38px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
              category === 'ALL'
                ? 'bg-[#D7E5D9] text-[#0E513B] border-[#0E513B]/40'
                : 'bg-white text-[#142820] border-[#DDDCD4]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">Tất cả</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('RESCUE')}
            aria-pressed={category === 'RESCUE'}
            className={`min-h-[38px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
              category === 'RESCUE'
                ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F]'
                : 'bg-white text-[#142820] border-[#DDDCD4]'
            }`}
          >
            <LifeBuoy className="w-3.5 h-3.5 text-[#C84B24] shrink-0" />
            <span className="truncate">Cứu trợ</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('LOST')}
            aria-pressed={category === 'LOST'}
            className={`min-h-[38px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
              category === 'LOST'
                ? 'bg-[#FFF3D8] text-[#80570D] border-[#80570D]'
                : 'bg-white text-[#142820] border-[#DDDCD4]'
            }`}
          >
            <PawFilterIcon className="w-3.5 h-3.5 text-[#D4942A] shrink-0" />
            <span className="truncate">Thú lạc</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('ADOPT')}
            aria-pressed={category === 'ADOPT'}
            className={`min-h-[38px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
              category === 'ADOPT'
                ? 'bg-[#E8EFE6] text-[#0E513B] border-[#0E513B]'
                : 'bg-white text-[#142820] border-[#DDDCD4]'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">Trạm &amp; Nhận nuôi</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowVets((v) => !v)}
          aria-pressed={showVets}
          className={`w-full min-h-[38px] px-3 rounded-[10px] text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
            showVets
              ? 'bg-[#0E513B] text-white border-[#0E513B]'
              : 'bg-white text-[#142820] border-[#DDDCD4]'
          }`}
        >
          <Stethoscope
            className={`w-3.5 h-3.5 shrink-0 ${
              showVets ? 'text-white' : 'text-[#0E513B]'
            }`}
          />
          <span>Thú y 24/7</span>
        </button>
      </div>

      <aside className="hidden md:flex w-[360px] lg:w-[390px] shrink-0 h-full bg-[#FAF7F1] border-r border-[#DDDCD4] flex-col overflow-y-auto">
        <div className="p-4 lg:px-6 lg:py-5 space-y-3.5 border-b border-[#DDDCD4]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FFF3D8] text-[#D4942A] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-extrabold text-[#142820]">
                Quanh bạn
              </h1>
            </div>
            <p className="text-xs text-[#52605A] mt-1">
              Tin cứu hộ, thú lạc và nhận nuôi
            </p>
          </div>

          <div className="relative flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#52605A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                placeholder="Tìm khu vực..."
                className="w-full h-10 pl-9 pr-20 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-medium text-[#142820] placeholder-[#52605A]/75 focus:border-[#0E513B] outline-none"
              />
              {areaQuery ? (
                <button
                  type="button"
                  onClick={() => setAreaQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F1EFE8] text-[10px] flex items-center justify-center text-[#142820]"
                  aria-label="Xóa từ khóa khu vực"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLocationPicker}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2 rounded-md bg-[#FAF7F1] hover:bg-[#E8EFE6] border border-[#DDDCD4] text-[11px] font-semibold text-[#0E513B]"
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
                  ? 'bg-[#D7E5D9] text-[#0E513B] border-[#0E513B]/40'
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-[#0E513B] shrink-0" />
              <span className=" whitespace-nowrap">Tất cả</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('RESCUE')}
              aria-pressed={category === 'RESCUE'}
              className={`min-h-[42px] px-2.5 rounded-[10px] text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                category === 'RESCUE'
                  ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F]'
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
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
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
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
                  ? 'bg-[#E8EFE6] text-[#0E513B] border-[#0E513B]'
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <Home className="w-4 h-4 text-[#0E513B] shrink-0" />
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
                  ? 'bg-[#0E513B] text-white border-[#0E513B]'
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
              }`}
            >
              <Stethoscope
                className={`w-3.5 h-3.5 shrink-0 ${
                  showVets ? 'text-white' : 'text-[#0E513B]'
                }`}
              />
              <span className="whitespace-nowrap">Thú y 24/7</span>
            </button>

            <button
              type="button"
              onClick={handleLocateMe}
              className="min-h-[40px] px-2.5 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-bold text-[#142820] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
              <span className="whitespace-nowrap">Vị trí của tôi</span>
            </button>
          </div>
        </div>

        <div className="p-4 lg:px-6 lg:py-5 flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#142820]">
              Tin trong khu vực
            </h2>
            <span className="text-xs font-semibold text-[#52605A]">
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
                        ? 'border-[#0E513B] ring-1 ring-[#0E513B] bg-[#F6FAF7] shadow-sm'
                        : 'border-[#DDDCD4] hover:border-[#0E513B]/60'
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

                      <h3 className="text-sm font-bold text-[#142820] leading-snug line-clamp-2">
                        {spot.title}
                      </h3>

                      <p className="text-xs text-[#52605A] flex items-center gap-1 flex-wrap">
                        <MapPin className="w-3 h-3 text-[#52605A] shrink-0" />
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
                          className="text-xs font-bold text-[#0E513B] hover:underline inline-flex items-center gap-1"
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
              <p className="text-xs font-semibold text-[#142820]">
                Chưa có điểm ghim phù hợp với bộ lọc này.
              </p>
              <p className="text-xs text-[#52605A]">
                Bạn có thể đổi bộ lọc sang mục khác hoặc xóa từ khóa tìm khu
                vực.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategory('ALL');
                  setAreaQuery('');
                }}
                className="h-9 px-3.5 rounded-[10px] bg-[#0E513B] text-white text-xs font-bold"
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
              <span className="text-xs font-medium text-[#142820]">
                Không có điểm ghim ở bộ lọc này.
              </span>
              <button
                type="button"
                onClick={() => setCategory('ALL')}
                className="px-2.5 py-1 rounded-md bg-[#0E513B] text-white text-xs font-bold shrink-0"
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>

        {selectedSpot && (
          <div className="md:hidden shrink-0 max-h-[34dvh] overflow-y-auto bg-[#FAF7F1] border-t border-[#DDDCD4] p-2.5 z-20">
            {(() => {
              const badgeMeta = getSpotBadgeMeta(selectedSpot);
              const areaDisplay = getCompactAreaLabel(selectedSpot);
              const sourceText = getSpotSourceText(selectedSpot);

              return (
                <div className="rounded-[12px] bg-white border border-[#DDDCD4] p-2.5 flex items-start gap-3 shadow-sm">
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
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-[10px] object-cover shrink-0 bg-[#F1EFE8] border border-[#DDDCD4]"
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
                        style={{
                          backgroundColor: badgeMeta.bgHex,
                          color: badgeMeta.textHex,
                        }}
                      >
                        {badgeMeta.uppercaseLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() => onSelectSpot(null)}
                        className="w-7 h-7 rounded-md text-[#52605A] hover:bg-[#F1EFE8] flex items-center justify-center shrink-0"
                        aria-label="Đóng tóm tắt ghim"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[#142820] leading-snug line-clamp-2">
                      {selectedSpot.title}
                    </h3>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <p className="text-[11px] text-[#52605A] flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-[#52605A] shrink-0" />
                        <span className="truncate">
                          {areaDisplay} · {sourceText}
                        </span>
                      </p>

                      <button
                        type="button"
                        onClick={() => onOpenSpotDetail(selectedSpot)}
                        className="min-h-[38px] px-3 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Xem chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
