'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Compass,
  Feather,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoryDetailModal({
  isOpen,
  onClose,
}: StoryDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    const shareTitle = 'Lá thư từ Đốm Nhỏ — Một kết nối nhỏ, một mái ấm mới';
    const shareText =
      'Gửi những trái tim ấm áp: Cùng đọc lá thư về mục đích và ý nghĩa của dự án cứu trợ, tìm thú lạc & nhận nuôi Đốm Nhỏ.';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        return;
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-ink/65 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="letter-modal-title"
      >
        <div
          className="fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="letter-paper-surface relative w-full max-w-2xl max-h-[90dvh] rounded-[24px] sm:rounded-[28px] border border-[#DFD6C5] shadow-2xl z-10 flex flex-col overflow-hidden"
        >
          <div className="px-5 sm:px-8 py-4 border-b border-[#E5DDD0] bg-[#FAF5EB]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FFF0E5] border border-[#AF421F]/25 text-[#AF421F] flex items-center justify-center shrink-0">
                <Feather className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-extrabold tracking-widest uppercase text-[#AF421F] block">
                  Lá thư ngỏ • Mục đích &amp; Ý nghĩa dự án
                </span>
                <p className="text-xs font-semibold text-ink-secondary">
                  Gửi đến những người thương yêu động vật khắp ba miền
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-[#DDDCD4] text-ink flex items-center justify-center hover:bg-[#F1EFE8] transition-colors shrink-0 shadow-sm"
              aria-label="Đóng lá thư"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 sm:px-10 py-6 sm:py-8 overflow-y-auto space-y-5 text-[#1E3129]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#68756E] font-serif-letter italic pb-2 border-b border-dashed border-[#DFD7C8]">
              <span>Viết từ những ngày mưa nắng trên khắp phố phường Việt Nam</span>
              <span>Trạm kết nối cộng đồng Đốm Nhỏ</span>
            </div>

            <h2
              id="letter-modal-title"
              className="font-serif-letter text-xl sm:text-[26px] font-bold text-ink leading-snug tracking-tight"
            >
              Gửi bạn — người vừa dừng bước vì một sinh linh nhỏ,
            </h2>

            <div className="font-serif-letter text-[15px] sm:text-[16px] leading-[1.85] text-[#23352D] space-y-4">
              <p>
                Có lẽ trước khi ghé vào trang web này, bạn cũng từng ít nhất một lần bắt gặp một chú chó ướt sũng chạy ngơ ngác giữa ngã tư đông đúc, một đàn mèo con bị bỏ lại trong chiếc thùng giấy bên vệ đường, hay đọc được một bài đăng tìm thú cưng thất lạc đầy tuyệt vọng của ai đó lúc nửa đêm.
              </p>

              <p>
                Chúng mình cũng vậy. Điều khiến chúng mình trăn trở nhất không phải là cuộc đời này thiếu đi những tấm lòng nhân hậu — mà là <strong className="text-ink font-semibold">những tấm lòng ấy thường bị lỡ nhịp với nhau</strong>. Trên mạng xã hội rộng lớn, một lời cầu cứu khẩn cấp hay một bài tìm chó mèo lạc rất dễ bị nhấn chìm chỉ sau vài giờ đồng hồ. Đôi khi, người có thể giúp bé đang ở ngay con hẻm kế bên, cách chỉ vài trăm mét, nhưng lại chẳng bao giờ nhìn thấy bài viết ấy.
              </p>

              <div className="my-5 p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E2D9C8] shadow-sm space-y-2">
                <p className="text-xs font-sans font-extrabold uppercase tracking-wider text-brand flex items-center gap-1.5 not-italic">
                  <Sparkles className="w-3.5 h-3.5 text-[#AF421F]" />
                  <span>Vì sao dự án mang tên là &ldquo;Đốm Nhỏ&rdquo;?</span>
                </p>
                <p className="font-serif-letter italic text-sm sm:text-[15px] text-[#35463E] leading-relaxed">
                  &ldquo;Mỗi sinh linh bé bỏng đang cần cứu giúp ngoài kia là một đốm sáng nhỏ. Mỗi trạm cứu hộ đang ngày đêm cưu mang hàng trăm bé là một đốm sáng. Và mỗi người dừng lại đọc tin, chia sẻ hay dang tay đón nhận như bạn — cũng chính là một đốm sáng. Một đốm sáng đứng một mình giữa đêm tối có thể rất mong manh, nhưng khi hàng ngàn đốm sáng cùng thắp lên trên một tấm bản đồ, chúng sẽ trở thành ngọn lửa dẫn lối các bé về nhà.&rdquo;
                </p>
              </div>

              <p>
                Đó là lý do <strong className="text-brand font-semibold">Đốm Nhỏ</strong> được sinh ra. Chúng mình không xây dựng nơi này để làm một trang mạng ồn ào, mà mong muốn tạo nên một <strong className="text-ink font-semibold">nhịp cầu định vị thực tế, giản dị và minh bạch</strong> với ba sứ mệnh cốt lõi:
              </p>

              <div className="grid grid-cols-1 gap-3 pt-1 font-sans">
                <div className="p-3.5 rounded-xl bg-white/80 border border-[#E2DACB] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF0E5] text-[#AF421F] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-ink">
                      1. Kết nối theo khoảng cách gần bạn nhất
                    </h4>
                    <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                      Hiển thị rõ khoảng cách từ vị trí của bạn đến nơi có bé đang cần cứu trợ SOS, thú cưng đi lạc hoặc trạm cứu hộ để sự giúp đỡ đến kịp lúc nhất.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/80 border border-[#E2DACB] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-ink">
                      2. Trân trọng sự thật — 100% thông tin có nguồn xác thực
                    </h4>
                    <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                      Mọi bài viết trên Đốm Nhỏ đều được tổng hợp từ các trạm cứu hộ uy tín, báo chí, cộng đồng cứu trợ thực tế kèm liên kết gốc rõ ràng, hoặc do chính người dân chụp ảnh và ghim vị trí thật.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/80 border border-[#E2DACB] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF3D8] text-[#80570D] flex items-center justify-center shrink-0 mt-0.5">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-ink">
                      3. Mở rộng cơ hội tìm được mái ấm bình yên
                    </h4>
                    <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                      Dù bạn có thể mở lòng nhận nuôi một bé, ghé qua hỗ trợ y tế, báo tin khi vô tình nhìn thấy thú lạc trên đường, hay chỉ gửi đi một lượt chia sẻ — hành động nhỏ của bạn đều mang ý nghĩa sống còn với một sinh linh.
                    </p>
                  </div>
                </div>
              </div>

              <p className="pt-2">
                Cảm ơn bạn vì hôm nay đã có mặt ở đây. Cảm ơn bạn vì giữa cuộc sống bộn bề, trái tim bạn vẫn dành một khoảng dịu dàng cho những sinh linh nhỏ bé không thể tự cất lời cầu cứu.
              </p>

              <p>
                Mong rằng từ giây phút này, mỗi bước chân bạn đi qua phố sẽ luôn có thêm một ánh nhìn ấm áp, và mỗi bé thú cưng kém may mắn đều sẽ sớm tìm thấy một mái nhà thật sự thuộc về mình.
              </p>
            </div>

            <div className="pt-4 border-t border-dashed border-[#DFD7C8] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="font-serif-letter">
                <p className="text-xs italic text-ink-secondary">
                  Thương mến và biết ơn,
                </p>
                <p className="text-base font-bold text-brand mt-0.5">
                  Đội ngũ khởi xướng &amp; Cộng đồng Đốm Nhỏ
                </p>
                <p className="text-[11px] text-[#68756E] font-sans mt-0.5">
                  &ldquo;Một kết nối nhỏ. Một mái ấm mới.&rdquo;
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-soft/80 border border-brand/20 text-brand text-xs font-bold self-start sm:self-end">
                <Heart className="w-3.5 h-3.5 text-[#AF421F] fill-[#AF421F]" />
                <span>Vì những người bạn bốn chân</span>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-8 py-4 border-t border-[#E5DDD0] bg-[#FAF5EB] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="w-full sm:w-auto px-4 h-11 rounded-[12px] border border-[#D5CBB8] bg-white hover:bg-[#F1EFE8] text-ink font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-brand" />
                  <span>Đã sao chép liên kết lá thư!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-brand" />
                  <span>Lan tỏa bức thư này</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 sm:max-w-xs h-11 px-5 rounded-[12px] bg-brand hover:bg-brand-hover text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>Cùng khám phá &amp; giúp các bé →</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
