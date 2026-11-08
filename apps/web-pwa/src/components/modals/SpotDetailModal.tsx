'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
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
  getSpotBadgeMeta,
  isSpotOwnedByUser,
  isUserWebPost,
} from '@/lib/types';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import {
  compressImageToWebpClient,
  generateRescuePosterDataUrl,
} from '@/lib/image-compressor';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=900&q=80';

interface SpotDetailModalProps {
  spot: DomSpot | null;
  themeId: ThemeId;
  userCoords: { lat: number; lng: number; label: string };
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
  onFocusSpotOnMap: (spot: DomSpot) => void;
  isSaved?: boolean;
  onToggleSave?: (spot: DomSpot) => void;
  onEditSpot?: (spot: DomSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
}

export default function SpotDetailModal({
  spot,
  userCoords,
  userSession,
  onClose,
  onBoostLight,
  onAddSighting,
  onUnlockContactRequest,
  onResolveSpotToPeace,
  onSaveSpotToGoogleMapsVault,
  onFocusSpotOnMap,
  isSaved = false,
  onToggleSave,
  onEditSpot,
  onDeleteSpot,
}: SpotDetailModalProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState<
    'NONE' | 'REPORT_SIGHTING' | 'UNLOCK_CONTACT' | 'QR_POSTER'
  >('NONE');

  const [sightingReporterName, setSightingReporterName] = useState('');
  const [sightingNote, setSightingNote] = useState('');
  const [sightingArea, setSightingArea] = useState('');
  const [sightingImage, setSightingImage] = useState<string>('');
  const [uploadingSighting, setUploadingSighting] = useState(false);
  const [sightingError, setSightingError] = useState<string | null>(null);

  const [contactMessage, setContactMessage] = useState('');
  const [contactRequestType, setContactRequestType] = useState<
    'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
  >('ADOPT_REQUEST');

  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [generatingPoster, setGeneratingPoster] = useState(false);

  const sightingFileRef = useRef<HTMLInputElement | null>(null);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const subPanelAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (spot) {
      setImageIndex(0);
      setFailedImages({});
      setIsLightboxOpen(false);
      setConfirmDelete(false);
      setActiveSubPanel('NONE');
      setPosterDataUrl(null);
      setSightingArea(userCoords.label);
      setSightingReporterName(userSession?.displayName || '');
      setSightingError(null);
      if (bodyScrollRef.current) {
        bodyScrollRef.current.scrollTop = 0;
      }
    }
  }, [spot?.id, userCoords.label, userSession?.displayName]);

  useEffect(() => {
    if (!spot || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [spot]);

  useEffect(() => {
    if (!spot || isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spot, isLightboxOpen, onClose]);

  if (!spot) return null;

  const safeImages =
    Array.isArray(spot.images) && spot.images.length > 0
      ? spot.images.filter(Boolean)
      : [FALLBACK_PET_IMAGE];

  const hasExactCoords = isSpotPinAllowedOnMap(spot);
  const isUserPost = isUserWebPost(spot);
  const badgeMeta = getSpotBadgeMeta(spot);

  const distanceMeters = hasExactCoords
    ? calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      )
    : 0;

  const isAuthor = isSpotOwnedByUser(spot, userSession);
  const isContactUnlocked = Boolean(
    isAuthor || spot.isContactUnlockedForViewer
  );

  const googleMapsDirectionFromUserUrl = hasExactCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${spot.publicLat},${spot.publicLng}&travelmode=two-wheeler`
    : spot.googleMapsUrl || '';

  const friendlySource = isUserPost
    ? spot.authorName || 'Cộng đồng Đốm Nhỏ'
    : getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );

  const platformBadge = getPlatformBadgeMeta(
    spot.sourcePlatform,
    spot.sourceUrl
  );

  const publishedDateFormatted = spot.publishedDate
    ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const handleSightingFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSighting(true);
    try {
      const compressed = await compressImageToWebpClient(file, 960, 0.8);
      setSightingImage(compressed.dataUrl);
    } finally {
      setUploadingSighting(false);
    }
  };

  const handleSubmitSighting = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = (
      userSession?.displayName ||
      sightingReporterName ||
      ''
    ).trim();
    if (effectiveName.length < 2) {
      setSightingError('Vui lòng nhập tên của bạn (tối thiểu 2 ký tự).');
      return;
    }
    if (!sightingNote.trim()) {
      setSightingError('Vui lòng mô tả tình trạng và vị trí khi nhìn thấy bé.');
      return;
    }

    const newSighting: SightingItem = {
      id: `sight-${Date.now()}`,
      reporterName: effectiveName,
      createdAt: new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }),
      note: sightingArea.trim()
        ? `[${sightingArea.trim()}] ${sightingNote.trim()}`
        : sightingNote.trim(),
      imageUrl: sightingImage,
      emotionTag: sightingArea.trim() || '',
      distanceFromOriginMeters: distanceMeters,
      lat: userCoords.lat,
      lng: userCoords.lng,
    };

    setSightingError(null);
    onAddSighting(spot.id, newSighting);
    setSightingNote('');
    setSightingImage('');
    setActiveSubPanel('NONE');
  };

  const handleSubmitUnlockContact = (e: React.FormEvent) => {
    e.preventDefault();
    onUnlockContactRequest(
      spot,
      contactMessage.trim() ||
        'Chào bạn, mình muốn hỗ trợ thông tin / nhận nuôi bé!',
      contactRequestType
    );
    setContactMessage('');
    setActiveSubPanel('NONE');
  };

  const handleGeneratePoster = async () => {
    setActiveSubPanel('QR_POSTER');
    if (posterDataUrl) return;
    setGeneratingPoster(true);
    try {
      const dataUrl = await generateRescuePosterDataUrl(spot);
      setPosterDataUrl(dataUrl);
    } finally {
      setGeneratingPoster(false);
    }
  };

  const openSubPanelAndScroll = (
    panel: 'REPORT_SIGHTING' | 'UNLOCK_CONTACT' | 'QR_POSTER'
  ) => {
    setActiveSubPanel((curr) => (curr === panel ? 'NONE' : panel));
    window.setTimeout(() => {
      subPanelAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 80);
  };

  const currentHeroSrc = failedImages[imageIndex]
    ? FALLBACK_PET_IMAGE
    : safeImages[imageIndex] || FALLBACK_PET_IMAGE;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/55 flex items-end sm:items-center justify-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết tin: ${spot.title}`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full h-[100dvh] sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl bg-[#F5F6F2] text-ink sm:rounded-2xl sm:border sm:border-[#E2E5DC] shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="shrink-0 bg-[#F5F6F2] border-b border-[#E2E5DC] px-3 sm:px-5 py-2.5 pt-[max(10px,env(safe-area-inset-top,0px))] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-[10px] bg-white border border-[#E2E5DC] text-ink hover:bg-[#ECEFE7] flex items-center justify-center transition-colors"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
            </button>

            <h2 className="text-base sm:text-lg font-extrabold text-ink truncate">
              Chi tiết tin
            </h2>

            <div className="flex items-center gap-1.5">
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(spot)}
                  aria-pressed={isSaved}
                  aria-label={isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                  className={`min-w-[40px] min-h-[40px] rounded-[10px] border flex items-center justify-center transition-colors ${
                    isSaved
                      ? 'bg-brand-soft border-brand text-brand'
                      : 'bg-white border-[#E2E5DC] text-ink hover:border-brand'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isSaved ? 'fill-brand' : ''}`}
                  />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex min-w-[40px] min-h-[40px] rounded-[10px] bg-white border border-[#E2E5DC] text-ink-secondary hover:text-ink hover:bg-[#ECEFE7] items-center justify-center transition-colors"
                aria-label="Đóng chi tiết tin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          <div
            ref={bodyScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4"
          >
            {/* Main Image + Dedicated Counter/View Bar Below Image (No Overlay) */}
            <div className="space-y-2">
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="relative w-full aspect-[4/3] sm:aspect-[16/9] min-h-[190px] rounded-[16px] overflow-hidden bg-[#ECEFE7] border border-[#E2E5DC] cursor-zoom-in"
                title="Bấm vào ảnh để mở trình xem ảnh"
              >
                <img
                  src={currentHeroSrc}
                  alt={spot.title}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [imageIndex]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-0.5">
                {safeImages.length > 1 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setImageIndex(
                          (i) => (i - 1 + safeImages.length) % safeImages.length
                        )
                      }
                      className="w-8 h-8 rounded-[8px] bg-white border border-[#E2E5DC] hover:border-brand text-ink flex items-center justify-center transition-colors"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-2.5 py-1 text-xs font-bold text-ink-secondary">
                      {imageIndex + 1} / {safeImages.length}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setImageIndex((i) => (i + 1) % safeImages.length)
                      }
                      className="w-8 h-8 rounded-[8px] bg-white border border-[#E2E5DC] hover:border-brand text-ink flex items-center justify-center transition-colors"
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-ink-secondary">
                    1 / 1
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="h-9 px-3 rounded-[10px] bg-white border border-[#E2E5DC] hover:border-brand text-xs font-bold text-ink inline-flex items-center gap-1.5 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-brand" />
                  <span>Xem ảnh</span>
                </button>
              </div>

              {safeImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                  {safeImages.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => setImageIndex(idx)}
                      className={`relative w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border-2 transition-all ${
                        idx === imageIndex
                          ? 'border-brand shadow-sm'
                          : 'border-[#E2E5DC] opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`Xem ảnh ${idx + 1}`}
                      aria-pressed={idx === imageIndex}
                    >
                      <img
                        src={
                          failedImages[idx] ? FALLBACK_PET_IMAGE : imgUrl
                        }
                        alt={`${spot.title} - ảnh ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [idx]: true,
                          }))
                        }
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Badge + Title + Subline */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
                  style={{
                    backgroundColor: badgeMeta.bgHex,
                    color: badgeMeta.textHex,
                  }}
                >
                  {badgeMeta.uppercaseLabel}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {hasExactCoords && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E2E5DC] text-xs font-bold text-ink inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-brand shrink-0" />
                      <span>{formatDistanceVi(distanceMeters)}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onBoostLight(spot.id)}
                    className="px-2.5 py-0.5 rounded-full bg-[#FDECE7] border border-[#C84E2B]/25 text-xs font-bold text-[#C84E2B] inline-flex items-center gap-1 transition-colors hover:bg-[#FADCD3]"
                    title="Thắp thêm sự quan tâm cho bài viết"
                  >
                    <Flame className="w-3 h-3 fill-current" />
                    <span>Quan tâm ({spot.boostCount})</span>
                  </button>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-ink leading-snug">
                {spot.title}
              </h1>

              <p className="text-xs sm:text-sm text-ink-secondary flex flex-wrap items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                <span>{spot.formattedAddress || spot.areaLabel}</span>
                <span>·</span>
                <span className="font-semibold text-ink">
                  {friendlySource}
                </span>
              </p>
            </div>

            {/* Section 1: Đặc điểm nhận diện */}
            <div className="p-4 rounded-[14px] bg-white border border-[#E2E5DC] space-y-2.5">
              <h3 className="text-sm font-extrabold text-ink">
                Đặc điểm nhận diện
              </h3>

              <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">
                {spot.story}
              </p>

              {(spot.breed ||
                spot.coatColor ||
                (Array.isArray(spot.traits) && spot.traits.length > 0)) && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#ECEFE7]">
                  {spot.breed && spot.breed !== 'Chưa rõ giống' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#ECEFE7] text-xs font-semibold text-ink">
                      Giống: {spot.breed}
                    </span>
                  )}
                  {spot.coatColor && spot.coatColor !== 'Chưa rõ màu lông' && (
                    <span className="px-2.5 py-1 rounded-md bg-[#ECEFE7] text-xs font-semibold text-ink">
                      Màu lông: {spot.coatColor}
                    </span>
                  )}
                  {spot.traits?.map((trait) => (
                    <span
                      key={trait}
                      className="px-2.5 py-1 rounded-md bg-brand-soft text-xs font-semibold text-brand"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Lần cuối nhìn thấy / Vị trí ghi nhận */}
            <div className="p-4 rounded-[14px] bg-white border border-[#E2E5DC] space-y-1.5">
              <h3 className="text-sm font-extrabold text-ink">
                Lần cuối nhìn thấy
              </h3>
              <p className="text-sm text-ink-secondary">
                {spot.formattedAddress || spot.areaLabel}
                {publishedDateFormatted
                  ? ` · Ghi nhận ngày ${publishedDateFormatted}`
                  : ''}
              </p>
              {!hasExactCoords && (
                <p className="text-xs text-[#73827A] pt-1">
                  Bài viết chưa có tọa độ số nhà cụ thể nên hiển thị trong danh sách tin khu vực để tránh ghim sai vị trí.
                </p>
              )}
            </div>

            {/* Primary Action Buttons matching 03 · CHI TIẾT */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openSubPanelAndScroll('REPORT_SIGHTING')}
                className="w-full min-h-[44px] px-4 rounded-[12px] bg-[#ECEFE7] hover:bg-brand-soft border border-[#E2E5DC] text-sm font-bold text-ink flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-[#C84E2B] shrink-0" />
                <span>Tôi đã nhìn thấy bé</span>
              </button>

              {hasExactCoords && (
                <button
                  type="button"
                  onClick={() => onFocusSpotOnMap(spot)}
                  className="w-full min-h-[44px] px-4 rounded-[12px] bg-white hover:bg-[#ECEFE7] border border-[#E2E5DC] text-sm font-bold text-ink flex items-center justify-center gap-2 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand shrink-0" />
                  <span>Xem vị trí trên bản đồ</span>
                </button>
              )}

              {hasExactCoords && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <a
                    href={googleMapsDirectionFromUserUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3.5 rounded-[10px] bg-white border border-[#E2E5DC] hover:border-brand text-xs font-bold text-ink flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-brand" />
                    <span>Chỉ đường Google Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onSaveSpotToGoogleMapsVault(spot)}
                    className="min-h-[40px] px-3.5 rounded-[10px] bg-white border border-[#E2E5DC] hover:border-brand text-xs font-bold text-ink flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-brand" />
                    <span>Lưu vào Sổ tay vị trí</span>
                  </button>
                </div>
              )}
            </div>

            {isUserPost && (
              <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">
                      Đăng bởi: {spot.authorName}
                    </p>
                    <p className="text-xs text-ink-secondary flex flex-wrap items-center gap-2 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      {isContactUnlocked && spot.rawPhoneSecret ? (
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <a
                            href={`tel:${spot.rawPhoneSecret}`}
                            className="font-bold text-brand underline"
                          >
                            {spot.rawPhoneSecret} (Bấm để gọi)
                          </a>
                          <a
                            href={`https://zalo.me/${spot.rawPhoneSecret.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-brand-soft text-brand text-[11px] font-bold hover:bg-brand hover:text-white transition-colors"
                          >
                            Nhắn Zalo
                          </a>
                        </span>
                      ) : (
                        <span>
                          SĐT bảo mật:{' '}
                          <strong>
                            {spot.maskedPhone || 'Chưa cung cấp SĐT'}
                          </strong>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {spot.spotType === 'RED_SOS' && (
                  <button
                    type="button"
                    onClick={handleGeneratePoster}
                    className="min-h-[40px] px-3 rounded-[10px] bg-[#FFF0E5] text-[#AF421F] text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Tạo Poster QR</span>
                  </button>
                )}
              </div>
            )}

            {spot.sightings && spot.sightings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-brand">
                  Manh mối cộng đồng báo về ({spot.sightings.length})
                </p>
                <div className="space-y-2">
                  {spot.sightings.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-white border border-[#DDDCD4] flex items-start gap-3"
                    >
                      {st.imageUrl && (
                        <img
                          src={st.imageUrl}
                          alt={st.note}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#F1EFE8]"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-brand">
                            {st.reporterName}
                          </span>
                          <span className="text-ink-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {st.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-ink mt-1">{st.note}</p>
                        {st.emotionTag && (
                          <p className="text-[11px] text-ink-secondary mt-0.5">
                            Trạng thái: {st.emotionTag}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={subPanelAnchorRef} className="space-y-3">
              {activeSubPanel === 'REPORT_SIGHTING' && (
                <form
                  onSubmit={handleSubmitSighting}
                  className="p-4 rounded-[14px] bg-white border border-[#E2E5DC] space-y-3"
                >
                  <p className="text-xs font-bold text-[#C84E2B]">
                    Báo tin vừa nhìn thấy bé ngoài đường
                  </p>
                  {!userSession && (
                    <input
                      type="text"
                      value={sightingReporterName}
                      onChange={(e) =>
                        setSightingReporterName(e.target.value)
                      }
                      placeholder="Tên của bạn (để người đăng biết ai hỗ trợ)..."
                      className="w-full h-11 px-3 rounded-[10px] bg-[#F5F6F2] border border-[#E2E5DC] text-xs text-ink outline-none focus:border-brand"
                      required
                    />
                  )}
                  <input
                    type="text"
                    value={sightingArea}
                    onChange={(e) => setSightingArea(e.target.value)}
                    placeholder="Vị trí nhìn thấy (VD: Hẻm 12 Thảo Điền)..."
                    className="w-full h-11 px-3 rounded-[10px] bg-[#F5F6F2] border border-[#E2E5DC] text-xs text-ink outline-none focus:border-brand"
                  />
                  <textarea
                    value={sightingNote}
                    onChange={(e) => setSightingNote(e.target.value)}
                    rows={2}
                    placeholder="Mô tả tình trạng của bé khi bạn nhìn thấy..."
                    className="w-full p-3 rounded-[10px] bg-[#F5F6F2] border border-[#E2E5DC] text-xs text-ink outline-none focus:border-brand"
                    required
                  />
                  {sightingError && (
                    <p className="text-xs font-bold text-[#C84E2B]">
                      {sightingError}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      ref={sightingFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSightingFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sightingFileRef.current?.click()}
                      className="min-h-[40px] px-3 rounded-[10px] bg-[#ECEFE7] text-xs font-semibold text-ink inline-flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {uploadingSighting
                          ? 'Đang nén ảnh...'
                          : sightingImage
                          ? 'Đã đính kèm 1 ảnh'
                          : 'Đính kèm ảnh'}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSubPanel('NONE')}
                        className="min-h-[40px] px-3 rounded-[10px] text-xs font-semibold text-ink-secondary"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="min-h-[40px] px-4 rounded-[10px] bg-[#C84E2B] text-white text-xs font-bold"
                      >
                        Gửi manh mối
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {activeSubPanel === 'UNLOCK_CONTACT' && (
                <form
                  onSubmit={handleSubmitUnlockContact}
                  className="p-4 rounded-[14px] bg-white border border-[#E2E5DC] space-y-3"
                >
                  <p className="text-xs font-bold text-brand">
                    Liên hệ người đăng để hỗ trợ hoặc nhận nuôi
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'ADOPT_REQUEST', label: 'Xin nhận nuôi' },
                      { id: 'FOSTER_OFFER', label: 'Nhận nuôi tạm' },
                      { id: 'SIGHTING_REPORT', label: 'Báo manh mối' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setContactRequestType(opt.id as typeof contactRequestType)
                        }
                        className={`min-h-[38px] px-2 rounded-[10px] text-[11px] font-bold transition-colors ${
                          contactRequestType === opt.id
                            ? 'bg-brand text-white'
                            : 'bg-[#ECEFE7] text-ink'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={2}
                    placeholder="Lời nhắn gửi tới người đăng tin..."
                    className="w-full p-3 rounded-[10px] bg-[#F5F6F2] border border-[#E2E5DC] text-xs text-ink outline-none focus:border-brand"
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubPanel('NONE')}
                      className="min-h-[40px] px-3 rounded-[10px] text-xs font-semibold text-ink-secondary"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 rounded-[10px] bg-brand text-white text-xs font-bold"
                    >
                      Gửi &amp; Xem SĐT
                    </button>
                  </div>
                </form>
              )}

              {activeSubPanel === 'QR_POSTER' && (
                <div className="p-4 rounded-[14px] bg-white border border-[#E2E5DC] space-y-3 text-center">
                  {generatingPoster ? (
                    <p className="text-xs py-6 text-ink-secondary">
                      Đang tạo Poster QR...
                    </p>
                  ) : (
                    posterDataUrl && (
                      <div className="space-y-3">
                        <img
                          src={posterDataUrl}
                          alt="Poster QR Tìm Thú Lạc"
                          className="w-56 mx-auto rounded-xl border border-[#E2E5DC]"
                        />
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={posterDataUrl}
                            download={`Poster-Tim-Thu-Lac-${spot.id}.png`}
                            className="min-h-[40px] px-4 rounded-[10px] text-xs font-bold text-white bg-[#C84E2B] inline-flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải Poster QR (.PNG)</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setActiveSubPanel('NONE')}
                            className="min-h-[40px] px-3 rounded-[10px] text-xs font-semibold text-ink-secondary"
                          >
                            Thu gọn
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {isAuthor && (
                <div className="p-3.5 rounded-[14px] bg-white border border-brand/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand">
                      Quản lý bài đăng của bạn
                    </p>
                    <span className="text-[11px] font-semibold text-ink-secondary">
                      Chủ bài viết
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onEditSpot && (
                      <button
                        type="button"
                        onClick={() => onEditSpot(spot)}
                        className="flex-1 min-w-[140px] min-h-[42px] px-3.5 rounded-[10px] text-xs font-bold bg-brand hover:bg-brand-hover text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Chỉnh sửa bài viết</span>
                      </button>
                    )}

                    {spot.spotType !== 'GREEN_PEACE' && (
                      <button
                        type="button"
                        onClick={() => onResolveSpotToPeace(spot.id)}
                        className="flex-1 min-w-[160px] min-h-[42px] px-3.5 rounded-[10px] text-xs font-bold bg-brand-soft hover:bg-[#D5E3CC] text-brand inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Đánh dấu: Đã đoàn tụ</span>
                      </button>
                    )}

                    {onDeleteSpot &&
                      (confirmDelete ? (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDelete(false);
                              onDeleteSpot(spot.id);
                            }}
                            className="flex-1 sm:flex-none min-h-[42px] px-3.5 rounded-[10px] text-xs font-bold bg-[#C84E2B] hover:bg-[#A63D1F] text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xác nhận xóa bài</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="min-h-[42px] px-3 rounded-[10px] text-xs font-semibold text-ink-secondary bg-[#F5F6F2] border border-[#E2E5DC]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="min-h-[42px] px-3.5 rounded-[10px] text-xs font-bold text-[#C84E2B] bg-[#FDECE7] hover:bg-[#C84E2B] hover:text-white border border-[#C84E2B]/30 inline-flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa bài đăng</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="shrink-0 bg-[#F5F6F2] border-t border-[#E2E5DC] px-4 sm:px-6 py-3 pb-[max(12px,env(safe-area-inset-bottom,0px))] flex items-center gap-2.5">
            {!isUserPost && spot.sourceUrl ? (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[48px] px-4 rounded-[12px] bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Đọc bài gốc ({platformBadge.shortLabel})</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            ) : isContactUnlocked && spot.rawPhoneSecret ? (
              <a
                href={`tel:${spot.rawPhoneSecret}`}
                className="flex-1 min-h-[48px] px-4 rounded-[12px] bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Gọi ngay: {spot.rawPhoneSecret}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => openSubPanelAndScroll('UNLOCK_CONTACT')}
                className="flex-1 min-h-[48px] px-4 rounded-[12px] bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>
                  {userSession ? 'Liên hệ người đăng' : 'Đăng nhập để liên hệ'}
                </span>
              </button>
            )}
          </footer>
        </div>
      </div>

      <ImageLightboxModal
        key="spot-detail-lightbox"
        images={safeImages}
        initialIndex={imageIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onIndexChange={(nextIdx) => setImageIndex(nextIdx)}
        title={spot.title}
      />
    </>
  );
}
