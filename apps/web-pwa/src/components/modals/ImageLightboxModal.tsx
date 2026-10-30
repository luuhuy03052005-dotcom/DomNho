'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  if (!isOpen || images.length === 0) return null;

  const handlePrev = () => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const currentImage = images[currentIndex] || images[0];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 select-none touch-none"
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh phóng to"
      >
        <div className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md">
              {currentIndex + 1} / {images.length}
            </span>
            {title && (
              <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
                {title}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
              title="Thu nhỏ"
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
              title="Phóng to"
              aria-label="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="Khôi phục kích thước ban đầu"
                aria-label="Khôi phục kích thước ban đầu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-transform active:scale-95 ml-2"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden my-auto">
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm active:scale-90"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-sm active:scale-90"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="w-full h-full flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
            onClick={() => {
              if (zoomLevel === 1) handleZoomIn();
              else handleResetZoom();
            }}
          >
            <motion.img
              key={currentImage}
              src={currentImage}
              alt={title || `Ảnh ${currentIndex + 1}`}
              referrerPolicy="no-referrer"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: zoomLevel }}
              transition={{ duration: 0.2 }}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform"
            />
          </div>
        </div>

        {images.length > 1 && (
          <div className="w-full max-w-xl py-3 px-4 z-10">
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setCurrentIndex(idx);
                  }}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-[#0E513B] ring-2 ring-white/60 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

