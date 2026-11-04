'use client';

import React from 'react';
import { Bookmark, Compass, MapPin, User } from 'lucide-react';
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
  const navItems = [
    {
      id: 'explore' as MainTab,
      label: 'Khám phá',
      icon: Compass,
    },
    {
      id: 'map' as MainTab,
      label: 'Bản đồ',
      icon: MapPin,
    },
    {
      id: 'saved' as MainTab,
      label: 'Đã lưu',
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'profile' as MainTab,
      label: 'Tài khoản',
      icon: User,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FAF7F1] border-t border-[#DDDCD4] pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Thanh điều hướng dưới"
    >
      <div className="grid grid-cols-4 min-h-[56px] items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`min-h-[48px] min-w-[44px] py-1.5 flex flex-col items-center justify-center transition-colors relative ${
                isActive
                  ? 'text-[#0E513B] font-bold'
                  : 'text-[#52605A] hover:text-[#142820]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1 rounded-full text-[9px] font-bold bg-[#AF421F] text-white min-w-[14px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full px-1">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#0E513B]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
