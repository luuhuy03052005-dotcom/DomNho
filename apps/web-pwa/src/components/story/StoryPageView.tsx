'use client';

import React from 'react';
import {
  ArrowRight,
  Compass,
  FileCheck2,
  Map as MapIcon,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface StoryPageViewProps {
  onBackToExplore: () => void;
  onOpenMap: () => void;
}

function HeroPetsMapIllustration() {
  return (
    <svg
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[270px] sm:max-w-[330px] md:max-w-[360px] h-auto mx-auto pointer-events-none select-none"
      aria-hidden="true"
    >
      <path
        d="M28 188C96 192 252 192 332 186"
        stroke="#DDDCD4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <g transform="translate(36, 44)">
        <circle
          cx="32"
          cy="104"
          r="24"
          fill="#FFF0E5"
          stroke="#AF421F"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M32 36C18.7 36 8 46.7 8 60C8 77.5 32 104 32 104C32 104 56 77.5 56 60C56 46.7 45.3 36 32 36Z"
          fill="#FAF7F1"
          stroke="#AF421F"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="59" r="8.5" fill="#AF421F" />
      </g>

      <g transform="translate(94, 72)">
        <path
          d="M20 112V76C20 58 33 45 50 45C66 45 77 56 79 72L82 112"
          fill="#FAF7F1"
          stroke="#142820"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="49"
          cy="34"
          r="20"
          fill="#FAF7F1"
          stroke="#142820"
          strokeWidth="2.1"
        />
        <path
          d="M32 24C24 27 21 38 25 46C28 50 34 46 35 39"
          fill="#FFF0E5"
          stroke="#AF421F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M66 24C74 27 77 38 73 46C70 50 64 46 63 39"
          fill="#FFF0E5"
          stroke="#AF421F"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="42" cy="33" r="2" fill="#142820" />
        <circle cx="56" cy="33" r="2" fill="#142820" />
        <ellipse cx="49" cy="39" rx="3.2" ry="2.2" fill="#AF421F" />
        <path
          d="M45 43.5C47 45.5 51 45.5 53 43.5"
          stroke="#142820"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M19 92C9 87 6 77 11 70"
          stroke="#AF421F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      <g transform="translate(174, 88)">
        <path
          d="M16 96C16 72 25 56 39 56C53 56 62 72 62 96"
          fill="#FAF7F1"
          stroke="#142820"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M23 40L26 20L36 30H42L52 20L55 40C57 49 51 58 39 58C27 58 21 49 23 40Z"
          fill="#FAF7F1"
          stroke="#142820"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <circle cx="33" cy="41" r="1.8" fill="#142820" />
        <circle cx="45" cy="41" r="1.8" fill="#142820" />
        <path
          d="M37 46L39 48L41 46"
          stroke="#AF421F"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M61 91C73 91 79 81 75 71C72 64 66 66 67 72"
          stroke="#AF421F"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      <g fill="#AF421F" opacity="0.88">
        <circle cx="256" cy="146" r="3" />
        <circle cx="251" cy="140" r="1.4" />
        <circle cx="256" cy="138" r="1.4" />
        <circle cx="261" cy="140" r="1.4" />

        <circle cx="276" cy="130" r="3" />
        <circle cx="271" cy="124" r="1.4" />
        <circle cx="276" cy="122" r="1.4" />
        <circle cx="281" cy="124" r="1.4" />

        <circle cx="295" cy="113" r="3" />
        <circle cx="290" cy="107" r="1.4" />
        <circle cx="295" cy="105" r="1.4" />
        <circle cx="300" cy="107" r="1.4" />
      </g>

      <g transform="translate(282, 34)">
        <path
          d="M8 40L36 16L64 40"
          stroke="#AF421F"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 35V64H56V35"
          fill="#E8EFE6"
          stroke="#0E513B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 52C36 52 29 47.2 29 43.2C29 40.8 30.9 39 33.2 39C34.6 39 35.5 39.8 36 40.7C36.5 39.8 37.4 39 38.8 39C41.1 39 43 40.8 43 43.2C43 47.2 36 52 36 52Z"
          fill="#AF421F"
        />
      </g>
    </svg>
  );
}

function ScatteredNotesIllustration() {
  return (
    <svg
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 sm:w-28 h-auto pointer-events-none select-none shrink-0"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="12"
        width="46"
        height="32"
        rx="6"
        transform="rotate(-7 8 12)"
        fill="#FFFFFF"
        stroke="#DDDCD4"
        strokeWidth="1.8"
      />
      <line
        x1="16"
        y1="22"
        x2="42"
        y2="19"
        stroke="#AF421F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="30"
        x2="36"
        y2="28"
        stroke="#DDDCD4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <rect
        x="58"
        y="8"
        width="48"
        height="32"
        rx="6"
        transform="rotate(6 58 8)"
        fill="#FFFFFF"
        stroke="#DDDCD4"
        strokeWidth="1.8"
      />
      <line
        x1="66"
        y1="20"
        x2="94"
        y2="23"
        stroke="#0E513B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="65"
        y1="28"
        x2="86"
        y2="30"
        stroke="#DDDCD4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <rect
        x="34"
        y="44"
        width="50"
        height="30"
        rx="6"
        transform="rotate(-2 34 44)"
        fill="#FFFFFF"
        stroke="#AF421F"
        strokeWidth="1.8"
      />
      <circle cx="46" cy="59" r="4" fill="#FFF0E5" stroke="#AF421F" strokeWidth="1.5" />
      <line
        x1="55"
        y1="56"
        x2="75"
        y2="55"
        stroke="#142820"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="63"
        x2="69"
        y2="62"
        stroke="#DDDCD4"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MapSpotIllustration() {
  return (
    <svg
      viewBox="0 0 120 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 sm:w-28 h-auto pointer-events-none select-none shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="60"
        cy="54"
        r="26"
        fill="#FAF7F1"
        stroke="#0E513B"
        strokeWidth="1.6"
        strokeDasharray="4 4"
      />
      <circle
        cx="60"
        cy="54"
        r="14"
        fill="#0E513B"
        fillOpacity="0.12"
      />
      <path
        d="M60 14C48.95 14 40 22.95 40 34C40 48.2 60 66 60 66C60 66 80 48.2 80 34C80 22.95 71.05 14 60 14Z"
        fill="#0E513B"
      />
      <circle cx="60" cy="34" r="7.5" fill="#FAF7F1" />
      <circle cx="30" cy="30" r="4" fill="#AF421F" />
      <circle cx="92" cy="44" r="4" fill="#D4942A" />
    </svg>
  );
}

function CommunityActionIllustration() {
  return (
    <svg
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-24 sm:w-28 h-auto pointer-events-none select-none shrink-0"
      aria-hidden="true"
    >
      <path
        d="M26 42L60 16L94 42"
        stroke="#0E513B"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 36V68H84V36"
        fill="#FFFFFF"
        stroke="#142820"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M60 56C60 56 50 49.5 50 44C50 40.8 52.5 38.5 55.5 38.5C57.4 38.5 59 39.5 60 41C61 39.5 62.6 38.5 64.5 38.5C67.5 38.5 70 40.8 70 44C70 49.5 60 56 60 56Z"
        fill="#AF421F"
      />
    </svg>
  );
}

function PawTrailConnector() {
  return (
    <div
      className="hidden md:flex items-center justify-center py-2 pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        width="180"
        height="36"
        viewBox="0 0 180 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 18C52 6 128 30 168 18"
          stroke="#AF421F"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="48" cy="14" r="2.8" fill="#AF421F" opacity="0.75" />
        <circle cx="90" cy="18" r="2.8" fill="#AF421F" opacity="0.75" />
        <circle cx="132" cy="22" r="2.8" fill="#AF421F" opacity="0.75" />
      </svg>
    </div>
  );
}

function InlinePawAccent() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-[#AF421F] shrink-0 pointer-events-none select-none"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="7.5" r="2" fill="currentColor" />
      <circle cx="12" cy="5.8" r="2" fill="currentColor" />
      <circle cx="16.5" cy="7.5" r="2" fill="currentColor" />
      <path
        d="M7.5 15.5C6.8 12.5 9.2 10.5 12 10.5C14.8 10.5 17.2 12.5 16.5 15.5C16 17.5 14.2 19 12 19C9.8 19 8 17.5 7.5 15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function StoryPageView({
  onBackToExplore,
  onOpenMap,
}: StoryPageViewProps) {
  return (
    <div className="w-full min-h-screen bg-[#FAF7F1] text-[#142820] pb-12 md:pb-16">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-14 space-y-12 sm:space-y-16">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-center">
          <div className="md:col-span-7 space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#AF421F]">
                Câu chuyện của Đốm Nhỏ
              </span>
              <span
                className="w-8 h-[1.5px] bg-[#AF421F]/60 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-[28px] sm:text-[36px] lg:text-[40px] font-extrabold text-[#142820] leading-[1.18] tracking-tight">
              Mỗi bé, một cơ hội.
            </h1>

            <p className="text-base sm:text-[17px] leading-[1.65] text-[#23352D] max-w-[62ch]">
              Có khi người có thể giúp chỉ ở cách vài con hẻm, nhưng bài đăng
              lại trôi mất giữa nhiều hội nhóm. Đốm Nhỏ gom tin cứu trợ, tìm thú
              lạc và nhận nuôi theo khu vực để người ở gần dễ tìm thấy.
            </p>
          </div>

          <div className="md:col-span-5 pt-1 md:pt-0">
            <HeroPetsMapIllustration />
          </div>
        </section>

        <PawTrailConnector />

        <div className="space-y-10 sm:space-y-14">
          <section className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-4 flex items-center justify-between md:flex-col md:items-start gap-3">
              <div className="flex items-center gap-2">
                <InlinePawAccent />
                <h2 className="text-xl sm:text-2xl font-bold text-[#142820] leading-snug">
                  Tin cần giúp có thể trôi rất nhanh.
                </h2>
              </div>
              <div className="hidden sm:block md:mt-2">
                <ScatteredNotesIllustration />
              </div>
            </div>

            <div className="md:col-span-8 space-y-3.5 text-base leading-[1.65] text-[#23352D] max-w-[62ch]">
              <p>
                Mỗi ngày trên mạng xã hội có rất nhiều bài viết tìm chó mèo đi
                lạc, bị bỏ rơi hoặc đang cần cứu trợ. Thế nhưng các thông tin ấy
                thường nằm rải rác ở nhiều hội nhóm khác nhau và bị đẩy trôi chỉ
                sau vài giờ đăng tải.
              </p>
              <p>
                Nhiều trường hợp, người có thể hỗ trợ hoặc người đang tìm lại
                thú cưng chỉ ở cách đó vài con hẻm nhưng lại không hề nhìn thấy
                bài viết đúng lúc.
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-[#E8EFE6] px-5 py-7 sm:px-8 sm:py-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-center">
              <div className="md:col-span-4 flex items-center justify-between md:flex-col md:items-start gap-3">
                <div className="flex items-center gap-2">
                  <InlinePawAccent />
                  <h2 className="text-xl sm:text-2xl font-bold text-[#142820] leading-snug">
                    Vì sao gọi là Đốm Nhỏ?
                  </h2>
                </div>
                <div className="hidden sm:block md:mt-2">
                  <MapSpotIllustration />
                </div>
              </div>

              <div className="md:col-span-8 space-y-3.5 text-base leading-[1.65] text-[#142820] max-w-[62ch]">
                <p>
                  Tên gọi <strong>Đốm Nhỏ</strong> xuất phát từ những điểm đánh
                  dấu trên bản đồ. Mỗi điểm nhỏ đại diện cho một bé chó, mèo
                  đang cần tìm lại gia đình, cần hỗ trợ cứu hộ hoặc chờ người
                  đón về nuôi.
                </p>
                <p>
                  Thay vì phải tìm kiếm giữa hàng trăm bài đăng rời rạc, một
                  điểm nhỏ trên bản đồ giúp bạn biết ngay câu chuyện đang xảy ra
                  ở đâu và có gần nơi mình đang đứng hay không.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-8 items-start">
            <div className="md:col-span-4 flex items-center justify-between md:flex-col md:items-start gap-3">
              <div className="flex items-center gap-2">
                <InlinePawAccent />
                <h2 className="text-xl sm:text-2xl font-bold text-[#142820] leading-snug">
                  Khi biết chuyện ở gần mình.
                </h2>
              </div>
              <div className="hidden sm:block md:mt-2">
                <CommunityActionIllustration />
              </div>
            </div>

            <div className="md:col-span-8 space-y-3.5 text-base leading-[1.65] text-[#23352D] max-w-[62ch]">
              <p>
                Khi biết một trường hợp đang ở ngay quanh khu vực mình sống, bạn
                có thể chủ động giúp theo cách vừa sức nhất: mở xem nguồn bài
                viết gốc để nắm rõ tình hình, chia sẻ lại tin tìm thú lạc cho
                người quen cùng khu phố, hoặc tìm hiểu thông tin liên hệ để đón
                nhận nuôi một người bạn nhỏ.
              </p>
            </div>
          </section>
        </div>

        <section className="pt-4 sm:pt-6 border-t border-[#DDDCD4] space-y-5">
          <h2 className="text-lg sm:text-xl font-bold text-[#142820]">
            Nguyên tắc hoạt động của chúng mình
          </h2>

          <div className="space-y-4 max-w-[65ch]">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <p className="text-base leading-[1.6] text-[#23352D]">
                <strong className="text-[#142820]">
                  Thông tin thực tế, có nguồn rõ ràng:
                </strong>{' '}
                Chỉ tổng hợp bài viết từ các trạm cứu hộ, báo chí kèm liên kết
                gốc, hoặc bài do người dân trực tiếp chụp ảnh và ghim vị trí.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#FFF0E5] text-[#AF421F] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-base leading-[1.6] text-[#23352D]">
                <strong className="text-[#142820]">
                  Ưu tiên khoảng cách gần:
                </strong>{' '}
                Hiển thị khu vực và khoảng cách từ vị trí của bạn đến điểm cần
                hỗ trợ để việc giúp đỡ hoặc báo tin diễn ra kịp thời.
              </p>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#F1EFE8] text-[#142820] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-[#0E513B]" />
              </div>
              <p className="text-base leading-[1.6] text-[#23352D]">
                <strong className="text-[#142820]">
                  Đơn giản, dễ sử dụng:
                </strong>{' '}
                Ai cũng có thể tra cứu theo khu vực, tìm kiếm bằng ảnh hoặc đăng
                nhanh một tin báo khi bắt gặp thú lạc mà không cần thao tác phức
                tạp.
              </p>
            </div>
          </div>
        </section>

        <section className="pt-6 sm:pt-8 border-t border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[#142820]">
              Bạn có thể bắt đầu từ một tin gần mình.
            </h2>
            <p className="text-sm sm:text-base text-[#52605A]">
              Chọn xem trên bản đồ hoặc duyệt danh sách các bài viết quanh khu
              vực của bạn.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenMap}
              className="min-h-[48px] px-5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <MapIcon className="w-4 h-4 shrink-0" />
              <span>Mở bản đồ</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onBackToExplore}
              className="min-h-[48px] px-5 rounded-[10px] bg-white hover:bg-[#F1EFE8] text-[#142820] border border-[#DDDCD4] text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4 text-[#0E513B] shrink-0" />
              <span>Xem tin quanh bạn</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
