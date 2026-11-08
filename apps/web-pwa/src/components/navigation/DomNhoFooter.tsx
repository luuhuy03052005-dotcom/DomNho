'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  BookOpen,
  Bookmark,
  Check,
  Compass,
  Copy,
  FileCheck2,
  Heart,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  User,
} from 'lucide-react';
import DomNhoLogo from '@/components/brand/DomNhoLogo';
import { MainTab } from '@/lib/types';

const CONTACT_EMAIL = 'luuhuy05032005h@gmail.com';
const CONTACT_MAILTO =
  'mailto:luuhuy05032005h@gmail.com?subject=G%C3%B3p%20%C3%BD%20%26%20Ph%E1%BA%A3n%20h%E1%BB%93i%20cho%20%C4%90%E1%BB%91m%20Nh%E1%BB%8F';

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
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (activeTab === 'map') return null;

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(CONTACT_EMAIL).catch(() => {});
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  return (
    <footer
      data-testid="dom-nho-footer"
      className="w-full bg-[#ECEFE7] border-t border-[#E2E5DC] text-ink pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-8"
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-8 border-b border-[#E2E5DC]">
          <div className="lg:col-span-4 space-y-3.5">
            <DomNhoLogo
              showSlogan={false}
              onClick={() => {
                onChangeTab('explore');
                scrollToTop();
              }}
            />

            <p className="text-sm font-extrabold text-brand">
              Mỗi bé, một cơ hội.
            </p>

            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed max-w-[46ch]">
              Đốm Nhỏ gom các tin cứu trợ, tìm thú lạc và nhận nuôi theo khu vực
              lên chung một bản đồ để người ở gần dễ nhìn thấy và hỗ trợ kịp
              thời.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onOpenCreatePost}
                className="min-h-[40px] px-4 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Đăng tin hỗ trợ</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('map')}
                className="min-h-[40px] px-4 rounded-[10px] bg-white hover:bg-[#F5F6F2] text-ink border border-[#E2E5DC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Mở bản đồ quanh bạn</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink">
              Điều hướng
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm font-semibold text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTab('explore');
                    scrollToTop();
                  }}
                  className="hover:text-brand inline-flex items-center gap-2 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Khám phá tin quanh bạn ({totalSpotsCount})</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onChangeTab('map')}
                  className="hover:text-brand inline-flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Bản đồ tương tác</span>
                </button>
              </li>
              <li>
                <Link
                  href="/cau-chuyen"
                  className="hover:text-brand inline-flex items-center gap-2 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Câu chuyện của Đốm Nhỏ</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChangeTab('saved');
                    scrollToTop();
                  }}
                  className="hover:text-brand inline-flex items-center gap-2 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Bài viết đã lưu ({savedCount})</span>
                </button>
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenLocationPicker}
                className="min-h-[36px] px-3 rounded-[9px] bg-[#F5F6F2] hover:bg-white border border-[#E2E5DC] text-xs font-bold text-ink inline-flex items-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#C84E2B] shrink-0" />
                <span>Đổi khu vực</span>
              </button>

              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-[36px] px-3 rounded-[9px] bg-[#F5F6F2] hover:bg-white border border-[#E2E5DC] text-xs font-bold text-ink inline-flex items-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Tài khoản</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink">
              Liên hệ &amp; Góp ý phản hồi
            </h3>

            <div className="p-3.5 rounded-[14px] bg-white border border-[#E2E5DC] space-y-2.5">
              <p className="text-xs text-ink-secondary leading-relaxed">
                Mọi ý kiến đóng góp, phản hồi gửi về email:
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={CONTACT_MAILTO}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-brand hover:underline break-all"
                >
                  <Mail className="w-4 h-4 text-brand shrink-0" />
                  <span>{CONTACT_EMAIL}</span>
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="h-8 px-2.5 rounded-[8px] bg-[#F5F6F2] hover:bg-brand-soft border border-[#E2E5DC] text-[11px] font-bold text-ink inline-flex items-center gap-1 transition-colors"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-brand" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-ink-secondary" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>

                  <a
                    href={CONTACT_MAILTO}
                    className="h-8 px-3 rounded-[8px] bg-brand hover:bg-brand-hover text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi phản hồi</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-ink-secondary">
              <div className="flex items-start gap-2">
                <FileCheck2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-ink">Có nguồn đối chiếu:</strong>{' '}
                  Mọi bài đều giữ liên kết gốc hoặc bài đăng trực tiếp.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C84E2B] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-ink">An toàn vị trí:</strong> Làm
                  mờ bán kính tọa độ và bảo mật SĐT người đăng.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-secondary">
          <p className="flex items-center gap-1.5 flex-wrap">
            <span>© {new Date().getFullYear()} Đốm Nhỏ</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              Dành cho cộng đồng yêu thương động vật
              <Heart className="w-3.5 h-3.5 text-[#C84E2B] fill-[#C84E2B]" />
            </span>
            <span>·</span>
            <a
              href={CONTACT_MAILTO}
              className="font-semibold text-brand hover:underline"
            >
              Góp ý: {CONTACT_EMAIL}
            </a>
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="self-start sm:self-auto min-h-[36px] px-3 rounded-[9px] bg-white hover:bg-[#F5F6F2] border border-[#E2E5DC] text-xs font-bold text-ink inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Lên đầu trang</span>
            <ArrowUp className="w-3.5 h-3.5 text-brand" />
          </button>
        </div>
      </div>
    </footer>
  );
}

