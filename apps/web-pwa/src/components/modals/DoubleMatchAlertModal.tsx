'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, X } from 'lucide-react';
import { DomSpot, SpotMatchResult, ThemeId } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';

interface DoubleMatchAlertModalProps {
  matches: SpotMatchResult[];
  themeId: ThemeId;
  onClose: () => void;
  onOpenMatchedSpot: (spot: DomSpot) => void;
}

export default function DoubleMatchAlertModal({
  matches,
  themeId,
  onClose,
  onOpenMatchedSpot,
}: DoubleMatchAlertModalProps) {
  const theme = DOM_THEMES[themeId];
  if (!matches || matches.length === 0) return null;

  const topMatch = matches[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.88, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.88, y: 20, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="flex items-start justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E63946]/15 text-[#E63946] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Thuật toán Khớp Lệnh Kép • Bán kính 3km
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.pillBg }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-bold mt-3">
            Phát hiện Đốm Sáng tương đồng {Math.round(topMatch.similarityScore * 100)}%!
          </h3>
          <p className="text-xs mt-1" style={{ color: theme.mutedTextHex }}>
            Hệ thống phát hiện một đốm sáng cách vị trí vừa thắp chỉ{' '}
            <strong>{topMatch.distanceMeters}m</strong> có cùng đặc điểm nhận dạng:
          </p>

          <div
            className="mt-4 p-3.5 rounded-3xl flex items-center gap-3.5"
            style={{ backgroundColor: theme.frostedCardBg }}
          >
            <img
              src={topMatch.matchedSpot.images[0]}
              alt={topMatch.matchedSpot.title}
              className="w-20 h-20 rounded-2xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#E63946]">
                {topMatch.matchedSpot.spotType === 'RED_SOS'
                  ? 'ĐỐM ĐỎ ĐANG TÌM KIẾM'
                  : 'ĐỐM CAM TÍN HIỆU BẮT GẶP'}
              </p>
              <p className="text-sm font-bold truncate mt-0.5">
                {topMatch.matchedSpot.title}
              </p>
              <p className="text-[11px] opacity-75 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#D2673B]" />
                Cách bạn {topMatch.distanceMeters}m • {topMatch.matchedSpot.areaLabel}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {topMatch.commonTraits.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F]"
                  >
                    Khớp: {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-full text-xs font-semibold"
              style={{ backgroundColor: theme.pillBg }}
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenMatchedSpot(topMatch.matchedSpot);
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-full text-xs font-bold text-white bg-[#E63946] flex items-center justify-center gap-1.5 shadow-lg"
            >
              Xem & Kết Nối Chủ Bài Ngay
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

