'use client';

import React from 'react';
import { BookOpen, Feather, Heart, Sparkles } from 'lucide-react';

interface SuccessStoryCardProps {
  onOpenStory: () => void;
}

export default function SuccessStoryCard({ onOpenStory }: SuccessStoryCardProps) {
  return (
    <div
      onClick={onOpenStory}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStory();
        }
      }}
      className="letter-paper-surface relative rounded-[20px] border border-[#E2DACB] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0E513B]/40 cursor-pointer group overflow-hidden"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#AF421F]/8 pointer-events-none" />
      <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-[#0E513B]/6 pointer-events-none" />

      <div className="relative flex items-center justify-between gap-2 pb-3.5 border-b border-dashed border-[#D8CFC0]">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#FFF0E5] border border-[#AF421F]/25 text-[#AF421F] flex items-center justify-center shadow-sm">
            <Feather className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-[#AF421F] uppercase block">
              Tâm thư dự án
            </span>
            <span className="text-xs font-bold text-[#142820]">
              Ý nghĩa &amp; Mục đích của Đốm Nhỏ
            </span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8EFE6] text-[#0E513B] border border-[#0E513B]/15">
          Lá thư ngỏ
        </span>
      </div>

      <div className="relative mt-4 space-y-2.5">
        <p className="font-serif-letter italic text-[15px] sm:text-base font-semibold text-[#142820] leading-snug">
          &ldquo;Gửi bạn — người vừa dừng bước vì một sinh linh nhỏ...&rdquo;
        </p>

        <p className="font-serif-letter text-xs sm:text-[13.5px] text-[#3F4E47] leading-relaxed">
          Mỗi ngày, giữa hàng ngàn thông tin vội vã, biết bao lời cầu cứu của những chú chó, chú mèo đi lạc hay bị bỏ rơi lặng lẽ trôi vào quên lãng. <strong className="font-semibold text-[#142820]">Đốm Nhỏ</strong> ra đời như một tấm bản đồ của lòng nhân ái — gom từng đốm sáng hy vọng có thật để dẫn lối các bé về nhà...
        </p>
      </div>

      <div className="relative mt-4 pt-3.5 border-t border-[#E6DFD3] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#52605A] font-serif-letter italic">
          <Heart className="w-3.5 h-3.5 text-[#AF421F] fill-[#AF421F] shrink-0" />
          <span>Thương gửi từ Đốm Nhỏ</span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0E513B] group-hover:bg-[#0A412F] text-white text-xs font-bold shadow-sm transition-colors">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Đọc trọn lá thư →</span>
        </span>
      </div>
    </div>
  );
}
