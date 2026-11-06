'use client';

import React from 'react';
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  Compass,
  MapPin,
  Plus,
  User,
} from 'lucide-react';
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
  className?: string;
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
  className = '',
}: DomNhoHeaderProps) {
  const tabs: {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'explore', label: 'Khám phá', icon: Compass },
    { id: 'map', label: 'Bản đồ', icon: MapPin },
    { id: 'stories', label: 'Câu chuyện', icon: BookOpen },
    { id: 'saved', label: 'Đã lưu', icon: Bookmark, count: savedCount },
  ];

  return (
    <header
      className={`sticky top-0 z-30 w-full bg-[#F5F6F2]/95 backdrop-blur-md border-b border-[#DDE2DC] ${className}`}
    >
      <div className="max-w-[1320px] mx-auto px-3.5 sm:px-6 lg:px-8 min-h-[56px] sm:min-h-[64px] py-1.5 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center justify-start shrink-0">
          <DomNhoLogo
            showSlogan={false}
            onClick={() => onChangeTab('explore')}
          />
        </div>

        <nav
          className="hidden md:flex items-center justify-center gap-1.5 shrink-0"
          aria-label="Điều hướng chính"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`min-h-[42px] px-3.5 py-2 rounded-[10px] text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-[#E4EDDD] text-[#123F35]'
                    : 'text-[#15251F] hover:bg-white/80'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#123F35]' : 'text-[#52605A]'
                  }`}
                />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                      active
                        ? 'bg-[#123F35] text-white'
                        : 'bg-[#E4EDDD] text-[#123F35]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="hidden md:flex items-center gap-1.5 min-h-[42px] px-3 rounded-[10px] bg-white border border-[#DDE2DC] text-xs font-semibold text-[#15251F] hover:border-[#123F35] transition-colors max-w-[200px]"
            title="Đổi khu vực hoặc ghim vị trí trên bản đồ"
          >
            <MapPin className="w-3.5 h-3.5 text-[#123F35] shrink-0" />
            <span className="truncate">
              {locationLabel || 'Thủ Đức, TP.HCM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="min-h-[42px] px-3.5 sm:px-4 rounded-[10px] bg-[#123F35] hover:bg-[#0C3028] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Đăng tin</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="hidden md:flex min-h-[42px] min-w-[42px] px-2.5 rounded-[10px] bg-[#E4EDDD] hover:bg-[#d5e3cb] border border-[#DDE2DC] text-xs font-semibold text-[#123F35] items-center justify-center gap-1.5 transition-colors"
            title={
              userSession
                ? `Tài khoản: ${userSession.displayName}`
                : 'Tài khoản & Cài đặt'
            }
            aria-label="Tài khoản"
          >
            <User className="w-4 h-4 text-[#123F35] shrink-0" />
            {userSession && (
              <span className="hidden xl:inline max-w-[96px] truncate font-bold">
                {userSession.displayName}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
