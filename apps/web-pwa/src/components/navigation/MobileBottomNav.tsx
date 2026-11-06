'use client';

import React from 'react';
import { BookOpen, Bookmark, Home, MapPin, User } from 'lucide-react';
import { MainTab } from '@/lib/types';

interface MobileBottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  savedCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onChangeTab,
  savedCount = 0,
}: MobileBottomNavProps) {
  const navItems: {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'explore',
      label: 'Khám phá',
      icon: Home,
    },
    {
      id: 'map',
      label: 'Bản đồ',
      icon: MapPin,
    },
    {
      id: 'stories',
      label: 'Câu chuyện',
      icon: BookOpen,
    },
    {
      id: 'saved',
      label: 'Đã lưu',
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'profile',
      label: 'Tài khoản',
      icon: User,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFFFF] border-t border-[#DDE2DC] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Thanh điều hướng chính"
    >
      <div className="grid grid-cols-5 min-h-[60px] px-1 py-1 gap-0.5 items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`min-h-[48px] min-w-[44px] px-1 py-1 rounded-[10px] flex flex-col items-center justify-center transition-colors relative ${
                isActive
                  ? 'bg-[#E4EDDD] text-[#123F35] font-bold'
                  : 'text-[#52605A] hover:text-[#15251F]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 rounded-full text-[9px] font-bold bg-[#A83D20] text-white min-w-[14px] text-center leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight mt-1 text-center break-words">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
