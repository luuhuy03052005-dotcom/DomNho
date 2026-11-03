'use client';

import React from 'react';
import { ChevronDown, MapPin, Plus, User } from 'lucide-react';
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
  const tabs: { id: MainTab; label: string; count?: number }[] = [
    { id: 'explore', label: 'Khám phá' },
    { id: 'map', label: 'Bản đồ' },
    { id: 'stories', label: 'Câu chuyện' },
    { id: 'saved', label: 'Đã lưu', count: savedCount },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF7F1] border-b border-[#DDDCD4]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <DomNhoLogo showSlogan={false} onClick={() => onChangeTab('explore')} />

        <nav
          className="hidden md:flex items-center gap-6 text-sm"
          aria-label="Điều hướng chính"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`relative py-2 transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'text-[#0E513B] font-bold'
                    : 'text-[#52605A] font-medium hover:text-[#142820]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#E8EFE6] text-[#0E513B]">
                    {tab.count}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0E513B]" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:border-[#0E513B] transition-colors max-w-[180px]"
            title="Đổi khu vực tìm kiếm"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">{locationLabel || 'Thủ Đức, TP.HCM'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="h-9 px-3.5 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng tin</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="h-9 px-2.5 rounded-lg bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-semibold text-[#142820] flex items-center gap-1.5 transition-colors"
            title="Tài khoản"
            aria-label="Tài khoản"
          >
            <User className="w-4 h-4 text-[#0E513B]" />
            <span className="hidden lg:inline max-w-[90px] truncate">
              {userSession ? userSession.displayName : 'Tài khoản'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
