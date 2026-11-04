'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { OriginFilter, PlatformFilter, RegionFilter } from '@/lib/types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionFilter: RegionFilter;
  onChangeRegionFilter: (reg: RegionFilter) => void;
  originFilter: OriginFilter;
  onChangeOriginFilter: (origin: OriginFilter) => void;
  platformFilter: PlatformFilter;
  onChangePlatformFilter: (p: PlatformFilter) => void;
  totalResultsCount: number;
  onResetFilters: () => void;
}

export default function FilterModal({
  isOpen,
  onClose,
  regionFilter,
  onChangeRegionFilter,
  originFilter,
  onChangeOriginFilter,
  platformFilter,
  onChangePlatformFilter,
  totalResultsCount,
  onResetFilters,
}: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-white rounded-t-[24px] sm:rounded-[20px] border border-[#DDDCD4] shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-[#DDDCD4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0E513B]" />
              <h3 className="text-base font-bold text-[#142820]">
                Bộ lọc tìm kiếm
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-[10px] bg-[#F1EFE8] flex items-center justify-center text-[#142820] hover:bg-[#DDDCD4]"
              aria-label="Đóng bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-[#142820]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#52605A] mb-2.5">
                1. Khu vực vùng miền
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ALL' as RegionFilter, label: 'Toàn quốc' },
                  { id: 'SOUTH' as RegionFilter, label: 'Miền Nam' },
                  { id: 'CENTRAL' as RegionFilter, label: 'Miền Trung' },
                  { id: 'NORTH' as RegionFilter, label: 'Miền Bắc' },
                ].map((r) => {
                  const active = regionFilter === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onChangeRegionFilter(r.id)}
                      className={`h-10 px-3 rounded-[10px] text-xs font-bold transition-all border ${
                        active
                          ? 'bg-[#0E513B] text-white border-[#0E513B]'
                          : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:border-[#DDDCD4]'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#52605A] mb-2.5">
                2. Nguồn bài đăng
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL' as OriginFilter, label: 'Tất cả nguồn' },
                  { id: 'USER_POST' as OriginFilter, label: 'Bài tự đăng' },
                  { id: 'EXTERNAL' as OriginFilter, label: 'Cộng đồng' },
                ].map((o) => {
                  const active = originFilter === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onChangeOriginFilter(o.id)}
                      className={`h-10 px-2 rounded-[10px] text-xs font-bold transition-all border ${
                        active
                          ? 'bg-[#0E513B] text-white border-[#0E513B]'
                          : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:border-[#DDDCD4]'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {originFilter !== 'USER_POST' && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#52605A] mb-2.5">
                  3. Nền tảng chia sẻ
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ALL' as PlatformFilter, label: 'Tất cả nền tảng' },
                    { id: 'FACEBOOK' as PlatformFilter, label: 'Facebook' },
                    { id: 'INSTAGRAM' as PlatformFilter, label: 'Instagram' },
                    { id: 'THREADS' as PlatformFilter, label: 'Threads' },
                    { id: 'TIKTOK' as PlatformFilter, label: 'TikTok' },
                    { id: 'RESCUE_PORTAL' as PlatformFilter, label: 'Trạm cứu hộ' },
                    { id: 'SOCIAL_MEDIA' as PlatformFilter, label: 'Báo chí' },
                  ].map((p) => {
                    const active = platformFilter === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onChangePlatformFilter(p.id)}
                        className={`px-3 py-2 rounded-[10px] text-xs font-semibold transition-all border ${
                          active
                            ? 'bg-[#0E513B] text-white border-[#0E513B]'
                            : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:border-[#DDDCD4]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 border-t border-[#DDDCD4] flex items-center justify-between gap-3 bg-[#FAF7F1] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs font-bold text-[#AF421F] hover:underline px-2 py-1"
            >
              Đặt lại
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span>Áp dụng ({totalResultsCount} kết quả)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

