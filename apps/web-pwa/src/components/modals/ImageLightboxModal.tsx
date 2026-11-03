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
  title?: string;
}

export default function ImageLightboxModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setZoomLevel(1);
        setCurrentIndex(
          (prev) => (prev - 1 + safeImages.length) % safeImages.length
        );
      } else if (e.key === 'ArrowRight') {
        setZoomLevel(1);
        setCurrentIndex((prev) => (prev + 1) % safeImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, safeImages.length, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setCurrentIndex(
      (prev) => (prev - 1 + safeImages.length) % safeImages.length
    );
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev + 1) % safeImages.length);
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
      className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-sm flex flex-col items-center justify-between p-2.5 sm:p-5 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between text-white py-2.5 px-3.5 z-20 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg bg-white/15 shrink-0">
            {currentIndex + 1} / {safeImages.length}
          </span>
          {title && (
            <p className="text-xs sm:text-sm font-medium text-white/95 truncate">
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold min-w-[42px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
            title="Phóng to"
            aria-label="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              title="Mặc định"
              aria-label="Khôi phục kích thước"
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
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors ml-1"
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-auto my-2">
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-black text-white border border-white/25 flex items-center justify-center transition-colors shadow-xl"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-black text-white border border-white/25 flex items-center justify-center transition-colors shadow-xl"
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
          className="flex items-center justify-center p-2 cursor-zoom-in"
        >
          <img
            src={currentImage}
            alt={title || `Ảnh ${currentIndex + 1}`}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedUrls((prev) => ({ ...prev, [currentIndex]: true }))
            }
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
            className="max-h-[74dvh] max-w-[92vw] sm:max-w-[82vw] object-contain rounded-xl shadow-2xl transition-transform duration-200"
          />
        </div>
      </div>

      {safeImages.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl py-2 px-3 z-20 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl"
        >
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {safeImages.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(1);
                  setCurrentIndex(idx);
                }}
                className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  idx === currentIndex
                    ? 'border-white scale-105 shadow-md'
                    : 'border-transparent opacity-55 hover:opacity-90'
                }`}
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
        </div>
      )}
    </div>
  );

  return createPortal(lightboxNode, document.body);
}
