'use client';

import React from 'react';
import { ChevronRight, Home, MapPin } from 'lucide-react';
import { DomSpot } from '@/lib/types';

interface ContextMapCardProps {
  spots: DomSpot[];
  onOpenFullMap: () => void;
  userCoords: { lat: number; lng: number; label: string };
}

export default function ContextMapCard({
  spots: _spots,
  onOpenFullMap,
  userCoords: _userCoords,
}: ContextMapCardProps) {
  return (
    <div className="bg-white rounded-[14px] border border-[#DDDCD4] p-4 shadow-[0_2px_12px_rgba(20,40,32,0.04)] flex flex-col gap-3">
      <div
        onClick={onOpenFullMap}
        className="flex items-center justify-between cursor-pointer group"
      >
        <h3 className="text-sm font-bold text-[#142820] group-hover:text-[#0E513B] transition-colors">
          Các bé quanh bạn
        </h3>
        <ChevronRight className="w-4 h-4 text-[#52605A] group-hover:translate-x-0.5 transition-transform" />
      </div>

      <div
        onClick={onOpenFullMap}
        className="relative w-full aspect-[4/3] rounded-[10px] overflow-hidden border border-[#DDDCD4]/60 bg-[#FAF7F1] cursor-pointer group"
        title="Bấm để mở bản đồ tương tác đầy đủ"
      >
        <svg
          viewBox="0 0 320 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
          aria-hidden="true"
        >
          <rect width="320" height="240" fill="#FAF7F1" />

          <path
            d="M-20 60 L340 50 M-20 130 L340 140 M-20 200 L340 190"
            stroke="#DDDCD4"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          <path
            d="M80 -20 L90 260 M180 -20 L170 260 M260 -20 L270 260"
            stroke="#DDDCD4"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />

          <path
            d="M20 -20 C120 40, 160 80, 180 120 C200 160, 280 200, 340 220"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M-20 150 C80 140, 140 160, 200 240"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
          />

          <path
            d="M170 -10 C180 40, 200 80, 185 115 C170 150, 120 180, 110 210 C100 240, 120 250, 130 260"
            stroke="#CFE3E6"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M170 -10 C180 40, 200 80, 185 115 C170 150, 120 180, 110 210 C100 240, 120 250, 130 260"
            stroke="#B6D8DC"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text
            x="200"
            y="140"
            fill="#52605A"
            fontSize="9"
            fontWeight="bold"
            letterSpacing="0.5"
            transform="rotate(35 200 140)"
          >
            Sông Sài Gòn
          </text>

          <text x="210" y="55" fill="#142820" fontSize="11" fontWeight="bold">
            THỦ ĐỨC
          </text>
          <text x="30" y="95" fill="#142820" fontSize="10" fontWeight="bold">
            BÌNH THẠNH
          </text>
          <text x="40" y="170" fill="#142820" fontSize="10" fontWeight="bold">
            QUẬN 1
          </text>
          <text x="220" y="175" fill="#142820" fontSize="10" fontWeight="bold">
            QUẬN 2
          </text>

          <g transform="translate(195, 65)">
            <circle cx="12" cy="12" r="14" fill="#AF421F" />
            <circle cx="12" cy="12" r="11" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="8" fill="#AF421F" />
            <path
              d="M10 9 C10 8, 11 7, 12 7 C13 7, 14 8, 14 9 C14 10, 12 12, 12 12 C12 12, 10 10, 10 9 Z"
              fill="#FFFFFF"
            />
          </g>

          <g transform="translate(125, 60)">
            <circle cx="12" cy="12" r="14" fill="#0E513B" />
            <circle cx="12" cy="12" r="11" fill="#FFFFFF" />
            <circle cx="12" cy="12" r="8" fill="#0E513B" />
            <path d="M8 14 L12 10 L16 14 V16 H8 Z" fill="#FFFFFF" />
          </g>

          <g transform="translate(180, 95)">
            <circle cx="11" cy="11" r="13" fill="#0E513B" />
            <circle cx="11" cy="11" r="7" fill="#FFFFFF" />
          </g>

          <g transform="translate(145, 140)">
            <circle cx="11" cy="11" r="13" fill="#80570D" />
            <circle cx="11" cy="11" r="7" fill="#FFFFFF" />
          </g>

          <g transform="translate(85, 115)">
            <circle cx="12" cy="12" r="14" fill="#AF421F" />
            <circle cx="12" cy="12" r="8" fill="#FFFFFF" />
          </g>
        </svg>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-full bg-white/90 text-xs font-bold text-[#0E513B] shadow-md backdrop-blur-sm">
            Xem bản đồ lớn
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullMap}
        className="w-full h-11 px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
      >
        <span>Mở bản đồ →</span>
      </button>
    </div>
  );
}

