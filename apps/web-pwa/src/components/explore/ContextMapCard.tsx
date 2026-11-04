'use client';

import React, { useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { DomSpot, getSpotBadgeMeta } from '@/lib/types';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface ContextMapCardProps {
  spots: DomSpot[];
  onOpenFullMap: () => void;
  onOpenLocationPicker?: () => void;
  userCoords: { lat: number; lng: number; label: string };
}

export default function ContextMapCard({
  spots,
  onOpenFullMap,
  onOpenLocationPicker,
  userCoords,
}: ContextMapCardProps) {
  const pinnableSpots = useMemo(
    () => spots.filter((s) => isSpotPinAllowedOnMap(s)),
    [spots]
  );

  const categoryCounts = useMemo(() => {
    let rescue = 0;
    let lost = 0;
    let adopt = 0;
    for (const s of spots) {
      const kind = getSpotBadgeMeta(s).categoryKind;
      if (kind === 'RESCUE') rescue += 1;
      else if (kind === 'LOST') lost += 1;
      else adopt += 1;
    }
    return { rescue, lost, adopt };
  }, [spots]);

  return (
    <div className="bg-white rounded-[12px] border border-[#DDDCD4] p-4 sm:p-5 space-y-3.5 shadow-[0_3px_14px_rgba(20,40,32,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-[#142820]">
            Bản đồ quanh bạn
          </h3>
          <p className="text-xs text-[#52605A] flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">
              {userCoords.label || 'Thủ Đức, TP.HCM'}
            </span>
          </p>
        </div>

        <span className="text-xs font-bold text-[#0E513B] bg-[#E8EFE6] px-2.5 py-1 rounded-md shrink-0">
          {pinnableSpots.length} vị trí
        </span>
      </div>

      <div
        onClick={onOpenFullMap}
        className="relative w-full aspect-[16/10] rounded-[10px] overflow-hidden border border-[#DDDCD4] bg-[#F4F0E6] cursor-pointer group"
        title="Bấm để mở bản đồ tương tác"
      >
        <svg
          viewBox="0 0 360 225"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          aria-hidden="true"
        >
          <rect width="360" height="225" fill="#F6F2E9" />
          <path
            d="M-10 50 L370 40 M-10 115 L370 125 M-10 180 L370 170"
            stroke="#E2DDD2"
            strokeWidth="1.2"
          />
          <path
            d="M75 -10 L85 240 M180 -10 L170 240 M280 -10 L290 240"
            stroke="#E2DDD2"
            strokeWidth="1.2"
          />
          <path
            d="M10 -10 C110 35, 165 75, 190 115 C215 155, 285 190, 370 210"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M195 -10 C205 38, 222 76, 205 112 C188 148, 136 175, 125 205"
            stroke="#CFE3E6"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <circle
            cx="175"
            cy="112"
            r="8"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="2.5"
          />
          <circle
            cx="220"
            cy="68"
            r="9.5"
            fill="#AF421F"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <circle
            cx="128"
            cy="72"
            r="9.5"
            fill="#0E513B"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <circle
            cx="142"
            cy="152"
            r="8.5"
            fill="#D4942A"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-0.5">
        <div className="rounded-[9px] bg-[#FFF0E5]/70 border border-[#AF421F]/20 px-2.5 py-2 text-center">
          <p className="text-sm font-extrabold text-[#AF421F] leading-none">
            {categoryCounts.rescue}
          </p>
          <p className="text-[11px] font-semibold text-[#52605A] mt-1">
            Cứu trợ
          </p>
        </div>

        <div className="rounded-[9px] bg-[#FFF3D8]/80 border border-[#80570D]/20 px-2.5 py-2 text-center">
          <p className="text-sm font-extrabold text-[#80570D] leading-none">
            {categoryCounts.lost}
          </p>
          <p className="text-[11px] font-semibold text-[#52605A] mt-1">
            Thú lạc
          </p>
        </div>

        <div className="rounded-[9px] bg-[#E8EFE6]/85 border border-[#0E513B]/20 px-2.5 py-2 text-center">
          <p className="text-sm font-extrabold text-[#0E513B] leading-none">
            {categoryCounts.adopt}
          </p>
          <p className="text-[11px] font-semibold text-[#52605A] mt-1">
            Nhận nuôi
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFullMap}
          className="flex-1 min-h-[42px] px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
        >
          Mở bản đồ tương tác →
        </button>

        {onOpenLocationPicker && (
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="min-h-[42px] px-3 rounded-[10px] bg-[#FAF7F1] hover:bg-[#F1EFE8] border border-[#DDDCD4] text-xs font-bold text-[#142820] flex items-center justify-center gap-1.5 shrink-0 transition-colors"
            title="Đổi vị trí hoặc ghim trên bản đồ"
          >
            <Navigation className="w-3.5 h-3.5 text-[#AF421F]" />
            <span>Ghim vị trí</span>
          </button>
        )}
      </div>
    </div>
  );
}
