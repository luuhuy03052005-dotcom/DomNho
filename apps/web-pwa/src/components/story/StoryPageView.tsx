'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface StoryPageViewProps {
  onBackToExplore: () => void;
  onOpenMap: () => void;
}

export default function StoryPageView({
  onBackToExplore,
  onOpenMap,
}: StoryPageViewProps) {
  return (
    <div className="w-full min-h-screen bg-[#FAF7F1] pb-24 md:pb-16 text-[#142820]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          type="button"
          onClick={onBackToExplore}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#52605A] hover:text-[#142820] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang khám phá</span>
        </button>

        <article className="bg-white rounded-xl border border-[#DDDCD4] p-6 sm:p-10 space-y-6">
          <header className="border-b border-[#DDDCD4] pb-5 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0E513B]">
              Mục đích &amp; Ý nghĩa dự án
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#142820]">
              Câu chuyện của &ldquo;Đốm Nhỏ&rdquo;
            </h1>
          </header>

          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[#23352D]">
            <p>Chào bạn,</p>

            <p>
              Dự án <strong>Đốm Nhỏ</strong> bắt đầu từ một vấn đề rất thực tế:
              mỗi ngày trên các trang mạng xã hội có rất nhiều bài viết tìm chó
              mèo đi lạc, chó mèo bị bỏ rơi hoặc cần cứu trợ khẩn cấp. Tuy
              nhiên, những thông tin này thường nằm rải rác ở nhiều hội nhóm
              khác nhau và bị trôi đi rất nhanh chỉ sau vài giờ đăng tải.
            </p>

            <p>
              Nhiều trường hợp, người có thể giúp đỡ hoặc người đang tìm lại thú
              cưng chỉ ở cách đó vài con hẻm nhưng lại không hề nhìn thấy bài
              viết. Khi thông tin đến được với người cần biết thì đã quá muộn.
            </p>

            <p>
              Chúng mình xây dựng <strong>Đốm Nhỏ</strong> với mục đích gom các
              thông tin cứu trợ, tìm thú lạc và nhận nuôi có thật về chung một
              nơi, đặt lên bản đồ theo từng khu vực cụ thể. Khi mở trang web,
              bạn có thể biết ngay xung quanh vị trí của mình đang có trường hợp
              nào cần giúp đỡ và cách mình bao xa.
            </p>

            <p>
              Cái tên <strong>&ldquo;Đốm Nhỏ&rdquo;</strong> xuất phát từ chính
              hình ảnh các điểm đánh dấu trên bản đồ. Mỗi điểm sáng nhỏ đại diện
              cho một bé chó, mèo đang cần tìm lại gia đình hoặc chờ người đón
              về nuôi. Khi những điểm nhỏ ấy được hiển thị rõ ràng và kết nối
              với những người xung quanh, cơ hội để các bé được an toàn sẽ lớn
              hơn rất nhiều.
            </p>

            <p>
              Để giữ cho dự án thực sự hữu ích, Đốm Nhỏ hoạt động dựa trên ba
              nguyên tắc đơn giản:
            </p>

            <ul className="list-disc pl-5 space-y-2 text-[#142820]">
              <li>
                <strong>Thông tin thực tế, có nguồn rõ ràng:</strong> Chỉ tổng
                hợp các bài viết thật từ các trạm cứu hộ, cộng đồng kèm liên kết
                gốc, hoặc bài do người dân trực tiếp chụp ảnh và ghim vị trí.
              </li>
              <li>
                <strong>Ưu tiên khoảng cách gần:</strong> Hiển thị khoảng cách
                từ vị trí của bạn đến điểm cần hỗ trợ để việc giúp đỡ hoặc báo
                tin diễn ra nhanh nhất.
              </li>
              <li>
                <strong>Đơn giản, dễ sử dụng:</strong> Ai cũng có thể tra cứu
                theo khu vực, xem ảnh rõ nét hoặc đăng nhanh một tin báo khi bắt
                gặp thú lạc ngoài đường mà không cần thao tác phức tạp.
              </li>
            </ul>

            <p>
              Dù bạn ghé vào đây để tìm thú cưng thất lạc, tìm nhận nuôi một
              người bạn nhỏ, hay chỉ đơn giản là chia sẻ lại một thông tin cứu
              hộ quanh khu vực mình sống — sự quan tâm của bạn đều rất đáng quý.
            </p>

            <p className="pt-2">
              Cảm ơn bạn đã đồng hành cùng Đốm Nhỏ.
            </p>
          </div>

          <footer className="pt-5 border-t border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#142820]">
                Đội ngũ Đốm Nhỏ
              </p>
              <p className="text-xs text-[#52605A]">
                Cứu trợ, tìm thú lạc và nhận nuôi quanh bạn
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenMap}
                className="h-10 px-4 rounded-lg border border-[#DDDCD4] bg-[#FAF7F1] hover:bg-[#F1EFE8] text-xs sm:text-sm font-semibold text-[#142820] transition-colors"
              >
                Mở bản đồ
              </button>
              <button
                type="button"
                onClick={onBackToExplore}
                className="h-10 px-4 rounded-lg bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Xem danh sách các bé
              </button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}

