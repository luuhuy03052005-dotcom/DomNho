'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, PlusSquare, Share, X } from 'lucide-react';
import { ThemeId } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';

interface IosInstallPromptProps {
  themeId: ThemeId;
  onEnablePush: () => void;
}

export default function IosInstallPrompt({
  themeId,
  onEnablePush,
}: IosInstallPromptProps) {
  const theme = DOM_THEMES[themeId];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem('dom_nho_ios_prompt_dismissed');
    if (dismissed) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isIos && !isStandalone) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dom_nho_ios_prompt_dismissed', '1');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-32 inset-x-4 z-40 max-w-md mx-auto rounded-[28px] p-4 shadow-2xl backdrop-blur-2xl"
        style={{
          backgroundColor: theme.frostedSheetBg,
          color: theme.textHex,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-[#E63946] text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold">
                Cài Đốm Nhỏ ra Màn hình chính điện thoại
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: theme.mutedTextHex }}>
                Nhận thông báo khi đi dạo gần các ca cứu hộ 500m:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.pillBg }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] px-2">
          <span className="flex items-center gap-1 font-medium">
            1. Bấm nút Chia sẻ <Share className="w-3.5 h-3.5 text-[#2A9D8F]" />
          </span>
          <span className="flex items-center gap-1 font-medium">
            2. Chọn “Thêm vào MH chính” <PlusSquare className="w-3.5 h-3.5 text-[#E07A5F]" />
          </span>
          <button
            type="button"
            onClick={() => {
              onEnablePush();
              dismiss();
            }}
            className="px-3 py-1 rounded-full font-bold bg-[#2A9D8F] text-white"
          >
            Bật thông báo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
