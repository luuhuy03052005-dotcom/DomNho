'use client';

import React from 'react';
import { ChevronDown, Compass, Feather, Heart, Map as MapIcon, MapPin, Plus, User } from 'lucide-react';
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
  savedCount?: number;
}

export default function DomNhoHeader({
  activeTab,
  onChangeTab,
  locationLabel,
  onOpenLocationPicker,
  onOpenCreatePost,
  onOpenProfile,
  userSession,
  savedCount = 0,
}: DomNhoHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7F1]/95 backdrop-blur-md border-b border-[#DDDCD4]/90 shadow-[0_1px_8px_rgba(20,40,32,0.03)]">
      <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 lg:px-10 h-16 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <DomNhoLogo onClick={() => onChangeTab('explore')} />
        </div>

        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2 bg-[#F1EFE8]/90 p-1 rounded-full border border-[#DDDCD4]/80"
          aria-label="Điều hướng chính"
        >
          <button
            type="button"
            onClick={() => onChangeTab('explore')}
            className={`px-3.5 lg:px-4 h-9 rounded-full text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'explore'
                ? 'bg-[#0E513B] text-white shadow-sm'
                : 'text-[#52605A] hover:text-[#142820] hover:bg-white/60'
            }`}
            aria-current={activeTab === 'explore' ? 'page' : undefined}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Khám phá</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('map')}
            className={`px-3.5 lg:px-4 h-9 rounded-full text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'map'
                ? 'bg-[#0E513B] text-white shadow-sm'
                : 'text-[#52605A] hover:text-[#142820] hover:bg-white/60'
            }`}
            aria-current={activeTab === 'map' ? 'page' : undefined}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Bản đồ</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('saved')}
            className={`px-3.5 lg:px-4 h-9 rounded-full text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'saved'
                ? 'bg-[#0E513B] text-white shadow-sm'
                : 'text-[#52605A] hover:text-[#142820] hover:bg-white/60'
            }`}
            aria-current={activeTab === 'saved' ? 'page' : undefined}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'saved' ? 'fill-white' : ''}`} />
            <span>Đã lưu</span>
            {savedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'saved'
                    ? 'bg-white text-[#0E513B]'
                    : 'bg-[#AF421F] text-white'
                }`}
              >
                {savedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('stories')}
            className={`px-3.5 lg:px-4 h-9 rounded-full text-xs lg:text-sm font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'stories'
                ? 'bg-[#AF421F] text-white shadow-sm'
                : 'text-[#AF421F] bg-[#FFF0E5]/70 hover:bg-[#FFF0E5]'
            }`}
            aria-current={activeTab === 'stories' ? 'page' : undefined}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Tâm thư dự án</span>
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-[12px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:border-[#0E513B] active:scale-95 transition-all shadow-sm max-w-[165px] lg:max-w-[200px]"
            title="Đổi khu vực tìm kiếm"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">{locationLabel || 'Thủ Đức, TP.HCM'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-[12px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Đăng tin cứu hộ hoặc tìm thú lạc"
          >
            <Plus className="w-4 h-4 stroke-[2.8]" />
            <span>Đăng tin</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 h-9 sm:h-10 px-2 sm:px-2.5 rounded-[12px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] active:scale-95 transition-all shadow-sm"
            title="Hồ sơ & Tài khoản"
            aria-label="Tài khoản cá nhân"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center font-bold text-xs">
              {userSession ? userSession.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-[#142820] max-w-[90px] truncate">
              {userSession ? userSession.displayName : 'Tài khoản'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
