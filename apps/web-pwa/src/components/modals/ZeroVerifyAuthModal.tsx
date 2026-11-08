'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  KeyRound,
  LogIn,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import {
  ThemeId,
  UserSession,
  isValidVietnamesePhone,
} from '@/lib/types';
import { maskPhoneNumber } from '@/lib/security';
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
  pendingActionLabel,
  onClose,
  onSuccess,
}: ZeroVerifyAuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [displayName, setDisplayName] = useState('');
  const [rawPhone, setRawPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const liveMaskedPhone =
    rawPhone.replace(/\D/g, '').length >= 7
      ? maskPhoneNumber(rawPhone)
      : 'Số được ẩn tự động';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const cleanName = displayName.trim();
    const cleanPhone = rawPhone.trim();
    const cleanPin = pinCode.trim();

    if (authMode === 'register' && cleanName.length < 2) {
      setErrorMsg(
        'Vui lòng nhập Tên gọi / Biệt danh của bạn (tối thiểu 2 ký tự).'
      );
      return;
    }

    if (!isValidVietnamesePhone(cleanPhone)) {
      setErrorMsg(
        'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).'
      );
      return;
    }

    if (!/^\d{4,6}$/.test(cleanPin)) {
      setErrorMsg('Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await registerZeroVerificationUser({
        displayName: authMode === 'register' ? cleanName : undefined,
        pinCode: cleanPin,
        rawPhone: cleanPhone,
        mode: authMode,
      });
      setDisplayName('');
      setRawPhone('');
      setPinCode('');
      onSuccess(session);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể xác thực tài khoản lúc này. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      data-testid="quick-auth-backdrop"
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      className="fixed inset-0 z-[130] bg-ink/55 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập nhanh"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92dvh] sm:max-w-[460px] rounded-t-2xl sm:rounded-2xl bg-[#FAF7F1] text-ink border border-[#DDDCD4] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-5 pt-4 pb-3.5 border-b border-[#DDDCD4] flex items-start justify-between gap-3 bg-[#FAF7F1]">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-brand-soft text-brand">
              <LogIn className="w-3 h-3 shrink-0" />
              <span>Đăng nhập nhanh</span>
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-ink">
              {authMode === 'register'
                ? 'Đăng nhập nhanh & Tạo tài khoản'
                : 'Đăng nhập tài khoản đã có'}
            </h3>
            <p className="text-xs text-ink-secondary leading-relaxed">
              {pendingActionLabel
                ? `Cần đăng nhập để tiếp tục: ${pendingActionLabel}`
                : 'Quản lý bài đăng cứu trợ, tìm thú lạc và lưu Nhật ký kỷ niệm của bạn.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] -mr-1 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-brand text-ink flex items-center justify-center shrink-0 transition-colors"
            aria-label="Đóng hộp thoại đăng nhập"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F2EFE7] border border-[#E4E1D8]"
            role="tablist"
            aria-label="Chế độ đăng nhập"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'register'}
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
              }}
              className={`min-h-[38px] px-3 rounded-[9px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                authMode === 'register'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Đăng nhập / Tạo mới</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'login'}
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
              className={`min-h-[38px] px-3 rounded-[9px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                authMode === 'login'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Đã có tài khoản</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Tên gọi của bạn / Biệt danh
                </label>
                <div className="flex items-center gap-2.5 h-11 rounded-[10px] px-3.5 bg-white border border-[#DDDCD4] focus-within:border-brand transition-colors">
                  <User className="w-4 h-4 text-brand shrink-0" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị của bạn..."
                    className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder:text-[#8A948E] outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Số điện thoại / Zalo
                </label>
                <div className="flex items-center gap-2.5 h-11 rounded-[10px] px-3.5 bg-white border border-[#DDDCD4] focus-within:border-brand transition-colors">
                  <Phone className="w-4 h-4 text-brand shrink-0" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder:text-[#8A948E] outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Mã PIN (4–6 số)
                </label>
                <div className="flex items-center gap-2 h-11 rounded-[10px] px-3.5 bg-white border border-[#DDDCD4] focus-within:border-brand transition-colors">
                  <KeyRound className="w-4 h-4 text-[#AF421F] shrink-0" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    minLength={4}
                    maxLength={6}
                    required
                    value={pinCode}
                    onChange={(e) =>
                      setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="4–6 chữ số"
                    className="w-full bg-transparent text-xs sm:text-sm text-ink placeholder:text-[#8A948E] outline-none"
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 rounded-[10px] bg-[#FFF0E5] border border-[#AF421F]/40 text-[#AF421F] text-xs font-semibold space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
                {authMode === 'register' &&
                  errorMsg.includes('đã được đăng ký') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMsg(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-white border border-[#AF421F]/30 text-ink hover:bg-[#FAF7F1] text-xs font-bold transition-colors text-center"
                    >
                      Chuyển sang tab Đăng nhập với SĐT này →
                    </button>
                  )}
                {authMode === 'login' &&
                  errorMsg.includes('chưa được đăng ký') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMsg(null);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-white border border-[#AF421F]/30 text-ink hover:bg-[#FAF7F1] text-xs font-bold transition-colors text-center"
                    >
                      Chuyển sang tab Đăng ký mới với SĐT này →
                    </button>
                  )}
              </div>
            )}

            <div className="p-3 rounded-[10px] bg-brand-soft/70 border border-[#D4E2D1] flex items-start gap-2.5 text-[11px] text-ink">
              <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Số điện thoại của bạn được bảo mật hiển thị dưới dạng{' '}
                <strong>{liveMaskedPhone}</strong> và chỉ mở khóa khi bạn đồng ý
                kết nối.
              </span>
            </div>

            <div className="pt-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 rounded-[10px] bg-white border border-[#DDDCD4] hover:bg-[#F2EFE7] text-xs sm:text-sm font-bold text-ink transition-colors"
              >
                Để sau
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[44px] px-5 rounded-[10px] bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>
                  {submitting
                    ? 'Đang xử lý...'
                    : authMode === 'login'
                    ? 'Đăng nhập ngay'
                    : 'Đăng nhập nhanh'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
