'use client';

import React from 'react';

interface SuccessStoryCardProps {
  onOpenStory: () => void;
}

export default function SuccessStoryCard({ onOpenStory }: SuccessStoryCardProps) {
  return (
    <article className="relative group bg-surface rounded-card border border-border p-4 sm:p-5 hover:border-brand transition-colors space-y-2.5 shadow-[0_3px_14px_rgba(20,40,32,0.04)]">
      <button
        type="button"
        onClick={onOpenStory}
        aria-label="Đọc câu chuyện của Đốm Nhỏ"
        className="absolute inset-0 z-10 w-full rounded-card cursor-pointer"
      />
      <p className="text-xs font-bold uppercase tracking-wider text-brand">
        Ý nghĩa dự án
      </p>

      <h3 className="text-base font-bold text-ink">
        Câu chuyện của &ldquo;Đốm Nhỏ&rdquo;
      </h3>

      <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
        Mỗi ngày có rất nhiều tin tìm thú lạc và cứu hộ bị trôi đi trên mạng xã
        hội. Đốm Nhỏ gom các thông tin thực tế ấy lên chung một bản đồ để người
        ở gần có thể hỗ trợ kịp thời nhất.
      </p>

      <div className="pt-1">
        <span className="text-xs sm:text-sm font-semibold text-brand group-hover:underline">
          Đọc câu chuyện của Đốm Nhỏ →
        </span>
      </div>
    </article>
  );
}
