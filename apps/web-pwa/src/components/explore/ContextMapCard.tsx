'use client';

import React, { useMemo } from 'react';
import { Compass, Home, LifeBuoy, MapPin, Navigation, Search } from 'lucide-react';
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
  const stats = useMemo(() => {
    const pinnable = spots.filter((s) => isSpotPinAllowedOnMap(s));
    const sosCount = pinnable.filter((s) => s.spotType === 'RED_SOS').length;
    const lostCount = pinnable.filter((s) => s.spotType === 'ORANGE_SIGHT').length;
    const adoptCount = pinnable.filter(
      (s) => s.spotType === 'YELLOW_ADOPT' || s.entityCategory === 'RESCUE_CENTER'
    ).length;
    return {
      totalPins: pinnable.length,
      sosCount,
      lostCount,
      adoptCount,
    };
  }, [spots]);

  return (
    <div className="bg-white rounded-[20px] border border-[#DDDCD4] p-4 sm:p-5 shadow-[0_6px_24px_rgba(20,40,32,0.05)] flex flex-col gap-3.5">
      <div
        onClick={onOpenFullMap}
        className="flex items-center justify-between gap-2 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#142820] group-hover:text-[#0E513B] transition-colors truncate">
              Bản đồ cứu trợ quanh bạn
            </h3>
            <p className="text-[11px] text-[#52605A] truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#AF421F] shrink-0" />
              <span className="truncate">{userCoords.label || 'Thủ Đức, TP.HCM'}</span>
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-[#F1EFE8] text-[#0E513B] text-[11px] font-extrabold shrink-0">
          {stats.totalPins} điểm ghim
        </span>
      </div>

      <div
        onClick={onOpenFullMap}
        className="relative w-full aspect-[16/10] rounded-[14px] overflow-hidden border border-[#DDDCD4] bg-[#F4F0E6] cursor-pointer group"
        title="Bấm để mở bản đồ tương tác toàn màn hình"
      >
        <svg
          viewBox="0 0 360 225"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          aria-hidden="true"
        >
          <rect width="360" height="225" fill="#F6F2E9" />

          <path
            d="M-10 50 L370 40 M-10 115 L370 125 M-10 180 L370 170"
            stroke="#E2DDD2"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <path
            d="M75 -10 L85 240 M180 -10 L170 240 M280 -10 L290 240"
            stroke="#E2DDD2"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          <path
            d="M10 -10 C110 35, 165 75, 190 115 C215 155, 285 190, 370 210"
            stroke="#FFFFFF"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M-15 145 C85 135, 155 150, 235 235"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
          />

          <path
            d="M195 -10 C205 38, 222 76, 205 112 C188 148, 136 175, 125 205 C115 230, 130 240, 140 250"
            stroke="#D5E6E8"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M195 -10 C205 38, 222 76, 205 112 C188 148, 136 175, 125 205 C115 230, 130 240, 140 250"
            stroke="#BCD8DC"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <circle
            cx="175"
            cy="112"
            r="58"
            fill="#0E513B"
            fillOpacity="0.06"
            stroke="#0E513B"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <circle
            cx="175"
            cy="112"
            r="30"
            fill="#0E513B"
            fillOpacity="0.09"
          />

          <g transform="translate(175, 112)">
            <circle cx="0" cy="0" r="8" fill="#0E513B" />
            <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
          </g>

          <g transform="translate(220, 68)">
            <circle cx="0" cy="0" r="13" fill="#AF421F" />
            <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="7" fill="#AF421F" />
          </g>

          <g transform="translate(128, 72)">
            <circle cx="0" cy="0" r="13" fill="#0E513B" />
            <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="7" fill="#0E513B" />
          </g>

          <g transform="translate(142, 152)">
            <circle cx="0" cy="0" r="12" fill="#80570D" />
            <circle cx="0" cy="0" r="9" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="6" fill="#80570D" />
          </g>

          <g transform="translate(252, 138)">
            <circle cx="0" cy="0" r="12" fill="#0E513B" />
            <circle cx="0" cy="0" r="9" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="6" fill="#0E513B" />
          </g>
        </svg>

        <div className="absolute inset-0 bg-gradient-to-t from-[#142820]/45 via-transparent to-transparent flex items-end justify-between p-3">
          <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[#142820] shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0E513B] animate-pulse" />
            <span>Bản đồ trực quan thực tế</span>
          </span>

          <span className="px-3 py-1 rounded-full bg-[#0E513B] text-white text-[11px] font-bold shadow-sm group-hover:bg-[#0A412F] transition-colors">
            Phóng to →
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-[10px] bg-[#FFF0E5]/70 border border-[#AF421F]/15 text-center">
          <div className="flex items-center justify-center gap-1 text-[#AF421F] text-xs font-extrabold">
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>{stats.sosCount}</span>
          </div>
          <p className="text-[10px] font-semibold text-[#52605A] mt-0.5">
            Cứu trợ SOS
          </p>
        </div>

        <div className="p-2 rounded-[10px] bg-[#FFF3D8]/70 border border-[#80570D]/15 text-center">
          <div className="flex items-center justify-center gap-1 text-[#80570D] text-xs font-extrabold">
            <Search className="w-3.5 h-3.5" />
            <span>{stats.lostCount}</span>
          </div>
          <p className="text-[10px] font-semibold text-[#52605A] mt-0.5">
            Thú lạc
          </p>
        </div>

        <div className="p-2 rounded-[10px] bg-[#E8EFE6]/70 border border-[#0E513B]/15 text-center">
          <div className="flex items-center justify-center gap-1 text-[#0E513B] text-xs font-extrabold">
            <Home className="w-3.5 h-3.5" />
            <span>{stats.adoptCount}</span>
          </div>
          <p className="text-[10px] font-semibold text-[#52605A] mt-0.5">
            Trạm &amp; Nhận nuôi
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullMap}
        className="w-full h-11 px-4 rounded-[12px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
      >
        <Navigation className="w-4 h-4" />
        <span>Mở bản đồ cứu trợ toàn màn hình</span>
      </button>
    </div>
  );
}
