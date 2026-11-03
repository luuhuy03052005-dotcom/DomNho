'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DomNhoLogo from '@/components/brand/DomNhoLogo';
import StoryPageView from '@/components/story/StoryPageView';

export default function CauChuyenRoutePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAF7F1] text-[#142820] flex flex-col font-sans">
      <header className="sticky top-0 z-30 w-full bg-[#FAF7F1] border-b border-[#DDDCD4]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <DomNhoLogo showSlogan={false} onClick={() => router.push('/')} />

          <button
            type="button"
            onClick={() => router.push('/')}
            className="h-9 px-3.5 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </header>

      <main className="flex-1 w-full">
        <StoryPageView
          onBackToExplore={() => router.push('/')}
          onOpenMap={() => router.push('/')}
        />
      </main>
    </div>
  );
}

