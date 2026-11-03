'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Phone, ShieldCheck, Sparkles, User, X } from 'lucide-react';
import { ThemeId, UserSession } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
import { registerZeroVerificationUser } from '@/lib/supabase';

interface ZeroVerifyAuthModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  pendingActionLabel?: string;
  onClose: () => void;
  onSuccess: (session: UserSession) => void;
}

export default function ZeroVerifyAuthModal({
  isOpen,
  themeId,
  pendingActionLabel,
  onClose,
  onSuccess,
}: ZeroVerifyAuthModalProps) {
  const theme = DOM_THEMES[themeId];
  const [displayName, setDisplayName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const session = await registerZeroVerificationUser({
        displayName,
        pinCode,
        rawPhone,
      });
      onSuccess(session);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 24, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#E07A5F]/15 text-[#E07A5F]">
                Định danh nhanh 3 giây
              </span>
              <h3 className="text-lg font-bold mt-2">
                Nhập Tên Gọi Để Đăng Bài & Kết Nối
              </h3>
              <p className="text-xs mt-1" style={{ color: theme.mutedTextHex }}>
                {pendingActionLabel ||
                  'Thông tin của bạn được ghi nhớ tự động trên thiết bị để bạn không phải nhập lại ở các lần sau.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.pillBg }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1">
                1. Tên gọi của bạn / Biệt danh
              </label>
              <div
                className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
                style={{ backgroundColor: theme.frostedCardBg }}
              >
                <User className="w-4 h-4 text-[#E07A5F]" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Huy Khanh, Trạm Mèo Thủ Đức..."
                  className="w-full bg-transparent text-xs sm:text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1">
                  2. Mã PIN (4–6 số)
                </label>
                <div
                  className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <KeyRound className="w-4 h-4 text-[#2A9D8F]" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-transparent text-xs sm:text-sm outline-none"
                  />
                </div>
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-bold mb-1">
                  SĐT / Zalo (Mặc định che số)
                </label>
                <div
                  className="flex items-center gap-2 rounded-2xl px-3.5 py-3"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <Phone className="w-4 h-4 text-[#2A9D8F]" />
                  <input
                    type="tel"
                    required
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder="0908 123 456"
                    className="w-full bg-transparent text-xs sm:text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div
              className="p-3 rounded-2xl flex items-center gap-2.5 text-[11px]"
              style={{ backgroundColor: 'rgba(42, 157, 143, 0.12)' }}
            >
              <ShieldCheck className="w-4 h-4 text-[#2A9D8F] shrink-0" />
              <span>
                Số điện thoại của bạn được che thành <strong>090***456</strong> và chỉ mở khóa khi bạn đồng ý kết nối.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full text-sm font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #2A9D8F 0%, #E07A5F 100%)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Đang khởi tạo...' : 'Hoàn tất ngay'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
