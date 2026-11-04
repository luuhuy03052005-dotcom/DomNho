'use client';

import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Heart,
  MapPin,
  ZoomIn,
} from 'lucide-react';
import ImageLightboxModal from '@/components/modals/ImageLightboxModal';
import {
  DomSpot,
  getFriendlySourceName,
  getSpotBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80';

interface PetCardProps {
  spot: DomSpot;
  userCoords: { lat: number; lng: number };
  onSelectDetail: (spot: DomSpot) => void;
  onToggleSave: (spot: DomSpot) => void;
  isSaved?: boolean;
  matchInfo?: {
    matchPercent: number;
    matchReasons: string[];
  };
}

export default function PetCard({
  spot,
  userCoords,
  onSelectDetail,
  onToggleSave,
  isSaved = false,
  matchInfo,
}: PetCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const hasMapPin = isSpotPinAllowedOnMap(spot);
  const isUserPost = isUserWebPost(spot);

  const distMeters = hasMapPin
    ? calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      )
    : null;

  const badgeMeta = getSpotBadgeMeta(spot);

  const sourceName = isUserPost
    ? 'Tự đăng trên web'
    : getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );

  const publishedLabel = spot.publishedDate
    ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })
    : null;

  const locationDisplay =
    spot.areaLabel || spot.formattedAddress || 'Chưa rõ khu vực';

  const imageUrl =
    !imgError && spot.images && spot.images[0]
      ? spot.images[0]
      : FALLBACK_PET_IMAGE;

  const photoCount = Array.isArray(spot.images) ? spot.images.length : 1;

  return (
    <>
      <article
        className={`shrink-0 h-auto min-w-0 bg-white rounded-[12px] border flex flex-col justify-between transition-colors shadow-[0_3px_14px_rgba(20,40,32,0.05)] ${
          matchInfo
            ? 'border-[#0E513B] ring-1 ring-[#0E513B]/20'
            : 'border-[#DDDCD4] hover:border-[#0E513B]/50'
        }`}
      >
        <div
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full aspect-[16/9] min-h-[190px] shrink-0 bg-[#F1EFE8] rounded-t-[11px] overflow-hidden cursor-zoom-in group"
          title="Bấm vào ảnh để phóng to xem rõ hơn"
        >
          <img
            src={imageUrl}
            alt={spot.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {matchInfo && (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#0E513B] text-white text-xs font-bold flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Trùng khớp {matchInfo.matchPercent}%</span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/85 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
          >
            {photoCount > 1 ? (
              <>
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>Xem {photoCount} ảnh</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                <span>Xem ảnh rõ</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3.5 sm:p-4 flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="space-y-2 min-w-0">
            {matchInfo && matchInfo.matchReasons.length > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-[#E8EFE6]/70 border border-[#0E513B]/20 text-[11px] font-semibold text-[#0E513B]">
                Điểm giống: {matchInfo.matchReasons.join(' · ')}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span
                className="px-2 py-0.5 rounded font-extrabold text-[11px] uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: badgeMeta.bgHex,
                  color: badgeMeta.textHex,
                }}
              >
                {badgeMeta.uppercaseLabel}
              </span>

              <div className="flex items-center gap-1.5 text-[#52605A] font-medium min-w-0">
                {distMeters !== null ? (
                  <span className="text-[#142820] font-semibold inline-flex items-center gap-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#0E513B] shrink-0" />
                    <span className="truncate">{formatDistanceVi(distMeters)}</span>
                  </span>
                ) : (
                  <span className="text-[#52605A] inline-flex items-center gap-0.5 truncate">
                    <MapPin className="w-3 h-3 text-[#0E513B] shrink-0" />
                    <span className="truncate">{locationDisplay}</span>
                  </span>
                )}
                {publishedLabel && (
                  <span className="shrink-0">• {publishedLabel}</span>
                )}
              </div>
            </div>

            <h3
              onClick={() => onSelectDetail(spot)}
              className="text-base sm:text-[17px] font-extrabold text-[#142820] hover:text-[#0E513B] cursor-pointer leading-snug line-clamp-2 min-h-[2.75rem] break-words"
            >
              {spot.title}
            </h3>

            <p className="text-xs text-[#52605A] truncate">
              {locationDisplay} · Nguồn: {sourceName}
            </p>

            <p className="text-xs sm:text-[13px] text-[#52605A] leading-relaxed line-clamp-2 min-h-[2.5rem] break-words">
              {spot.story}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#F1EFE8]">
            <button
              type="button"
              onClick={() => onSelectDetail(spot)}
              className="flex-1 min-w-[110px] min-h-[44px] px-3 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
            >
              Xem chi tiết
            </button>

            {spot.sourceUrl && !isUserPost && (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="min-h-[44px] px-3 rounded-[10px] border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#F1EFE8] text-[#142820] text-xs font-bold flex items-center justify-center gap-1 transition-colors shrink-0"
                title={`Mở bài gốc tại ${sourceName}`}
              >
                <span>Nguồn</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(spot);
              }}
              aria-pressed={isSaved}
              aria-label={
                isSaved
                  ? `Bỏ lưu bài viết ${spot.title}`
                  : `Lưu bài viết ${spot.title}`
              }
              title={isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
              className={`min-w-[44px] min-h-[44px] rounded-[10px] border flex items-center justify-center transition-colors shrink-0 ${
                isSaved
                  ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F]'
                  : 'bg-white text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${isSaved ? 'fill-[#AF421F]' : ''}`}
              />
            </button>
          </div>
        </div>
      </article>

      <ImageLightboxModal
        images={spot.images}
        initialIndex={0}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={spot.title}
      />
    </>
  );
}
