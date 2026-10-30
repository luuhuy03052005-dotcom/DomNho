'use client';

import React from 'react';

interface DomNhoLogoProps {
  showSlogan?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function DomNhoLogo({
  showSlogan = true,
  className = '',
  onClick,
}: DomNhoLogoProps) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${
        onClick ? 'cursor-pointer hover:opacity-95 active:scale-95 transition-all' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <svg
          width="32"
          height="32"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 shrink-0"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="11" rx="4" ry="5.5" fill="#142820" />
          <ellipse cx="21" cy="8.5" rx="4.2" ry="6" fill="#142820" />
          <ellipse cx="30" cy="12" rx="4" ry="5.5" fill="#142820" />
          <path
            d="M9.5 25.5C8 19.5 13.5 15.5 21 15.5C28.5 15.5 34 19.5 32.5 25.5C31.5 29.5 26.5 33 21 33C15.5 33 10.5 29.5 9.5 25.5Z"
            fill="#142820"
          />
          <circle cx="21" cy="24.5" r="5" fill="#AF421F" />
        </svg>

        <span className="text-[22px] font-extrabold tracking-tight text-[#142820] leading-none font-sans">
          đốm nhỏ
        </span>
      </div>

      {showSlogan && (
        <div className="hidden sm:flex items-center gap-2 pl-1">
          <span className="text-[#DDDCD4] font-light">|</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#52605A]">
            Kết nối những điều tử tế
          </span>
        </div>
      )}
    </div>
  );
}

