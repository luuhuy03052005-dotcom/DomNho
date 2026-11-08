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
    <LogoRoot onClick={onClick} className={className}>
      <span className="flex items-center gap-2 shrink-0">
        <span className="relative block h-9 w-9 shrink-0 overflow-hidden" aria-hidden="true">
          <img
            src="/logo-dom-nho.png"
            alt=""
            width="56"
            height="56"
            className="absolute left-[-10px] top-[-5px] h-[56px] w-[56px] max-w-none"
          />
        </span>

        <span className="text-[22px] font-extrabold tracking-tight text-ink leading-none font-sans">
          Đốm Nhỏ
        </span>
      </span>

      {showSlogan && (
        <span className="hidden xl:flex items-center gap-2 pl-1">
          <span className="text-border font-light">|</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
            Kết nối những điều tử tế
          </span>
        </span>
      )}
    </LogoRoot>
  );
}

function LogoRoot({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const classes = `inline-flex items-center gap-2 select-none ${
    onClick ? 'cursor-pointer hover:opacity-95 active:scale-95 transition-all' : ''
  } ${className}`;

  return onClick ? (
    <button type="button" onClick={onClick} aria-label="Về trang khám phá Đốm Nhỏ" className={classes}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
}

