'use client';

import React from 'react';
import {
  ArrowUp,
  BookOpen,
  Bookmark,
  Compass,
  FileCheck2,
  Heart,
  MapPin,
  Plus,
  ShieldCheck,
  User,
} from 'lucide-react';
import DomNhoLogo from '@/components/brand/DomNhoLogo';
import { MainTab } from '@/lib/types';

interface DomNhoFooterProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  onOpenCreatePost: () => void;
  onOpenLocationPicker: () => void;
  onOpenProfile: () => void;
  savedCount?: number;
  totalSpotsCount?: number;
}

export default function DomNhoFooter({
  activeTab,
  onChangeTab,
  onOpenCreatePost,
  onOpenLocationPicker,
  onOpenProfile,
  savedCount = 0,
  totalSpotsCount = 0,
}: DomNhoFooterProps) {
  if (activeTab === 'map') return null;

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer
      data-testid="dom-nho-footer"
      className="w-full bg-[#F2EFE7] border-t border-[#DDDCD4] text-[#142820] pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-8"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-8 border-b border-[#DDDCD4]">
          <div className="lg:col-span-5 space-y-3.5">
            <DomNhoLogo
              showSlogan={false}
              onClick={() => {
                onChangeTab('explore');
                scrollToTop();
              }}
            />

            <p className="text-sm font-extrabold text-[#0E513B]">
              Mỗi bé, một cơ hội.
            </p>

            <p className="text-xs sm:text-sm text-[#52605A] leading-relaxed max-w-[46ch]">
              Đốm Nhỏ gom các tin cứu trợ, tìm thú lạc và nhận nuôi theo khu vực
              lên chung một bản đồ để người ở gần dễ nhìn thấy và hỗ trợ kịp
              thời.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenCreatePost}
                className="min-h-[40px] px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Đăng tin hỗ trợ</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('map')}
                className="min-h-[40px] px-4 rounded-[10px] bg-white hover:bg-[#FAF7F1] text-[#142820] border border-[#DDDCD4] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                <span>Mở bản đồ quanh bạn</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#142820]">
              Điều hướng
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-[#52605A]">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTab('explore');
                    scrollToTop();
                  }}
                  className="hover:text-[#0E513B] inline-flex items-center gap-2 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span>Khám phá tin quanh bạn ({totalSpotsCount})</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onChangeTab('map')}
                  className="hover:text-[#0E513B] inline-flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span>Bản đồ tương tác</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTab('stories');
                    scrollToTop();
                  }}
                  className="hover:text-[#0E513B] inline-flex items-center gap-2 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span>Câu chuyện của Đốm Nhỏ</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTab('saved');
                    scrollToTop();
                  }}
                  className="hover:text-[#0E513B] inline-flex items-center gap-2 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span>Bài viết đã lưu ({savedCount})</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#142820]">
              Nguyên tắc &amp; Tiện ích
            </h3>
            <div className="space-y-2.5 text-xs text-[#52605A]">
              <div className="flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#0E513B] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-[#142820]">Có nguồn đối chiếu:</strong>{' '}
                  Mọi bài tổng hợp đều giữ liên kết tới nguồn gốc hoặc bài đăng
                  trực tiếp từ cộng đồng.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#AF421F] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-[#142820]">An toàn vị trí:</strong> Hỗ
                  trợ làm mờ bán kính tọa độ và bảo vệ thông tin liên hệ của
                  người đăng.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenLocationPicker}
                className="min-h-[36px] px-3 rounded-[9px] bg-[#FAF7F1] hover:bg-white border border-[#DDDCD4] text-xs font-bold text-[#142820] inline-flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#AF421F] shrink-0" />
                <span>Đổi khu vực tìm kiếm</span>
              </button>

              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-[36px] px-3 rounded-[9px] bg-[#FAF7F1] hover:bg-white border border-[#DDDCD4] text-xs font-bold text-[#142820] inline-flex items-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                <span>Tài khoản &amp; Kỷ niệm</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#52605A]">
          <p className="flex items-center gap-1.5 flex-wrap">
            <span>© {new Date().getFullYear()} Đốm Nhỏ</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              Dành cho cộng đồng yêu thương động vật
              <Heart className="w-3.5 h-3.5 text-[#AF421F] fill-[#AF421F]" />
            </span>
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="self-start sm:self-auto min-h-[36px] px-3 rounded-[9px] bg-white hover:bg-[#FAF7F1] border border-[#DDDCD4] text-xs font-bold text-[#142820] inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Lên đầu trang</span>
            <ArrowUp className="w-3.5 h-3.5 text-[#0E513B]" />
          </button>
        </div>
      </div>
    </footer>
  );
}

