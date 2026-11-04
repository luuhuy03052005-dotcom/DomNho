'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1000&q=80';

interface ImageLightboxModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  title?: string;
}

export default function ImageLightboxModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  onIndexChange,
  title,
}: ImageLightboxModalProps) {
  const safeImages =
    Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : [FALLBACK_PET_IMAGE];

  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [failedUrls, setFailedUrls] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const validIndex =
        initialIndex >= 0 && initialIndex < safeImages.length
          ? initialIndex
          : 0;
      setCurrentIndex(validIndex);
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex, safeImages.length]);

  const updateIndex = (nextIndex: number) => {
    setCurrentIndex(nextIndex);
    setZoomLevel(1);
    if (onIndexChange) {
      onIndexChange(nextIndex);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.stopPropagation();
        const nextIdx =
          (currentIndex - 1 + safeImages.length) % safeImages.length;
        updateIndex(nextIdx);
      } else if (e.key === 'ArrowRight') {
        e.stopPropagation();
        const nextIdx = (currentIndex + 1) % safeImages.length;
        updateIndex(nextIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, currentIndex, safeImages.length, onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (currentIndex - 1 + safeImages.length) % safeImages.length;
    updateIndex(nextIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (currentIndex + 1) % safeImages.length;
    updateIndex(nextIdx);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
  };

  const rawCurrentUrl = safeImages[currentIndex] || safeImages[0];
  const currentImage = failedUrls[currentIndex]
    ? FALLBACK_PET_IMAGE
    : rawCurrentUrl;

  const lightboxNode = (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-[200] bg-[#0D1512] text-white flex flex-col justify-between overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Trình xem ảnh rõ"
    >
      <header
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 w-full bg-[#14201B] border-b border-white/10 px-3 sm:px-5 py-2.5 pt-[max(10px,env(safe-area-inset-top,0px))] flex items-center justify-between gap-2 z-20"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15 text-white shrink-0">
            {currentIndex + 1} / {safeImages.length}
          </span>
          {title && (
            <p className="text-xs sm:text-sm font-semibold text-white/90 truncate">
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-[10px] bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold min-w-[44px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-[10px] bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
            title="Phóng to"
            aria-label="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-[10px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              title="Mặc định 100%"
              aria-label="Khôi phục kích thước mặc định"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="min-w-[44px] min-h-[44px] rounded-[10px] bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors ml-1"
            title="Đóng trình xem ảnh"
            aria-label="Đóng trình xem ảnh"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-auto p-3 sm:p-6"
      >
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black text-white border border-white/25 flex items-center justify-center transition-colors shadow-lg"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black text-white border border-white/25 flex items-center justify-center transition-colors shadow-lg"
              aria-label="Ảnh tiếp theo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            setZoomLevel((prev) => (prev === 1 ? 1.75 : 1));
          }}
          className="w-full h-full flex items-center justify-center cursor-zoom-in"
        >
          <img
            src={currentImage}
            alt={title || `Ảnh ${currentIndex + 1}`}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedUrls((prev) => ({ ...prev, [currentIndex]: true }))
            }
            style={{
              transform: zoomLevel === 1 ? 'none' : `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-transform duration-150"
          />
        </div>
      </div>

      {safeImages.length > 1 && (
        <footer
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 w-full bg-[#14201B] border-t border-white/10 px-4 py-2.5 pb-[max(12px,env(safe-area-inset-bottom,0px))] z-20"
        >
          <div className="max-w-xl mx-auto flex items-center justify-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
            {safeImages.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateIndex(idx);
                }}
                className={`relative w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-white scale-105 shadow-md'
                    : 'border-transparent opacity-55 hover:opacity-90'
                }`}
                aria-label={`Chọn ảnh ${idx + 1}`}
                aria-pressed={idx === currentIndex}
              >
                <img
                  src={failedUrls[idx] ? FALLBACK_PET_IMAGE : img}
                  alt={`Ảnh thu nhỏ ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedUrls((prev) => ({ ...prev, [idx]: true }))
                  }
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </footer>
      )}
    </div>
  );

  return createPortal(lightboxNode, document.body);
}
