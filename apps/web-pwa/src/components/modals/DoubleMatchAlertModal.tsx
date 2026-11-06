'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, X } from 'lucide-react';
import { DomSpot, isSpotDeletedOrHidden, SpotMatchResult, ThemeId } from '@/lib/types';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80';

interface DoubleMatchAlertModalProps {
  matches: SpotMatchResult[];
  themeId: ThemeId;
  onClose: () => void;
  onOpenMatchedSpot: (spot: DomSpot) => void;
}

export default function DoubleMatchAlertModal({
  matches,
  onClose,
  onOpenMatchedSpot,
}: DoubleMatchAlertModalProps) {
  const validMatches = React.useMemo(() => {
    if (!Array.isArray(matches)) return [];
    const seen = new Set<string>();
    return matches.filter((m) => {
      const sp = m?.matchedSpot;
      if (!sp?.id || seen.has(sp.id)) return false;
      if (isSpotDeletedOrHidden(sp)) return false;
      seen.add(sp.id);
      return true;
    });
  }, [matches]);

  if (validMatches.length === 0) return null;

  const topMatch = validMatches[0];
  const topPercent =
    topMatch.similarityScore <= 1
      ? Math.round(topMatch.similarityScore * 100)
      : Math.round(topMatch.similarityScore);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 16, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-white border border-[#DDDCD4] p-5 sm:p-6 shadow-2xl text-[#142820]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#E8EFE6] text-[#0E513B]">
                Gợi ý bài viết tương đồng ({validMatches.length})
              </span>
              <h3 className="text-base sm:text-lg font-bold mt-2 text-[#142820]">
                Phát hiện trường hợp giống {topPercent}% với bài bạn vừa đăng
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#DDDCD4] flex items-center justify-center text-[#52605A] hover:bg-[#FAF7F1]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#52605A] mt-1.5">
            Dưới đây là các bài viết trên hệ thống có đặc điểm nhận dạng rất giống với bé bạn vừa chia sẻ:
          </p>

          <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {validMatches.slice(0, 3).map((item) => {
              const pct =
                item.similarityScore <= 1
                  ? Math.round(item.similarityScore * 100)
                  : Math.round(item.similarityScore);
              return (
                <div
                  key={item.matchedSpot.id}
                  onClick={() => {
                    onOpenMatchedSpot(item.matchedSpot);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] hover:border-[#0E513B] flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <img
                    src={item.matchedSpot.images?.[0] || FALLBACK_PET_IMAGE}
                    alt={item.matchedSpot.title}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== FALLBACK_PET_IMAGE) {
                        target.src = FALLBACK_PET_IMAGE;
                      }
                    }}
                    className="w-16 h-16 rounded-lg object-cover shrink-0 border border-[#DDDCD4] bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#0E513B] text-white text-[10px] font-bold">
                        Trùng khớp {pct}%
                      </span>
                      <span className="text-[11px] text-[#52605A] truncate flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {item.distanceMeters > 0
                          ? `Cách ${item.distanceMeters}m • ${item.matchedSpot.areaLabel}`
                          : item.matchedSpot.areaLabel}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#142820] truncate mt-1">
                      {item.matchedSpot.title}
                    </p>
                    {item.commonTraits.length > 0 && (
                      <p className="text-[11px] text-[#0E513B] truncate mt-0.5">
                        {item.commonTraits.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:bg-[#FAF7F1]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenMatchedSpot(topMatch.matchedSpot);
                onClose();
              }}
              className="flex-1 h-10 px-4 rounded-[10px] text-xs font-bold text-white bg-[#0E513B] hover:bg-[#0A412F] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Xem bài viết trùng khớp nhất</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
