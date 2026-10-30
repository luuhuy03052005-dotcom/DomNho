'use client';

import React from 'react';
import { Heart, Share2, X, CheckCircle2, Calendar, MapPin } from 'lucide-react';

interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoryDetailModal({
  isOpen,
  onClose,
}: StoryDetailModalProps) {
  if (!isOpen) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Milo đã tìm được nhà - Đốm Nhỏ',
          text: 'Tin vui hôm nay: Milo đã tìm được một mái ấm đầy yêu thương!',
          url: window.location.href,
        });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép liên kết câu chuyện!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#142820]/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#DDDCD4] z-10 flex flex-col">
        <div className="relative w-full aspect-[16/9] bg-[#F1EFE8] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80"
            alt="Milo vui vẻ bên ngôi nhà mới"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md text-[#142820] flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            aria-label="Đóng câu chuyện"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-3 bg-[#0E513B] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#E8EFE6]" />
            <span>ĐÃ TÌM ĐƯỢC NHÀ</span>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold tracking-wider text-[#0E513B] uppercase">
              Một tin vui nhỏ
            </span>
            <div className="flex items-center gap-3 text-xs text-[#52605A]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                3 ngày trước
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Bình Thạnh, TP.HCM
              </span>
            </div>
          </div>

          <h2
            id="story-modal-title"
            className="text-2xl font-extrabold text-[#142820] tracking-tight leading-snug"
          >
            Milo đã tìm được nhà sau 3 tuần được cộng đồng chở che
          </h2>

          <div className="prose text-[#142820] text-sm leading-relaxed space-y-3 font-normal">
            <p>
              Ba tuần trước, Milo được một bạn tình nguyện viên phát hiện khi đang co ro dưới gầm cầu vượt trong cơn mưa lớn. Bé gầy trơ xương, ướt sũng và có vết thương nhỏ ở chân trước.
            </p>
            <p>
              Nhờ bài đăng chia sẻ trên Đốm Nhỏ, một phòng khám thú y gần đó đã chủ động nhận sơ cứu miễn phí cho Milo. Hơn 40 lượt chia sẻ của mọi người đã kết nối bé đến với gia đình anh Tuấn tại Bình Thạnh.
            </p>
            <p className="bg-[#FAF7F1] p-4 rounded-xl border border-[#DDDCD4] text-[#52605A] italic">
              &ldquo;Ngay khi nhìn thấy ánh mắt của Milo trong bài viết, tôi biết mình muốn cho bé một gia đình. Giờ bé đã tăng cân, vui vẻ chạy nhảy trong sân mỗi chiều.&rdquo;
              <span className="block not-italic font-semibold text-[#142820] mt-1 text-right">
                — Anh Tuấn, người nhận nuôi Milo
              </span>
            </p>
            <p>
              Cảm ơn tất cả những trái tim nhân ái đã dừng lại xem tin, chia sẻ và tiếp thêm hy vọng cho những người bạn nhỏ bốn chân.
            </p>
          </div>

          <div className="pt-4 border-t border-[#DDDCD4] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 h-12 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ niềm vui này</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-12 rounded-[10px] border border-[#DDDCD4] text-[#142820] font-semibold text-sm hover:bg-[#F1EFE8] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

