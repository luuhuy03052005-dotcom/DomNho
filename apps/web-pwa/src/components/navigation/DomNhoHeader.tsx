'use client';

import React from 'react';
import { ChevronDown, MapPin, Plus } from 'lucide-react';
import DomNhoLogo from '@/components/brand/DomNhoLogo';
import { MainTab, UserSession } from '@/lib/types';

interface DomNhoHeaderProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  locationLabel: string;
  onOpenLocationPicker: () => void;
  onOpenCreatePost: () => void;
  onOpenProfile: () => void;
  userSession: UserSession | null;
}

export default function DomNhoHeader({
  activeTab,
  onChangeTab,
  locationLabel,
  onOpenLocationPicker,
  onOpenCreatePost,
  onOpenProfile,
  userSession,
}: DomNhoHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF7F1]/95 backdrop-blur-md border-b border-[#DDDCD4]/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 shrink-0">
          <DomNhoLogo onClick={() => onChangeTab('explore')} />
        </div>

        <nav
          className="hidden md:flex items-center gap-8 text-sm font-semibold"
          aria-label="Điều hướng chính"
        >
          <button
            type="button"
            onClick={() => onChangeTab('explore')}
            className={`relative py-2 transition-colors ${
              activeTab === 'explore'
                ? 'text-[#142820] font-bold'
                : 'text-[#52605A] hover:text-[#142820]'
            }`}
            aria-current={activeTab === 'explore' ? 'page' : undefined}
          >
            <span>Khám phá</span>
            {activeTab === 'explore' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0E513B] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('map')}
            className={`relative py-2 transition-colors ${
              activeTab === 'map'
                ? 'text-[#142820] font-bold'
                : 'text-[#52605A] hover:text-[#142820]'
            }`}
            aria-current={activeTab === 'map' ? 'page' : undefined}
          >
            <span>Bản đồ</span>
            {activeTab === 'map' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0E513B] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('stories')}
            className={`relative py-2 transition-colors ${
              activeTab === 'stories'
                ? 'text-[#142820] font-bold'
                : 'text-[#52605A] hover:text-[#142820]'
            }`}
            aria-current={activeTab === 'stories' ? 'page' : undefined}
          >
            <span>Câu chuyện</span>
            {activeTab === 'stories' && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0E513B] rounded-full" />
            )}
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:border-[#0E513B] active:scale-95 transition-all shadow-sm max-w-[190px]"
            title="Đổi khu vực tìm kiếm"
          >
            <MapPin className="w-3.5 h-3.5 text-[#142820] shrink-0" />
            <span className="truncate">{locationLabel || 'Thủ Đức, TP.HCM'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Đăng tin cứu hộ hoặc tìm thú lạc"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Đăng tin</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 rounded-full hover:bg-black/5 active:scale-95 transition-all"
            title="Hồ sơ & Tài khoản"
            aria-label="Tài khoản cá nhân"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-[#DDDCD4] bg-white flex items-center justify-center shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=120&q=80"
                alt={userSession?.displayName || 'Tài khoản'}
                className="w-full h-full object-cover"
              />
            </div>
            <ChevronDown className="hidden sm:inline w-3.5 h-3.5 text-[#52605A]" />
          </button>
        </div>
      </div>
    </header>
  );
}

