'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkPlus,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  QrCode,
  Send,
  Unlock,
  X,
  Maximize2,
  ZoomIn,
} from 'lucide-react';
import ImageLightboxModal from '@/components/modals/ImageLightboxModal';
import {
  DomSpot,
  SightingItem,
  ThemeId,
  UserSession,
  getFriendlySourceName,
  getPlatformBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { DOM_THEMES, SPOT_LEXICON } from '@/lib/themes';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';
import {
  compressImageToWebpClient,
  generateRescuePosterDataUrl,
} from '@/lib/image-compressor';

interface SpotDetailModalProps {
  spot: DomSpot | null;
  themeId: ThemeId;
  userCoords: { lat: number; lng: number };
  userSession: UserSession | null;
  onClose: () => void;
  onBoostLight: (spotId: string) => void;
  onAddSighting: (spotId: string, sighting: SightingItem) => void;
  onUnlockContactRequest: (
    spot: DomSpot,
    message: string,
    requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
  ) => void;
  onResolveSpotToPeace: (spotId: string) => void;
  onSaveSpotToGoogleMapsVault: (spot: DomSpot) => void;
  onFocusSpotOnMap?: (spot: DomSpot) => void;
}

export default function SpotDetailModal({
  spot,
  themeId,
  userCoords,
  userSession,
  onClose,
  onBoostLight,
  onAddSighting,
  onUnlockContactRequest,
  onResolveSpotToPeace,
  onSaveSpotToGoogleMapsVault,
  onFocusSpotOnMap,
}: SpotDetailModalProps) {
  const theme = DOM_THEMES[themeId];
  const [imageIndex, setImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState<
    | 'NONE'
    | 'REPORT_SIGHTING'
    | 'UNLOCK_CONTACT'
    | 'QR_POSTER'
    | 'GOOGLE_MAP_EMBED'
  >('NONE');

  const [sightingNote, setSightingNote] = useState('');
  const [sightingEmotion] = useState('Vừa bắt gặp • Khỏe mạnh');
  const [sightingPhotoUrl, setSightingPhotoUrl] = useState('');

  const [unlockMessage, setUnlockMessage] = useState('');
  const [unlockType] = useState<
    'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
  >('SIGHTING_REPORT');
  const [contactUnlockedLocal, setContactUnlockedLocal] = useState(false);

  const [posterDataUrl, setPosterDataUrl] = useState<string>('');
  const [generatingPoster, setGeneratingPoster] = useState(false);

  if (!spot) return null;

  const isUserPost = isUserWebPost(spot);
  const hasMapPin = isSpotPinAllowedOnMap(spot);
  const meta = SPOT_LEXICON[spot.spotType];
  const distanceMeters = hasMapPin
    ? calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      )
    : null;

  const googleMapsUrl = hasMapPin
    ? spot.googleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${spot.publicLat},${spot.publicLng}`
    : '';
  const googleMapsDirectionsUrl = hasMapPin
    ? spot.googleMapsDirectionsUrl ||
      `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${spot.publicLat},${spot.publicLng}&travelmode=two-wheeler`
    : '';
  const googleMapsEmbedUrl = hasMapPin
    ? spot.googleMapsEmbedUrl ||
      `https://maps.google.com/maps?q=${spot.publicLat},${spot.publicLng}&hl=vi&z=16&output=embed`
    : '';

  const isAuthor =
    isUserPost &&
    userSession &&
    (spot.authorId === userSession.id ||
      spot.authorName.toLowerCase() === userSession.displayName.toLowerCase());

  const handleSightingFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToWebpClient(file, 960, 0.78);
      setSightingPhotoUrl(compressed.dataUrl);
    } catch {
      // ignore
    }
  };

  const submitSighting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sightingNote.trim()) return;
    const newSighting: SightingItem = {
      id: `sight-${Date.now()}`,
      reporterName: userSession?.displayName || 'Người Đi Đường Ấm Áp',
      imageUrl: sightingPhotoUrl || spot.images[0],
      note: sightingNote.trim(),
      emotionTag: sightingEmotion,
      createdAt: 'Vừa xong',
      distanceFromOriginMeters:
        distanceMeters !== null ? Math.max(40, Math.min(450, distanceMeters)) : 100,
      lat: userCoords.lat,
      lng: userCoords.lng,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${userCoords.lat},${userCoords.lng}`,
    };
    onAddSighting(spot.id, newSighting);
    setSightingNote('');
    setSightingPhotoUrl('');
    setActiveSubPanel('NONE');
  };

  const submitUnlockContact = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlockContactRequest(
      spot,
      unlockMessage.trim() ||
        'Mình đang ở gần khu vực này, mong kết nối với bạn ngay!',
      unlockType
    );
    setContactUnlockedLocal(true);
    setActiveSubPanel('NONE');
  };

  const handleCreatePoster = async () => {
    setGeneratingPoster(true);
    setActiveSubPanel('QR_POSTER');
    try {
      const url = await generateRescuePosterDataUrl(spot);
      setPosterDataUrl(url);
    } finally {
      setGeneratingPoster(false);
    }
  };

  const dotHex =
    spot.spotType === 'RED_SOS'
      ? '#E63946'
      : spot.spotType === 'ORANGE_SIGHT'
      ? '#E07A5F'
      : spot.spotType === 'YELLOW_ADOPT'
      ? '#F4A261'
      : '#2A9D8F';

  const isRescueCenter = spot.entityCategory === 'RESCUE_CENTER';
  const categoryLabel = isRescueCenter
    ? 'Trung tâm cứu trợ & Nhận nuôi'
    : 'Cá thể thú cưng';
  const sourceName = getFriendlySourceName(
    spot.verificationInfo?.sourceDomain,
    spot.authorName,
    spot.sourceUrl
  );
  const platformBadge = getPlatformBadgeMeta(
    spot.sourcePlatform,
    spot.sourceUrl
  );
  const publishedLabel = spot.publishedDate
    ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;
  const realPhone = spot.rawPhoneSecret?.trim() || '';

  return (
    <AnimatePresence>
      <motion.div
        key="spot-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg max-h-[90dvh] rounded-[24px] sm:rounded-[28px] shadow-2xl border border-[#DDDCD4] overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative w-full h-48 sm:h-60 bg-black/10 shrink-0 overflow-hidden cursor-pointer group"
          >
            <img
              src={spot.images[imageIndex] || spot.images[0]}
              alt={spot.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 42%, rgba(0,0,0,0.75) 100%)',
              }}
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="absolute top-3.5 right-14 h-9 px-3 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center gap-1.5 text-xs font-semibold hover:bg-black/70 transition-colors"
              title="Phóng to ảnh để xem rõ hơn"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xem rõ ảnh</span>
            </button>

            <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 flex-wrap pr-12">
              {isUserPost ? (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#2A9D8F] text-white shadow-sm">
                  Tự đăng trên Web
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/75 text-white backdrop-blur-md flex items-center gap-1">
                  <span className="opacity-90">{platformBadge.shortLabel}</span>
                  <span className="opacity-60">•</span>
                  <span>{sourceName}</span>
                </span>
              )}

              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm"
                style={{
                  backgroundColor: isRescueCenter ? '#0F766E' : dotHex,
                }}
              >
                {isRescueCenter ? categoryLabel : meta.shortName}
              </span>
            </div>

            {spot.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setImageIndex(
                      (i) => (i - 1 + spot.images.length) % spot.images.length
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setImageIndex((i) => (i + 1) % spot.images.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 inset-x-4 flex items-center justify-between gap-2 text-white">
              <div className="flex items-center gap-2 truncate">
                {distanceMeters !== null ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[#D2673B] text-white shadow-md flex items-center gap-1 ring-1 ring-white/30">
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                    <span>Cách bạn {formatDistanceVi(distanceMeters)}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#133E35] text-white shadow-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{spot.areaLabel}</span>
                  </span>
                )}
                {publishedLabel && (
                  <span className="text-xs font-semibold opacity-90 truncate hidden sm:inline">
                    {publishedLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onBoostLight(spot.id)}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#E07A5F] text-white shadow flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                Truyền Lửa • {spot.lightPower}%
              </button>
            </div>
          </div>

          {spot.images.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF7F1] border-b border-[#DDDCD4] overflow-x-auto no-scrollbar shrink-0">
              {spot.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setImageIndex(idx)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    idx === imageIndex
                      ? 'border-[#0E513B] shadow-sm scale-105'
                      : 'border-[#DDDCD4] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Ảnh ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="h-14 px-3 rounded-xl border border-dashed border-[#DDDCD4] hover:border-[#0E513B] text-[#52605A] hover:text-[#0E513B] flex flex-col items-center justify-center text-[10px] font-bold shrink-0 transition-colors bg-white"
              >
                <Maximize2 className="w-3.5 h-3.5 mb-0.5" />
                <span>Xem rõ</span>
              </button>
            </div>
          )}

          <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
            <div>
              <p className="text-xs font-bold" style={{ color: dotHex }}>
                {isRescueCenter ? categoryLabel : meta.label} •{' '}
                {isUserPost ? `Người đăng: ${spot.authorName}` : `Nguồn: ${sourceName}`}
              </p>
              <h3 className="text-base sm:text-lg font-bold mt-0.5 leading-snug">
                {spot.title}
              </h3>
              <p
                className="text-xs sm:text-sm mt-1.5 leading-relaxed"
                style={{ color: theme.mutedTextHex }}
              >
                {spot.story}
              </p>

              {spot.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {spot.traits.map((trait) => (
                    <span
                      key={trait}
                      className="px-3 py-1 rounded-full text-xs font-semibold"
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
            </div>

            {hasMapPin ? (
              <div
                className="p-3.5 rounded-3xl space-y-2.5"
                style={{ backgroundColor: theme.frostedCardBg }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#E63946] shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {distanceMeters !== null && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#D2673B]/15 text-[#D2673B]">
                            Cách bạn {formatDistanceVi(distanceMeters)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#133E35]">
                          {spot.formattedAddress || spot.areaLabel}
                        </span>
                      </div>
                      <p
                        className="text-[11px] font-mono opacity-75 mt-0.5"
                        style={{ color: theme.mutedTextHex }}
                      >
                        Tọa độ GPS: {spot.publicLat.toFixed(5)}, {spot.publicLng.toFixed(5)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveSpotToGoogleMapsVault(spot);
                      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#2A9D8F] text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Lưu trên Google Maps
                  </button>

                  <a
                    href={googleMapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E07A5F]/15 text-[#E07A5F] flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Chỉ đường Google Maps
                  </a>

                  {onFocusSpotOnMap && (
                    <button
                      type="button"
                      onClick={() => {
                        onFocusSpotOnMap(spot);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1"
                      style={{
                        backgroundColor: theme.pillBg,
                        color: theme.textHex,
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#E63946]" />
                      Xem ghim trên Bản đồ
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSubPanel((curr) =>
                        curr === 'GOOGLE_MAP_EMBED' ? 'NONE' : 'GOOGLE_MAP_EMBED'
                      )
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1"
                    style={{
                      backgroundColor: theme.pillBg,
                      color: theme.textHex,
                    }}
                  >
                    <Map className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    {activeSubPanel === 'GOOGLE_MAP_EMBED'
                      ? 'Ẩn bản đồ nhúng'
                      : 'Xem bản đồ nhúng'}
                  </button>
                </div>

                {activeSubPanel === 'GOOGLE_MAP_EMBED' && (
                  <div className="pt-2">
                    <div className="w-full h-48 rounded-2xl overflow-hidden shadow-inner">
                      <iframe
                        title={`Google Maps - ${spot.title}`}
                        src={googleMapsEmbedUrl}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="p-3.5 rounded-3xl flex items-start gap-2.5"
                style={{ backgroundColor: theme.frostedCardBg }}
              >
                <MapPin className="w-4 h-4 text-[#E07A5F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">
                    Khu vực: {spot.areaLabel || 'Chưa rõ địa chỉ cụ thể'}
                  </p>
                  <p
                    className="text-[11px] mt-0.5 leading-relaxed"
                    style={{ color: theme.mutedTextHex }}
                  >
                    Bài viết gốc không công khai số nhà/đường cụ thể nên không gắn ghim lên bản đồ. Bạn vui lòng liên hệ trực tiếp tại trang gốc bên dưới để nhận thông tin chi tiết.
                  </p>
                </div>
              </div>
            )}

            {!isUserPost ? (
              <div
                className="p-4 rounded-3xl space-y-3"
                style={{ backgroundColor: 'rgba(42, 157, 143, 0.14)' }}
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#2A9D8F]">
                    🌐 Thông tin được tổng hợp từ {sourceName}
                  </p>
                  <p className="text-xs font-semibold">
                    Đơn vị / Đầu mối: {spot.authorName}
                  </p>
                  {realPhone && (
                    <p
                      className="text-xs"
                      style={{ color: theme.mutedTextHex }}
                    >
                      Nơi tiếp nhận / Liên hệ: {realPhone}
                    </p>
                  )}
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: theme.mutedTextHex }}
                  >
                    Vì đây là bài viết được tổng hợp từ nguồn bên ngoài, để nhận nuôi, hỗ trợ hoặc báo tin tìm thấy, bạn vui lòng truy cập trực tiếp nơi đăng gốc.
                  </p>
                </div>

                {spot.sourceUrl && (
                  <a
                    href={spot.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#2A9D8F] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <span>Đi tới nơi liên hệ tại {sourceName}</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                )}
              </div>
            ) : (
              <>
                <div
                  className="p-3.5 rounded-2xl flex items-center justify-between gap-2"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <div className="flex items-center gap-2.5">
                    {contactUnlockedLocal || spot.isContactUnlockedForViewer ? (
                      <Unlock className="w-4 h-4 text-[#2A9D8F]" />
                    ) : (
                      <Lock className="w-4 h-4 text-[#E07A5F]" />
                    )}
                    <div>
                      <p className="text-xs font-bold">
                        Liên hệ người đăng:{' '}
                        {contactUnlockedLocal || spot.isContactUnlockedForViewer
                          ? realPhone || spot.maskedPhone
                          : spot.maskedPhone}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: theme.mutedTextHex }}
                      >
                        {contactUnlockedLocal || spot.isContactUnlockedForViewer
                          ? 'Đã mở khóa số điện thoại người đăng trên Web'
                          : 'Bấm “Liên hệ người đăng” bên dưới để gửi lời nhắn & mở khóa SĐT'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreatePoster}
                    className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                    style={{
                      backgroundColor: 'rgba(230, 57, 70, 0.12)',
                      color: '#E63946',
                    }}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Poster QR
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-75">
                      Dấu vết cộng đồng báo trên Web ({spot.sightings.length})
                    </h4>
                  </div>

                  {spot.sightings.length > 0 ? (
                    <div className="space-y-2">
                      {spot.sightings.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-2xl flex items-center gap-3"
                          style={{ backgroundColor: theme.frostedCardBg }}
                        >
                          <img
                            src={s.imageUrl}
                            alt={s.reporterName}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold truncate">
                                {s.reporterName}
                              </p>
                              <span className="text-[10px] opacity-70 shrink-0">
                                {s.createdAt} • {s.distanceFromOriginMeters}m
                              </span>
                            </div>
                            <p
                              className="text-xs line-clamp-2 mt-0.5"
                              style={{ color: theme.mutedTextHex }}
                            >
                              {s.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className="text-xs italic py-1"
                      style={{ color: theme.mutedTextHex }}
                    >
                      Chưa có báo cáo phát hiện mới cho bài đăng này.
                    </p>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {activeSubPanel === 'REPORT_SIGHTING' && (
                    <motion.form
                      key="sighting-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={submitSighting}
                      className="p-4 rounded-3xl space-y-3"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <p className="text-xs font-bold text-[#E07A5F]">
                        📸 Báo tin vừa nhìn thấy bé cho người đăng
                      </p>
                      <textarea
                        rows={2}
                        required
                        value={sightingNote}
                        onChange={(e) => setSightingNote(e.target.value)}
                        placeholder="Ghi chú vị trí cụ thể bạn vừa nhìn thấy bé..."
                        className="w-full rounded-2xl p-3 text-xs outline-none"
                        style={{
                          backgroundColor: theme.pillBg,
                          color: theme.textHex,
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E07A5F]/15 text-[#E07A5F] flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          {sightingPhotoUrl ? 'Đã đính kèm ảnh' : 'Đính kèm ảnh thật'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSightingFileChange}
                            className="hidden"
                          />
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveSubPanel('NONE')}
                            className="px-3 py-1.5 rounded-full text-xs font-medium"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#E07A5F] flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Gửi báo tin
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}

                  {activeSubPanel === 'UNLOCK_CONTACT' && (
                    <motion.form
                      key="unlock-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={submitUnlockContact}
                      className="p-4 rounded-3xl space-y-3"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <p className="text-xs font-bold text-[#2A9D8F]">
                        💬 Gửi lời nhắn & Mở khóa SĐT người đăng trên Web
                      </p>
                      <input
                        type="text"
                        value={unlockMessage}
                        onChange={(e) => setUnlockMessage(e.target.value)}
                        placeholder="Lời nhắn ngắn gửi tới người đăng bài..."
                        className="w-full rounded-2xl p-3 text-xs outline-none"
                        style={{
                          backgroundColor: theme.pillBg,
                          color: theme.textHex,
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveSubPanel('NONE')}
                          className="px-3 py-1.5 rounded-full text-xs"
                        >
                          Đóng
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#2A9D8F]"
                        >
                          Gửi & Xem SĐT
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {activeSubPanel === 'QR_POSTER' && (
                    <motion.div
                      key="qr-poster-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-3xl space-y-3 text-center"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      {generatingPoster ? (
                        <p className="text-xs py-6 opacity-75">
                          Đang tạo Poster QR...
                        </p>
                      ) : (
                        posterDataUrl && (
                          <div className="space-y-3">
                            <img
                              src={posterDataUrl}
                              alt="Poster QR Tìm Thú Lạc"
                              className="w-56 mx-auto rounded-2xl shadow-md"
                            />
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={posterDataUrl}
                                download={`Poster-Tim-Thu-Lac-${spot.id}.png`}
                                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#E63946] inline-flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Tải Poster QR (.PNG)
                              </a>
                              <button
                                type="button"
                                onClick={() => setActiveSubPanel('NONE')}
                                className="px-3 py-2 rounded-full text-xs font-medium"
                              >
                                Thu gọn
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {spot.spotType !== 'GREEN_PEACE' && isAuthor && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onResolveSpotToPeace(spot.id)}
                      className="w-full py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 bg-[#2A9D8F]/15 text-[#2A9D8F]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Đánh dấu: Đã tìm thấy / Đã nhận nuôi (Chuyển sang Đốm Xanh Bình Yên)
                    </button>
                  </div>
                )}

                <div className="pt-1 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSubPanel((curr) =>
                        curr === 'REPORT_SIGHTING' ? 'NONE' : 'REPORT_SIGHTING'
                      )
                    }
                    className="py-3.5 px-4 rounded-full text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    style={{ backgroundColor: '#E07A5F' }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 Báo phát hiện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveSubPanel((curr) =>
                        curr === 'UNLOCK_CONTACT' ? 'NONE' : 'UNLOCK_CONTACT'
                      )
                    }
                    className="py-3.5 px-4 rounded-full text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    style={{ backgroundColor: '#2A9D8F' }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>💬 Liên hệ người đăng</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>

        <ImageLightboxModal
          images={spot.images}
          initialIndex={imageIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          title={spot.title}
        />
      </motion.div>
    </AnimatePresence>
  );
}
