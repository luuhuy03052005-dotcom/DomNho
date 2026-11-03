'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { DomSpot } from '@/lib/types';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface ContextMapCardProps {
  spots: DomSpot[];
  onOpenFullMap: () => void;
  userCoords: { lat: number; lng: number; label: string };
}

export default function ContextMapCard({
  spots,
  onOpenFullMap,
  userCoords,
}: ContextMapCardProps) {
  const totalPins = spots.filter((s) => isSpotPinAllowedOnMap(s)).length;

  return (
    <div className="bg-white rounded-xl border border-[#DDDCD4] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#142820]">
            Bản đồ quanh bạn
          </h3>
          <p className="text-xs text-[#52605A] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-[#0E513B] shrink-0" />
            <span className="truncate">{userCoords.label || 'Thủ Đức, TP.HCM'}</span>
          </p>
        </div>

        <span className="text-xs font-semibold text-[#0E513B] bg-[#E8EFE6] px-2.5 py-1 rounded-md shrink-0">
          {totalPins} vị trí
        </span>
      </div>

      <div
        onClick={onOpenFullMap}
        className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border border-[#DDDCD4] bg-[#F4F0E6] cursor-pointer"
        title="Bấm để mở bản đồ"
      >
        <svg
          viewBox="0 0 360 225"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
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
          <circle cx="175" cy="112" r="7" fill="#0E513B" />
          <circle cx="220" cy="68" r="9" fill="#AF421F" />
          <circle cx="128" cy="72" r="9" fill="#0E513B" />
          <circle cx="142" cy="152" r="8" fill="#80570D" />
        </svg>
      </div>

      <button
        type="button"
        onClick={onOpenFullMap}
        className="w-full h-10 px-4 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors"
      >
        Mở bản đồ tương tác →
      </button>
    </div>
  );
}
