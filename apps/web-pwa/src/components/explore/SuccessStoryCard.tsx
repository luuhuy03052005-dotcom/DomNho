'use client';

import React from 'react';

interface SuccessStoryCardProps {
  onOpenStory: () => void;
}

export default function SuccessStoryCard({ onOpenStory }: SuccessStoryCardProps) {
  return (
    <div
      onClick={onOpenStory}
      className="bg-white rounded-[14px] border border-[#DDDCD4] p-3.5 shadow-[0_2px_12px_rgba(20,40,32,0.04)] flex items-start gap-3.5 hover:shadow-[0_4px_16px_rgba(20,40,32,0.08)] transition-all cursor-pointer group"
    >
      <div className="w-20 h-20 shrink-0 rounded-[10px] overflow-hidden bg-[#F1EFE8] border border-[#DDDCD4]/60">
        <img
          src="https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=300&q=80"
          alt="Milo đã tìm được nhà"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold tracking-wider text-[#AF421F] uppercase">
          Một tin vui nhỏ
        </span>
        <h4 className="text-sm font-bold text-[#142820] mt-0.5 group-hover:text-[#0E513B] transition-colors truncate">
          Milo đã tìm được nhà
        </h4>
        <p className="text-xs text-[#52605A] mt-1 leading-snug line-clamp-2">
          Từ một bé bị bỏ rơi, giờ đây Milo đã có gia đình yêu thương.
        </p>
        <span className="text-xs font-semibold text-[#142820] group-hover:text-[#0E513B] mt-1.5 inline-block group-hover:underline">
          Đọc câu chuyện →
        </span>
      </div>
    </div>
  );
}

