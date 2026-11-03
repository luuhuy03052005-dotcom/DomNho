'use client';

import React from 'react';

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
      className="bg-white rounded-xl border border-[#DDDCD4] p-4 sm:p-5 hover:border-[#0E513B] transition-colors cursor-pointer space-y-2.5"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#0E513B]">
        Ý nghĩa dự án
      </p>

      <h3 className="text-base font-bold text-[#142820]">
        Câu chuyện của &ldquo;Đốm Nhỏ&rdquo;
      </h3>

      <p className="text-xs sm:text-sm text-[#52605A] leading-relaxed">
        Mỗi ngày có rất nhiều tin tìm thú lạc và cứu hộ bị trôi đi trên mạng xã
        hội. Đốm Nhỏ gom các thông tin thực tế ấy lên chung một bản đồ để người
        ở gần có thể hỗ trợ kịp thời nhất.
      </p>

      <div className="pt-1">
        <span className="text-xs sm:text-sm font-semibold text-[#0E513B] hover:underline">
          Đọc câu chuyện của Đốm Nhỏ →
        </span>
      </div>
    </div>
  );
}
