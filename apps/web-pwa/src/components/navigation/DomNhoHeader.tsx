'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
      className={`sticky top-0 z-30 w-full bg-[#FAF7F1]/95 backdrop-blur-md border-b border-[#DDDCD4] ${className}`}
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-[60px] sm:h-[64px] flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center justify-start shrink-0">
          <DomNhoLogo
            showSlogan={false}
            onClick={() => onChangeTab('explore')}
          />
        </div>

        <nav
          className="hidden md:flex items-center justify-center gap-1 p-1 rounded-[12px] bg-[#F2EFE7] border border-[#E4E1D8] shrink-0"
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
                className={`relative min-h-[38px] px-3.5 py-1.5 rounded-[9px] text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'text-white'
                    : 'text-[#142820] hover:bg-[#FAF7F1]/80'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="dom-nho-header-active-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 440,
                      damping: 34,
                    }}
                    className="absolute inset-0 rounded-[9px] bg-[#0E513B] shadow-sm"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-[#0E513B]'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-[#E8EFE6] text-[#0E513B]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onChangeTab('stories')}
            className={`md:hidden min-h-[40px] px-2.5 rounded-[10px] border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'stories'
                ? 'bg-[#0E513B] text-white border-[#0E513B]'
                : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
            }`}
            aria-current={activeTab === 'stories' ? 'page' : undefined}
            aria-label="Câu chuyện của Đốm Nhỏ"
            title="Câu chuyện của Đốm Nhỏ"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[360px]:inline">Câu chuyện</span>
          </button>

          <button
            type="button"
            onClick={onOpenLocationPicker}
            className="hidden sm:flex items-center gap-1.5 min-h-[40px] px-3 rounded-[10px] bg-white border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:border-[#0E513B] transition-colors max-w-[165px] xl:max-w-[195px]"
            title="Đổi khu vực hoặc ghim vị trí trên bản đồ"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
            <span className="truncate">
              {locationLabel || 'Thủ Đức, TP.HCM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="min-h-[40px] px-3.5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Đăng tin</span>
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="hidden sm:flex min-h-[40px] px-2.5 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-semibold text-[#142820] items-center gap-1.5 transition-colors"
            title="Tài khoản"
            aria-label="Tài khoản"
          >
            <User className="w-4 h-4 text-[#0E513B] shrink-0" />
            <span className="hidden xl:inline max-w-[90px] truncate">
              {userSession ? userSession.displayName : 'Tài khoản'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
