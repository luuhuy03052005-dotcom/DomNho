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

  const isRescueCenter = spot.entityCategory === 'RESCUE_CENTER';
  const isRescue = spot.spotType === 'RED_SOS';
  const isLost = spot.spotType === 'ORANGE_SIGHT';

  let badgeLabel = 'Cần cứu trợ';
  let badgeClass = 'bg-[#FFF0E5] text-[#AF421F]';

  if (isRescueCenter) {
    badgeLabel = 'Trạm cứu hộ';
    badgeClass = 'bg-[#E8EFE6] text-[#0E513B]';
  } else if (isRescue) {
    badgeLabel = 'Cần cứu trợ';
    badgeClass = 'bg-[#FFF0E5] text-[#AF421F]';
  } else if (isLost) {
    badgeLabel = 'Tìm thú lạc';
    badgeClass = 'bg-[#FFF3D8] text-[#80570D]';
  } else {
    badgeLabel = 'Chờ nhận nuôi';
    badgeClass = 'bg-[#E8EFE6] text-[#0E513B]';
  }

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
    spot.formattedAddress || spot.areaLabel || 'Chưa rõ khu vực';

  const imageUrl =
    !imgError && spot.images && spot.images[0]
      ? spot.images[0]
      : FALLBACK_PET_IMAGE;

  const photoCount = Array.isArray(spot.images) ? spot.images.length : 1;

  return (
    <>
      <article
        className={`bg-white rounded-xl border overflow-hidden flex flex-col justify-between transition-colors ${
          matchInfo
            ? 'border-[#0E513B] ring-1 ring-[#0E513B]/20'
            : 'border-[#DDDCD4] hover:border-[#0E513B]/50'
        }`}
      >
        <div
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full aspect-[16/10] bg-[#F1EFE8] overflow-hidden cursor-zoom-in group"
          title="Bấm vào ảnh để phóng to xem rõ hơn"
        >
          <img
            src={imageUrl}
            alt={spot.title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {matchInfo && (
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#0E513B] text-white text-xs font-bold flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Trùng khớp {matchInfo.matchPercent}%</span>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(spot);
            }}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
              isSaved
                ? 'bg-[#FFF0E5] text-[#AF421F] border border-[#AF421F]/30'
                : 'bg-white/90 text-[#142820] hover:bg-white'
            }`}
            aria-label={isSaved ? 'Bỏ lưu' : 'Lưu bài viết'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#AF421F]' : ''}`} />
          </button>

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
                <Camera className="w-3.5 h-3.5" />
                <span>Xem {photoCount} ảnh</span>
              </>
            ) : (
              <>
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Xem ảnh rõ</span>
              </>
            )}
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            {matchInfo && matchInfo.matchReasons.length > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg bg-[#E8EFE6]/70 border border-[#0E513B]/20 text-[11px] font-semibold text-[#0E513B]">
                Điểm giống: {matchInfo.matchReasons.join(' · ')}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${badgeClass}`}
              >
                {badgeLabel}
              </span>

              <div className="flex items-center gap-2 text-[#52605A] font-medium">
                {distMeters !== null && (
                  <span className="text-[#142820] font-semibold flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-[#0E513B]" />
                    {formatDistanceVi(distMeters)}
                  </span>
                )}
                {publishedLabel && <span>• {publishedLabel}</span>}
              </div>
            </div>

            <h3
              onClick={() => onSelectDetail(spot)}
              className="text-base font-bold text-[#142820] hover:text-[#0E513B] cursor-pointer leading-snug line-clamp-2"
            >
              {spot.title}
            </h3>

            <p className="text-xs text-[#52605A] truncate">
              {locationDisplay} · Nguồn: {sourceName}
            </p>

            <p className="text-xs text-[#52605A] leading-relaxed line-clamp-2">
              {spot.story}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#F1EFE8]">
            <button
              type="button"
              onClick={() => onSelectDetail(spot)}
              className="flex-1 h-10 px-3 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors"
            >
              Xem chi tiết
            </button>

            {spot.sourceUrl && !isUserPost && (
              <a
                href={spot.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-10 px-3 rounded-lg border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#F1EFE8] text-[#142820] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                title={`Mở bài gốc tại ${sourceName}`}
              >
                <span>Nguồn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
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
