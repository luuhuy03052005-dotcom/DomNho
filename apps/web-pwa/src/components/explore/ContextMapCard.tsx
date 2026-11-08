'use client';

import React, { useMemo } from 'react';
import { Home, LifeBuoy, Map, MapPin } from 'lucide-react';
import { DomSpot, getSpotBadgeMeta } from '@/lib/types';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface ContextMapCardProps {
  spots: DomSpot[];
  onOpenFullMap: () => void;
  onOpenLocationPicker?: () => void;
  userCoords: { lat: number; lng: number; label: string };
}

function PawLegendIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="5.5" r="2.2" fill="currentColor" />
      <circle cx="17" cy="7.5" r="2.2" fill="currentColor" />
      <path
        d="M7.2 16C6.4 12.8 9 10.8 12 10.8C15 10.8 17.6 12.8 16.8 16C16.2 18.2 14.3 19.6 12 19.6C9.7 19.6 7.8 18.2 7.2 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ContextMapCard({
  spots,
  onOpenFullMap,
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
    <div className="bg-surface rounded-card border border-border p-4 space-y-3.5 shadow-[0_2px_10px_rgba(21,37,31,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink">
          Vị trí các tin
        </h3>
        <span className="text-xs font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full shrink-0">
          {pinnableSpots.length} điểm
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenFullMap}
        className="relative block w-full aspect-[16/10] rounded-btn overflow-hidden border border-border bg-surface-muted cursor-pointer group"
        aria-label={`Mở bản đồ tương tác, ${pinnableSpots.length} vị trí`}
      >
        <svg
          viewBox="0 0 360 225"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          aria-hidden="true"
        >
          <rect width="360" height="225" fill="#F2F0E8" />
          <path
            d="M0 36 Q95 55 155 110 T240 225"
            stroke="#9BD1E8"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M-10 55 L370 40 M-10 120 L370 130 M-10 185 L370 170"
            stroke="#E3E0D6"
            strokeWidth="1.6"
          />
          <path
            d="M85 -10 L95 240 M185 -10 L175 240 M285 -10 L295 240"
            stroke="#E3E0D6"
            strokeWidth="1.6"
          />
          <path
            d="M20 -10 C110 40, 175 80, 210 120 C245 160, 295 190, 370 210"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <text
            x="105"
            y="38"
            fill="#485650"
            fontSize="11"
            fontWeight="700"
          >
            Linh Chiểu
          </text>
          <text
            x="248"
            y="54"
            fill="#485650"
            fontSize="11"
            fontWeight="700"
          >
            P. Thủ Đức
          </text>
          <text
            x="192"
            y="112"
            fill="#15251F"
            fontSize="13"
            fontWeight="800"
          >
            {userCoords.label?.split(',')[0] || 'Thủ Đức'}
          </text>
          <text
            x="118"
            y="174"
            fill="#485650"
            fontSize="11"
            fontWeight="700"
          >
            Bình Quới
          </text>
          <text
            x="252"
            y="196"
            fill="#485650"
            fontSize="11"
            fontWeight="700"
          >
            Trường Thọ
          </text>

          {pinnableSpots.length > 0 && (
            <>
              <circle cx="142" cy="64" r="13" fill="#E09F24" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="142" cy="64" r="4.5" fill="#FFFFFF" />
              <circle cx="276" cy="96" r="13" fill="#C84B24" stroke="#FFFFFF" strokeWidth="2.5" />
              <path d="M276 91V101M271 96H281" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="188" cy="168" r="13" fill="#2E6F40" stroke="#FFFFFF" strokeWidth="2.5" />
              <circle cx="188" cy="168" r="4.5" fill="#FFFFFF" />
            </>
          )}
        </svg>
        <span className="absolute bottom-2 left-2 right-2 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">
          {pinnableSpots.length === 0
            ? 'Chưa có tin đủ vị trí để ghim trên bản đồ'
            : 'Hình minh họa · Mở bản đồ để xem vị trí thật'}
        </span>
      </button>

      <div className="grid grid-cols-3 divide-x divide-border pt-0.5 text-xs">
        <div className="flex items-center justify-center gap-1.5 pr-2">
          <span className="w-5 h-5 rounded-full bg-[#FFF0E8] text-[#A83D20] flex items-center justify-center shrink-0">
            <LifeBuoy className="w-3 h-3" />
          </span>
          <span className="font-semibold text-ink">
            Cứu trợ ({categoryCounts.rescue})
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-2">
          <span className="w-5 h-5 rounded-full bg-[#FFF0BF] text-[#775000] flex items-center justify-center shrink-0">
            <PawLegendIcon className="w-3 h-3" />
          </span>
          <span className="font-semibold text-ink">
            Thú lạc ({categoryCounts.lost})
          </span>
        </div>

        <div className="flex items-center justify-center gap-1.5 pl-2">
          <span className="w-5 h-5 rounded-full bg-[#E9F2E2] text-[#275B3A] flex items-center justify-center shrink-0">
            <Home className="w-3 h-3" />
          </span>
          <span className="font-semibold text-ink">
            Nhận nuôi ({categoryCounts.adopt})
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullMap}
        className="w-full min-h-[44px] px-4 rounded-btn bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Map className="w-4 h-4 shrink-0" />
        <span>Mở bản đồ</span>
      </button>
    </div>
  );
}
