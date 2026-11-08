'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DomNhoHeader from '@/components/navigation/DomNhoHeader';
import DomNhoFooter from '@/components/navigation/DomNhoFooter';
import MobileBottomNav from '@/components/navigation/MobileBottomNav';
import StoryPageView from '@/components/story/StoryPageView';
import { MainTab } from '@/lib/types';

export default function CauChuyenRoutePage() {
  const router = useRouter();

  const handleNavigateTab = (tab: MainTab) => {
    if (tab === 'stories') return;
    if (tab === 'explore') {
      router.push('/');
      return;
    }
    router.push(`/?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-ink flex flex-col font-sans">
      <DomNhoHeader
        activeTab="stories"
        onChangeTab={handleNavigateTab}
        locationLabel="Thủ Đức, TP.HCM"
        onOpenLocationPicker={() => router.push('/')}
        onOpenCreatePost={() => router.push('/?create=1')}
        onOpenProfile={() => router.push('/?tab=profile')}
        userSession={null}
        savedCount={0}
      />

      <main className="flex-1 w-full">
        <StoryPageView
          onOpenMap={() => router.push('/?tab=map')}
        />
      </main>

      <DomNhoFooter
        activeTab="stories"
        onChangeTab={handleNavigateTab}
        onOpenCreatePost={() => router.push('/?create=1')}
        onOpenLocationPicker={() => router.push('/')}
        onOpenProfile={() => router.push('/?tab=profile')}
      />

      <MobileBottomNav
        activeTab="stories"
        onChangeTab={handleNavigateTab}
        savedCount={0}
      />
    </div>
  );
}
