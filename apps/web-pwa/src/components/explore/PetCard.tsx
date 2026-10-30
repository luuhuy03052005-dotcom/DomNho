'use client';

import React, { useState } from 'react';
import { Heart, Home, LifeBuoy, MapPin, Search } from 'lucide-react';
import { DomSpot } from '@/lib/types';
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

  let badgeLabel = 'Cần cứu trợ';
  let badgeIcon = LifeBuoy;
  let badgeBg = 'bg-[#FFF0E5]';
  let badgeText = 'text-[#AF421F]';

  if (isRescueCenter) {
    badgeLabel = 'Trạm cứu hộ';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6]';
    badgeText = 'text-[#0E513B]';
  } else if (isRescue) {
    badgeLabel = 'CẦN CỨU TRỢ';
    badgeIcon = LifeBuoy;
    badgeBg = 'bg-[#FFF0E5]';
    badgeText = 'text-[#AF421F]';
  } else if (isAdopt) {
    badgeLabel = 'CHỜ NHẬN NUÔI';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6]';
    badgeText = 'text-[#0E513B]';
  } else if (isLost) {
    badgeLabel = 'TÌM THÚ LẠC';
    badgeIcon = Search;
    badgeBg = 'bg-[#FFF3D8]';
    badgeText = 'text-[#80570D]';
  } else if (isPeace) {
    badgeLabel = 'ĐÃ BÌNH YÊN';
    badgeIcon = Home;
    badgeBg = 'bg-[#E8EFE6]';
    badgeText = 'text-[#0E513B]';
  }

  const BadgeIcon = badgeIcon;

  const publishedLabel = spot.publishedDate
    ? new Date(spot.publishedDate).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })
    : null;

  const fallbackLocation = spot.formattedAddress || spot.areaLabel || 'Chưa rõ khu vực';
  const metaParts: string[] = [fallbackLocation];
  if (spot.hoursAgo && spot.hoursAgo <= 1) {
    metaParts.push(`${Math.round(spot.hoursAgo * 60)} phút trước`);
  } else if (publishedLabel) {
    metaParts.push(publishedLabel);
  }

  if (spot.traits && spot.traits.length > 0) {
    const medicalTrait = spot.traits.find(
      (t) =>
        t.toLowerCase().includes('tiêm') ||
        t.toLowerCase().includes('tháng') ||
        t.toLowerCase().includes('tuổi')
    );
    if (medicalTrait) {
      metaParts.push(medicalTrait);
    }
  }

  const metaString = metaParts.join(' · ');

  const ctaText =
    isRescue || isLost
      ? 'Xem cách giúp bé →'
      : `Tìm hiểu về ${spot.breed ? spot.breed : 'bé'} →`;

  const imageUrl =
    !imgError && spot.images && spot.images[0]
      ? spot.images[0]
      : 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80';

  return (
    <article className="pet-card bg-white rounded-[14px] border border-[#DDDCD4] overflow-hidden flex flex-col justify-between shadow-[0_2px_12px_rgba(20,40,32,0.04)] hover:shadow-[0_4px_20px_rgba(20,40,32,0.08)] transition-all">
      <div
        onClick={() => onSelectDetail(spot)}
        className="relative w-full aspect-[16/9] bg-[#F1EFE8] overflow-hidden cursor-pointer group"
      >
        <img
          src={imageUrl}
          alt={spot.title}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
        />
      </div>

      <div className="pet-card__body p-4 sm:p-4.5 flex-1 flex flex-col justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wider ${badgeBg} ${badgeText}`}
            >
              <BadgeIcon className="w-3.5 h-3.5 shrink-0 stroke-[2.2]" />
              <span>{badgeLabel}</span>
            </span>

            {distMeters !== null && (
              <span className="text-xs font-semibold text-[#142820] flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
                <span>{formatDistanceVi(distMeters)}</span>
              </span>
            )}
          </div>

          <h3
            onClick={() => onSelectDetail(spot)}
            className="text-base sm:text-[18px] font-bold text-[#142820] hover:text-[#0E513B] transition-colors cursor-pointer leading-snug line-clamp-1"
          >
            {spot.title}
          </h3>

          <p className="text-xs sm:text-[13px] text-[#52605A] flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3 h-3 text-[#52605A] shrink-0" />
            <span>{metaString}</span>
          </p>

          <p className="text-xs sm:text-[13px] text-[#52605A] leading-relaxed line-clamp-2">
            {spot.story || 'Cần tìm người chung tay hỗ trợ chăm sóc bé.'}
          </p>
        </div>

        <div className="pet-card__actions flex items-center gap-2 mt-3 pt-1">
          <button
            type="button"
            onClick={() => onSelectDetail(spot)}
            className="pet-card__primary flex-1 h-11 px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>{ctaText}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(spot)}
            className={`w-11 h-11 shrink-0 rounded-[10px] border flex items-center justify-center transition-all active:scale-90 ${
              isSaved
                ? 'border-[#AF421F] bg-[#FFF0E5] text-[#AF421F]'
                : 'border-[#DDDCD4] bg-white text-[#52605A] hover:border-[#0E513B] hover:text-[#142820]'
            }`}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Bỏ lưu tin về ${spot.title}`
                : `Lưu tin về ${spot.title}`
            }
            title={isSaved ? 'Đã lưu' : 'Lưu tin này'}
          >
            <Heart
              className={`w-4 h-4 ${
                isSaved ? 'fill-[#AF421F]' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </article>
  );
}

