'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  ExternalLink,
  Heart,
  Home,
  LifeBuoy,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  DomSpot,
  getFriendlySourceName,
  isUserWebPost,
} from '@/lib/types';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface PetCardProps {
  spot: DomSpot;
  userCoords: { lat: number; lng: number };
  onSelectDetail: (spot: DomSpot) => void;
  onToggleSave: (spot: DomSpot) => void;
  isSaved?: boolean;
}

export default function PetCard({
  spot,
  userCoords,
  onSelectDetail,
  onToggleSave,
  isSaved = false,
}: PetCardProps) {
  const [imgError, setImgError] = useState(false);
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
  const isAdopt = spot.spotType === 'YELLOW_ADOPT' || isRescueCenter;
  const isPeace = spot.spotType === 'GREEN_PEACE';

  let badgeLabel = 'CẦN CỨU TRỢ';
  let badgeIcon = LifeBuoy;
  let badgeBg = 'bg-[#FFF0E5] border-[#AF421F]/20';
  let badgeText = 'text-[#AF421F]';
  let accentBorderHover = 'hover:border-[#AF421F]/50';

  if (isRescueCenter) {
    badgeLabel = 'TRẠM CỨU HỘ';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6] border-[#0E513B]/20';
    badgeText = 'text-[#0E513B]';
    accentBorderHover = 'hover:border-[#0E513B]/50';
  } else if (isRescue) {
    badgeLabel = 'CẦN CỨU TRỢ SOS';
    badgeIcon = LifeBuoy;
    badgeBg = 'bg-[#FFF0E5] border-[#AF421F]/25';
    badgeText = 'text-[#AF421F]';
    accentBorderHover = 'hover:border-[#AF421F]/50';
  } else if (isAdopt) {
    badgeLabel = 'CHỜ NHẬN NUÔI';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6] border-[#0E513B]/20';
    badgeText = 'text-[#0E513B]';
    accentBorderHover = 'hover:border-[#0E513B]/50';
  } else if (isLost) {
    badgeLabel = 'TÌM THÚ LẠC';
    badgeIcon = Search;
    badgeBg = 'bg-[#FFF3D8] border-[#80570D]/25';
    badgeText = 'text-[#80570D]';
    accentBorderHover = 'hover:border-[#80570D]/50';
  } else if (isPeace) {
    badgeLabel = 'ĐÃ BÌNH YÊN';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6] border-[#0E513B]/20';
    badgeText = 'text-[#0E513B]';
    accentBorderHover = 'hover:border-[#0E513B]/50';
  }

  const BadgeIcon = badgeIcon;

  const sourceName = isUserPost
    ? 'Thành viên tự đăng'
    : getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );

  const publishedLabel = spot.publishedDate
    ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const locationDisplay =
    spot.formattedAddress || spot.areaLabel || 'Chưa rõ khu vực cụ thể';

  const ctaText =
    isRescue || isLost
      ? 'Xem cách giúp bé →'
      : isRescueCenter
      ? 'Xem thông tin trạm →'
      : 'Tìm hiểu & Nhận nuôi →';

  const imageUrl =
    !imgError && spot.images && spot.images[0]
      ? spot.images[0]
      : 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80';

  const displayTraits = (spot.traits || []).slice(0, 3);

  return (
    <article
      className={`group bg-white rounded-[18px] border border-[#DDDCD4] ${accentBorderHover} overflow-hidden flex flex-col justify-between shadow-[0_3px_16px_rgba(20,40,32,0.04)] hover:shadow-[0_10px_28px_rgba(20,40,32,0.09)] hover:-translate-y-0.5 transition-all duration-300`}
    >
      <div
        onClick={() => onSelectDetail(spot)}
        className="relative w-full aspect-[16/10] bg-[#F1EFE8] overflow-hidden cursor-pointer"
      >
        <img
          src={imageUrl}
          alt={spot.title}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,40,32,0.35) 0%, transparent 38%, transparent 62%, rgba(20,40,32,0.55) 100%)',
          }}
        />

        <div className="absolute top-3 left-3 right-14 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-md text-[#142820] text-[10px] font-bold shadow-sm truncate">
            <ShieldCheck className="w-3 h-3 text-[#0E513B] shrink-0" />
            <span className="truncate">{sourceName}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(spot);
          }}
          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-sm backdrop-blur-md ${
            isSaved
              ? 'bg-[#FFF0E5] text-[#AF421F] border border-[#AF421F]/30'
              : 'bg-white/90 text-[#142820] hover:bg-white'
          }`}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? `Bỏ lưu tin về ${spot.title}`
              : `Lưu tin về ${spot.title}`
          }
          title={isSaved ? 'Đã lưu vào danh sách' : 'Lưu bài viết này'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#AF421F]' : ''}`} />
        </button>

        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
          {distMeters !== null ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#142820]/85 backdrop-blur-md text-white text-[11px] font-bold shadow-sm">
              <MapPin className="w-3 h-3 text-[#D8724D] shrink-0" />
              <span>Cách bạn {formatDistanceVi(distMeters)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#142820]/75 backdrop-blur-md text-white text-[11px] font-medium shadow-sm max-w-[75%] truncate">
              <MapPin className="w-3 h-3 text-[#E8EFE6] shrink-0" />
              <span className="truncate">{spot.areaLabel || 'Việt Nam'}</span>
            </span>
          )}

          {spot.images && spot.images.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-sm shrink-0">
              <Camera className="w-3 h-3" />
              <span>{spot.images.length} ảnh</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider ${badgeBg} ${badgeText}`}
            >
              <BadgeIcon className="w-3.5 h-3.5 shrink-0 stroke-[2.3]" />
              <span>{badgeLabel}</span>
            </span>

            {publishedLabel && (
              <span className="text-[11px] font-medium text-[#52605A] flex items-center gap-1 shrink-0">
                <Calendar className="w-3 h-3 text-[#52605A]" />
                <span>{publishedLabel}</span>
              </span>
            )}
          </div>

          <h3
            onClick={() => onSelectDetail(spot)}
            className="text-base sm:text-[17px] font-bold text-[#142820] group-hover:text-[#0E513B] transition-colors cursor-pointer leading-snug line-clamp-2"
          >
            {spot.title}
          </h3>

          <p className="text-xs text-[#52605A] flex items-start gap-1.5 leading-snug">
            <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0 mt-0.5" />
            <span className="line-clamp-1 font-medium text-[#2F3E37]">
              {locationDisplay}
            </span>
          </p>

          <p className="text-xs sm:text-[13px] text-[#52605A] leading-relaxed line-clamp-2">
            {spot.story || 'Cần tìm người chung tay hỗ trợ chăm sóc và đón bé về nhà mới.'}
          </p>

          {displayTraits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {displayTraits.map((trait) => (
                <span
                  key={trait}
                  className="px-2.5 py-0.5 rounded-md bg-[#F5F2EB] border border-[#E6E2D8] text-[#3F4E47] text-[11px] font-semibold"
                >
                  {trait}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[#F1EFE8]">
          <button
            type="button"
            onClick={() => onSelectDetail(spot)}
            className="flex-1 h-10 sm:h-11 px-4 rounded-[11px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>{ctaText}</span>
          </button>

          {spot.sourceUrl && !isUserPost && (
            <a
              href={spot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-[11px] border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#E8EFE6] hover:border-[#0E513B] text-[#142820] hover:text-[#0E513B] flex items-center justify-center transition-all"
              title={`Mở bài gốc tại ${sourceName}`}
              aria-label={`Mở nguồn gốc bài viết tại ${sourceName}`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
