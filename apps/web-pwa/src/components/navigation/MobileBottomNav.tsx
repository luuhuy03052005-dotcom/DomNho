'use client';

import React from 'react';
import { Compass, Feather, Heart, Map as MapIcon, User } from 'lucide-react';
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
      icon: MapIcon,
    },
    {
      id: 'stories' as MainTab,
      label: 'Tâm thư',
      icon: Feather,
      highlight: true,
    },
    {
      id: 'saved' as MainTab,
      label: 'Đã lưu',
      icon: Heart,
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'profile' as MainTab,
      label: 'Cá nhân',
      icon: User,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#DDDCD4] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgba(20,40,32,0.06)]"
      aria-label="Thanh điều hướng dưới"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[48px] transition-colors relative ${
                isActive
                  ? 'text-[#0E513B] font-bold'
                  : item.highlight
                  ? 'text-[#AF421F] font-semibold'
                  : 'text-[#52605A] hover:text-[#142820]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#0E513B]" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.5]' : 'stroke-[1.9]'
                  }`}
                />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 rounded-full text-[9px] font-bold bg-[#AF421F] text-white min-w-[15px] text-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
