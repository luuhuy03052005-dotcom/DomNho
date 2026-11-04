'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  Home,
  MapPin,
  PenTool,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DomSpot,
  ThemeId,
  getFriendlySourceName,
  getPlatformBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface AdoptSwipeSheetProps {
  themeId: ThemeId;
  spots: DomSpot[];
  userCoords: { lat: number; lng: number };
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  onOpenCameraModal: () => void;
  onBoostLight: (spotId: string) => void;
  onRequestAdoptOrFoster: (spot: DomSpot, mode: 'ADOPT' | 'FOSTER') => void;
  onSelectSpotOnMap: (spot: DomSpot) => void;
}

export default function AdoptSwipeSheet({
  themeId,
  spots,
  userCoords,
  isExpanded,
  onToggleExpand,
  onOpenCameraModal,
  onBoostLight,
  onRequestAdoptOrFoster,
  onSelectSpotOnMap,
}: AdoptSwipeSheetProps) {
  const theme = DOM_THEMES[themeId];
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [fosterOnly, setFosterOnly] = useState(false);
  const [lastSwipeFeedback, setLastSwipeFeedback] = useState<{
    type: 'ADOPT' | 'SKIP' | 'BOOST';
    text: string;
  } | null>(null);

  const adoptDeck = useMemo(() => {
    const candidates = spots.filter(
      (s) =>
        (s.spotType === 'YELLOW_ADOPT' || s.allowFoster) &&
        !dismissedIds.includes(s.id)
    );
    if (fosterOnly) {
      return candidates.filter((s) => s.allowFoster);
    }
    return candidates;
  }, [spots, dismissedIds, fosterOnly]);

  const activeCard = adoptDeck[0] || null;
  const nextCard = adoptDeck[1] || null;

  const triggerFeedback = (type: 'ADOPT' | 'SKIP' | 'BOOST', text: string) => {
    setLastSwipeFeedback({ type, text });
    window.setTimeout(() => {
      setLastSwipeFeedback((curr) => (curr?.text === text ? null : curr));
    }, 2200);
  };

  const handleSwipeLeft = (spot: DomSpot) => {
    setDismissedIds((prev) => [...prev, spot.id]);
    triggerFeedback('SKIP', `Đã qua hồ sơ "${spot.title.slice(0, 28)}..."`);
  };

  const handleSwipeRight = (spot: DomSpot) => {
    if (isUserWebPost(spot)) {
      triggerFeedback(
        'ADOPT',
        `💛 Đang mở kết nối nhận nuôi cho "${spot.breed}"`
      );
      onRequestAdoptOrFoster(spot, 'ADOPT');
    } else if (spot.sourceUrl) {
      const sourceName = getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );
      triggerFeedback(
        'ADOPT',
        `🌐 Đang chuyển tới nơi liên hệ gốc tại ${sourceName}`
      );
      if (typeof window !== 'undefined') {
        window.open(spot.sourceUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleCenterBoost = (spot: DomSpot) => {
    onBoostLight(spot.id);
    triggerFeedback(
      'BOOST',
      `🔥 Đã Truyền Lửa +15 độ sáng (${spot.lightPower + 15}%)`
    );
  };

  const handleCardDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
    spot: DomSpot
  ) => {
    if (info.offset.x > 95) {
      handleSwipeRight(spot);
    } else if (info.offset.x < -95) {
      handleSwipeLeft(spot);
    }
  };

  const activeIsUserPost = activeCard ? isUserWebPost(activeCard) : false;
  const activeHasPin = activeCard ? isSpotPinAllowedOnMap(activeCard) : false;
  const activeSourceName = activeCard
    ? getFriendlySourceName(
        activeCard.verificationInfo?.sourceDomain,
        activeCard.authorName,
        activeCard.sourceUrl
      )
    : '';
  const activePlatformBadge = activeCard
    ? getPlatformBadgeMeta(activeCard.sourcePlatform, activeCard.sourceUrl)
    : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col items-center px-2 sm:px-4">
      <motion.div
        layout
        initial={false}
        animate={{
          height: isExpanded ? 'min(76dvh, 610px)' : '64px',
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="w-full max-w-xl rounded-t-[26px] shadow-[0_-10px_32px_rgba(44,38,35,0.16)] backdrop-blur-2xl pointer-events-auto overflow-hidden flex flex-col"
        style={{
          backgroundColor: theme.frostedSheetBg,
          color: theme.textHex,
        }}
      >
        <div className="px-3.5 sm:px-5 pt-2 pb-2 flex flex-col items-center shrink-0">
          <div
            onClick={() => onToggleExpand(!isExpanded)}
            className="w-9 h-1 rounded-full mb-1.5 opacity-25 cursor-pointer"
            style={{ backgroundColor: theme.textHex }}
          />

          <div className="w-full flex items-center justify-between gap-2">
            <div
              onClick={() => onToggleExpand(!isExpanded)}
              className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(224, 122, 95, 0.16)' }}
              >
                <Heart className="w-4 h-4 text-[#E07A5F] fill-[#E07A5F]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold tracking-tight truncate">
                    Nhận Nuôi & Foster
                  </h2>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E07A5F]/15 text-[#E07A5F] shrink-0">
                    {adoptDeck.length} hồ sơ
                  </span>
                </div>
                <p
                  className="text-[10px] truncate hidden sm:block"
                  style={{ color: theme.mutedTextHex }}
                >
                  Chạm để xem các trạm nhận nuôi & bé đợi nhà
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCameraModal();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full shadow-md text-white text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #E63946 0%, #E07A5F 100%)',
                  boxShadow: '0 6px 16px -4px rgba(230, 57, 70, 0.5)',
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Đăng bài</span>
                <Sparkles className="w-3 h-3 hidden sm:inline" />
              </motion.button>

              <button
                type="button"
                onClick={() => onToggleExpand(!isExpanded)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform"
                style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
                aria-label={isExpanded ? 'Thu gọn ngăn kéo' : 'Mở rộng bộ bài'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 px-5 pb-5 flex flex-col justify-between overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFosterOnly((v) => !v)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
                  style={{
                    backgroundColor: fosterOnly ? '#2A9D8F' : theme.pillBg,
                    color: fosterOnly ? '#FFFFFF' : theme.textHex,
                  }}
                >
                  <Home className="w-3.5 h-3.5" />
                  {fosterOnly
                    ? 'Đang lọc: Trạm Tạm Trú (Foster)'
                    : 'Tất cả ca Nhận Nuôi & Foster'}
                </button>

                {dismissedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDismissedIds([])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Xem lại ({dismissedIds.length})
                  </button>
                )}
              </div>

              <AnimatePresence>
                {lastSwipeFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-2 px-4 py-2 rounded-2xl text-xs font-semibold text-center"
                    style={{
                      backgroundColor:
                        lastSwipeFeedback.type === 'ADOPT'
                          ? 'rgba(42, 157, 143, 0.16)'
                          : lastSwipeFeedback.type === 'BOOST'
                          ? 'rgba(224, 122, 95, 0.18)'
                          : theme.pillBg,
                      color: theme.textHex,
                    }}
                  >
                    {lastSwipeFeedback.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {activeCard ? (
                <div className="relative flex-1 min-h-[330px] flex items-center justify-center">
                  {nextCard && (
                    <div
                      className="absolute inset-x-4 top-3 bottom-2 rounded-[28px] opacity-40 scale-[0.95] pointer-events-none overflow-hidden"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <img
                        src={nextCard.images[0]}
                        alt={nextCard.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <motion.div
                    key={activeCard.id}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, info) => handleCardDragEnd(e, info, activeCard)}
                    whileDrag={{ scale: 1.02, rotate: 1.5 }}
                    className="relative w-full h-[345px] rounded-[28px] overflow-hidden shadow-xl cursor-grab active:cursor-grabbing select-none"
                  >
                    <img
                      src={activeCard.images[0]}
                      alt={activeCard.title}
                      className="w-full h-full object-cover"
                    />

                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(25,21,19,0.32) 0%, rgba(25,21,19,0.12) 38%, rgba(25,21,19,0.92) 100%)',
                      }}
                    />

                    <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSpotOnMap(activeCard);
                          onToggleExpand(false);
                        }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-black/55 backdrop-blur-md flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-[#F4A261]" />
                        {activeHasPin
                          ? `${formatDistanceVi(
                              calculateDistanceMeters(
                                userCoords.lat,
                                userCoords.lng,
                                activeCard.publicLat,
                                activeCard.publicLng
                              )
                            )} • ${activeCard.areaLabel}`
                          : `Khu vực: ${activeCard.areaLabel}`}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {activeIsUserPost ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E63946] text-white flex items-center gap-1">
                            <PenTool className="w-3 h-3" />
                            Tự đăng trên Web
                          </span>
                        ) : (
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm bg-white/95"
                            style={{
                              color:
                                activePlatformBadge?.colorHex || '#2C2623',
                            }}
                          >
                            <span>
                              {activePlatformBadge?.shortLabel ||
                                activeSourceName}
                            </span>
                          </span>
                        )}

                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#FFF8F0] bg-[#E07A5F]/90 backdrop-blur-md flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-current" />
                          {activeCard.lightPower}%
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-5 text-[#FFFDF9]">
                      <p className="text-[11px] font-bold text-[#F4A261] mb-0.5">
                        {activeIsUserPost
                          ? `Đăng bởi: ${activeCard.authorName}`
                          : `Nguồn gốc: ${activeSourceName}`}
                      </p>
                      <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">
                        {activeCard.title}
                      </h3>
                      <p className="text-xs text-white/85 line-clamp-2 mt-1">
                        {activeCard.story}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {activeCard.traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div
                  className="flex-1 min-h-[250px] rounded-[28px] p-6 flex flex-col items-center justify-center text-center"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <Sparkles className="w-10 h-10 text-[#E07A5F] mb-2" />
                  <p className="text-base font-bold">
                    Đã xem hết các hồ sơ trong danh sách lọc hiện tại
                  </p>
                  <button
                    type="button"
                    onClick={() => setDismissedIds([])}
                    className="mt-4 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#E07A5F]"
                  >
                    Xem lại từ đầu
                  </button>
                </div>
              )}

              {activeCard && (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwipeLeft(activeCard)}
                    className="px-4 py-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-transform active:scale-95"
                    style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
                  >
                    <X className="w-4 h-4" />
                    Bỏ qua
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCenterBoost(activeCard)}
                    className="px-4 py-3 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                    style={{
                      backgroundColor: 'rgba(224, 122, 95, 0.18)',
                      color: '#E07A5F',
                    }}
                  >
                    <Flame className="w-4 h-4 fill-current" />
                    Truyền Lửa (+15)
                  </button>

                  {activeIsUserPost ? (
                    <button
                      type="button"
                      onClick={() => handleSwipeRight(activeCard)}
                      className="flex-1 sm:flex-initial px-5 py-3 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
                      style={{ backgroundColor: '#2A9D8F' }}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                      Liên hệ Nhận nuôi / Foster
                    </button>
                  ) : (
                    <a
                      href={activeCard.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-initial px-5 py-3 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
                      style={{ backgroundColor: '#2A9D8F' }}
                    >
                      <span>Liên hệ tại {activeSourceName}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
