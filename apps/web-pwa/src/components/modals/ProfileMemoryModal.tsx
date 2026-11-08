'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Camera,
  CheckCircle2,
  Eye,
  Footprints,
  Heart,
  ImagePlus,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  DomSpot,
  MemorySnap,
  ThemeId,
  UserSession,
  getSpotBadgeMeta,
  isSpotOwnedByUser,
} from '@/lib/types';
import { compressImageToWebpClient } from '@/lib/image-compressor';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationLogItem,
  NotificationSettings,
} from '@/hooks/usePushNotification';

export type ProfileModalTab =
  | 'MY_SPOTS'
  | 'NOTIFICATION_SETTINGS'
  | 'WEEKLY_SNAP'
  | 'COUPLE_WALK';

interface ProfileMemoryModalProps {
  isOpen: boolean;
  initialTab?: ProfileModalTab;
  themeId: ThemeId;
  userSession: UserSession | null;
  spots: DomSpot[];
  memorySnaps: MemorySnap[];
  patrolModeActive: boolean;
  onTogglePatrolMode: () => void;
  onClose: () => void;
  onRequireAuth: () => void;
  onLogout?: () => void;
  onResolveSpotToPeace: (spotId: string) => void;
  onAddWeeklyMemorySnap: (snap: {
    petName: string;
    caption: string;
    moodTag: string;
    weightKg?: number;
    imageUrl: string;
  }) => void;
  onActivateEmergencyBoost: (spotId: string) => void;
  onLinkPartnerName: (partnerName: string) => void;
  onOpenCreatePost?: () => void;
  onOpenEditSpot?: (spot: DomSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  onSelectSpotDetail?: (spot: DomSpot) => void;
  notificationSettings?: NotificationSettings;
  notificationPermission?: NotificationPermission;
  notificationPlatform?: 'ios' | 'android' | 'desktop';
  notificationHistory?: NotificationLogItem[];
  onUpdateNotificationSetting?: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  onRequestPushPermission?: () => Promise<boolean>;
  onTestNotification?: () => void;
  onClearNotificationHistory?: () => void;
}

function ToggleSwitch({
  checked,
  disabled = false,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
        disabled ? 'opacity-45 cursor-not-allowed' : ''
      } ${checked ? 'bg-brand' : 'bg-[#D0CEC6]'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const NOTIFICATION_TOGGLE_ITEMS: Array<{
  key: keyof Omit<NotificationSettings, 'masterEnabled' | 'soundAndVibrate'>;
  title: string;
  description: string;
}> = [
  {
    key: 'postStatus',
    title: 'Trạng thái bài đăng của tôi',
    description:
      'Thông báo ngay khi bài đăng đang xử lý, đăng thành công hoặc hoàn tất cập nhật.',
  },
  {
    key: 'doubleMatch',
    title: 'Phát hiện thú cưng trùng khớp quanh bạn',
    description:
      'Cảnh báo khi hệ thống nhận diện ảnh hoặc quét bán kính 3km tìm thấy bài viết giống bé của bạn.',
  },
  {
    key: 'sightingReport',
    title: 'Manh mối mới & Yêu cầu liên hệ',
    description:
      'Thông báo khi có người báo nhìn thấy thú cưng hoặc gửi lời nhắn kết nối trên bài đăng của bạn.',
  },
  {
    key: 'urgentSos',
    title: 'Tin cứu trợ khẩn cấp gần vị trí của bạn',
    description:
      'Thông báo khi có ca cứu hộ chó mèo khẩn cấp mới trong khu vực bạn đang theo dõi.',
  },
  {
    key: 'weeklyMemory',
    title: 'Nhật ký kỷ niệm hàng tuần',
    description:
      'Thông báo khi người nhận nuôi gửi ảnh báo tin bình an hoặc nhắc lịch cập nhật tuần mới.',
  },
];

export default function ProfileMemoryModal({
  isOpen,
  initialTab = 'MY_SPOTS',
  userSession,
  spots,
  memorySnaps,
  patrolModeActive,
  onTogglePatrolMode,
  onClose,
  onRequireAuth,
  onLogout,
  onResolveSpotToPeace,
  onAddWeeklyMemorySnap,
  onActivateEmergencyBoost,
  onLinkPartnerName,
  onOpenCreatePost,
  onOpenEditSpot,
  onDeleteSpot,
  onSelectSpotDetail,
  notificationSettings = DEFAULT_NOTIFICATION_SETTINGS,
  notificationPermission = 'default',
  notificationPlatform = 'desktop',
  notificationHistory = [],
  onUpdateNotificationSetting,
  onRequestPushPermission,
  onTestNotification,
  onClearNotificationHistory,
}: ProfileMemoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileModalTab>(initialTab);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [showAddSnapForm, setShowAddSnapForm] = useState(false);
  const [petName, setPetName] = useState('');
  const [caption, setCaption] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [snapImage, setSnapImage] = useState<string>('');
  const [uploadingSnap, setUploadingSnap] = useState(false);
  const [snapFormError, setSnapFormError] = useState<string | null>(null);

  const [partnerInput, setPartnerInput] = useState(
    userSession?.partnerName || ''
  );

  const snapFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    setPartnerInput(userSession?.partnerName || '');
  }, [userSession?.partnerName]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const mySpots = userSession
    ? spots.filter((s) => isSpotOwnedByUser(s, userSession))
    : [];

  const handleSnapFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSnap(true);
    try {
      const compressed = await compressImageToWebpClient(file, 960, 0.8);
      setSnapImage(compressed.dataUrl);
      setSnapFormError(null);
    } finally {
      setUploadingSnap(false);
    }
  };

  const handleCreateMemorySnap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) {
      setSnapFormError('Vui lòng nhập tên của bé.');
      return;
    }
    if (!caption.trim()) {
      setSnapFormError('Vui lòng viết đôi dòng nhật ký cho bức ảnh kỷ niệm.');
      return;
    }
    if (!snapImage) {
      setSnapFormError(
        'Vui lòng chọn tải lên bức ảnh thật của bé từ máy của bạn.'
      );
      return;
    }
    setSnapFormError(null);
    onAddWeeklyMemorySnap({
      petName: petName.trim(),
      caption: caption.trim(),
      moodTag: moodTag.trim(),
      weightKg: parseFloat(weightKg) || undefined,
      imageUrl: snapImage,
    });
    setPetName('');
    setCaption('');
    setMoodTag('');
    setWeightKg('');
    setSnapImage('');
    setShowAddSnapForm(false);
  };

  const handleMasterToggle = async (nextVal: boolean) => {
    if (onUpdateNotificationSetting) {
      onUpdateNotificationSetting('masterEnabled', nextVal);
    }
    if (nextVal && onRequestPushPermission) {
      await onRequestPushPermission();
    }
  };

  const platformLabel =
    notificationPlatform === 'ios'
      ? 'iPhone / iPad (iOS)'
      : notificationPlatform === 'android'
      ? 'Điện thoại Android'
      : 'Trình duyệt máy tính';

  return createPortal(
    <div
      onClick={onClose}
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      className="fixed inset-0 z-[110] bg-black/45 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tài khoản, quản lý bài đăng và cài đặt thông báo"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92dvh] sm:max-h-[88dvh] sm:max-w-xl bg-white text-ink rounded-t-2xl sm:rounded-xl border border-[#DDDCD4] shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header phẳng, rõ ràng, không lồng nhiều khung bo góc */}
        <header className="shrink-0 bg-white border-b border-[#E5E4DC] px-4 sm:px-5 pt-4 pb-0">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#F1EFE8]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-brand text-white font-bold text-sm flex items-center justify-center shrink-0">
                {userSession
                  ? userSession.displayName.slice(0, 1).toUpperCase()
                  : 'Đ'}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-ink truncate">
                    {userSession
                      ? userSession.displayName
                      : 'Tài khoản & Cài đặt'}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F2F4F1] text-brand inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>
                      {userSession ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
                    </span>
                  </span>
                </div>
                <p className="text-xs text-ink-secondary truncate mt-0.5">
                  {userSession
                    ? `SĐT: ${userSession.maskedPhone} • Mã ghép đôi: ${userSession.coupleRoomCode}`
                    : 'Đăng nhập để đồng bộ bài đăng và cài đặt trên mọi thiết bị'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!userSession ? (
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="h-9 px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Đăng nhập</span>
                </button>
              ) : (
                onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="h-9 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] hover:border-[#AF421F] hover:text-[#AF421F] text-ink-secondary text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] hover:border-ink text-ink flex items-center justify-center shrink-0 transition-colors"
                aria-label="Đóng hộp thoại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thanh chuyển tab dạng gạch chân phẳng (Flat Underline Tabs) */}
          <div
            className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1"
            role="tablist"
            aria-label="Các mục quản lý và cài đặt"
          >
            {[
              {
                id: 'MY_SPOTS',
                label: `Bài đăng (${mySpots.length})`,
              },
              {
                id: 'NOTIFICATION_SETTINGS',
                label: 'Cài đặt thông báo',
              },
              {
                id: 'WEEKLY_SNAP',
                label: 'Nhật ký tuần',
              },
              {
                id: 'COUPLE_WALK',
                label: 'Chế độ đi dạo',
              },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.id as ProfileModalTab)}
                  className={`px-3 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-brand text-brand'
                      : 'border-transparent text-ink-secondary hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Nội dung chính phẳng, thoáng, dùng đường kẻ mảnh thay vì nhiều hộp chồng chéo */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-[max(24px,env(safe-area-inset-bottom,0px))]">
          {/* TAB 1: QUẢN LÝ BÀI ĐĂNG */}
          {activeTab === 'MY_SPOTS' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#ECEAE2]">
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    Bài đăng của bạn ({mySpots.length})
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Thêm bài mới, chỉnh sửa nội dung, đánh dấu đoàn tụ hoặc xóa bài viết.
                  </p>
                </div>

                {onOpenCreatePost && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreatePost();
                    }}
                    className="h-9 px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Đăng bài mới</span>
                  </button>
                )}
              </div>

              {mySpots.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-ink">
                    {userSession
                      ? 'Bạn chưa có bài đăng nào'
                      : 'Vui lòng đăng nhập để quản lý bài đăng'}
                  </p>
                  <p className="text-xs text-ink-secondary max-w-md mx-auto leading-relaxed">
                    Các bài đăng cứu hộ, tìm thú lạc hoặc nhận nuôi của bạn sẽ hiển thị tại đây để chỉnh sửa hoặc xóa bất kỳ lúc nào.
                  </p>
                  {!userSession ? (
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Đăng nhập ngay</span>
                    </button>
                  ) : (
                    onOpenCreatePost && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreatePost();
                        }}
                        className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Đăng bài đầu tiên</span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#ECEAE2]">
                  {mySpots.map((sp) => {
                    const badge = getSpotBadgeMeta(sp);
                    const isConfirmingDelete = confirmDeleteId === sp.id;
                    return (
                      <div key={sp.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                        <div className="flex items-start gap-3 min-w-0">
                          <img
                            src={sp.images[0]}
                            alt={sp.title}
                            className="w-14 h-14 rounded-lg object-cover shrink-0 bg-[#F1EFE8] border border-[#E5E4DC]"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                                style={{
                                  backgroundColor: badge.bgHex,
                                  color: badge.textHex,
                                }}
                              >
                                {badge.uppercaseLabel}
                              </span>
                              {sp.isEmergencyBoosted && (
                                <span className="px-2 py-0.5 rounded bg-[#FFF0E5] text-[#AF421F] text-[10px] font-semibold">
                                  Khẩn cấp 48h
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-ink line-clamp-1">
                              {sp.title}
                            </h4>
                            <p className="text-xs text-ink-secondary truncate">
                              {sp.formattedAddress || sp.areaLabel} • Quan tâm:{' '}
                              {sp.boostCount || 1} • Manh mối:{' '}
                              {sp.sightings?.length || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {onSelectSpotDetail && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectSpotDetail(sp);
                                }}
                                className="h-8 px-2.5 rounded-md text-xs font-semibold bg-[#FAF7F1] hover:bg-[#F1EFE8] text-ink border border-[#DDDCD4] inline-flex items-center gap-1 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-brand" />
                                <span>Xem</span>
                              </button>
                            )}

                            {onOpenEditSpot && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenEditSpot(sp);
                                }}
                                className="h-8 px-2.5 rounded-md text-xs font-semibold bg-[#F2F4F1] hover:bg-brand text-brand hover:text-white inline-flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Sửa bài</span>
                              </button>
                            )}

                            {sp.spotType !== 'GREEN_PEACE' && (
                              <button
                                type="button"
                                onClick={() => onResolveSpotToPeace(sp.id)}
                                className="h-8 px-2.5 rounded-md text-xs font-semibold bg-[#FAF7F1] hover:bg-[#F2F4F1] text-brand border border-[#DDDCD4] inline-flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã đoàn tụ</span>
                              </button>
                            )}

                            {sp.spotType === 'RED_SOS' &&
                              !sp.isEmergencyBoosted && (
                                <button
                                  type="button"
                                  onClick={() => onActivateEmergencyBoost(sp.id)}
                                  className="h-8 px-2.5 rounded-md text-xs font-semibold bg-[#FFF0E5] hover:bg-[#AF421F] text-[#AF421F] hover:text-white inline-flex items-center gap-1 transition-colors"
                                >
                                  <Zap className="w-3.5 h-3.5" />
                                  <span>Khẩn cấp</span>
                                </button>
                              )}
                          </div>

                          {onDeleteSpot && (
                            <div className="flex items-center gap-1.5">
                              {isConfirmingDelete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteId(null);
                                      onDeleteSpot(sp.id);
                                    }}
                                    className="h-8 px-2.5 rounded-md text-xs font-semibold bg-[#AF421F] hover:bg-[#933516] text-white inline-flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xác nhận xóa</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="h-8 px-2 rounded-md text-xs font-medium text-ink-secondary hover:bg-[#F1EFE8]"
                                  >
                                    Hủy
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(sp.id)}
                                  className="h-8 px-2.5 rounded-md text-xs font-semibold text-[#AF421F] hover:bg-[#FFF0E5] inline-flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa bài</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CÀI ĐẶT THÔNG BÁO (HỖ TRỢ IPHONE, ANDROID & TRÌNH DUYỆT) */}
          {activeTab === 'NOTIFICATION_SETTINGS' && (
            <div className="space-y-5">
              {/* Thiết lập tổng */}
              <div className="pb-4 border-b border-[#ECEAE2] space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink">
                      Nhận thông báo trên thiết bị
                    </h3>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Đang sử dụng: {platformLabel} •{' '}
                      {notificationSettings.masterEnabled
                        ? 'Đang bật thông báo'
                        : 'Đang tắt thông báo'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={notificationSettings.masterEnabled}
                    onChange={handleMasterToggle}
                    label="Nhận thông báo trên thiết bị"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#F5F4EE]">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-ink">
                      Âm báo &amp; Rung khi có tin mới
                    </p>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Phát âm báo nhẹ trên iPhone/Android và rung thiết bị khi có cảnh báo quan trọng.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={
                      notificationSettings.masterEnabled &&
                      notificationSettings.soundAndVibrate
                    }
                    disabled={!notificationSettings.masterEnabled}
                    onChange={(val) =>
                      onUpdateNotificationSetting?.('soundAndVibrate', val)
                    }
                    label="Âm báo và rung khi có tin mới"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                    <Smartphone className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span>
                      {notificationPlatform === 'ios'
                        ? 'Hỗ trợ thông báo trực tiếp trên iPhone/iPad & màn hình chính iOS.'
                        : notificationPermission === 'granted'
                        ? 'Trình duyệt đã cấp quyền thông báo đẩy.'
                        : 'Bấm kiểm tra để cấp quyền hiển thị thông báo trên màn hình.'}
                    </span>
                  </div>

                  {onTestNotification && (
                    <button
                      type="button"
                      onClick={onTestNotification}
                      className="h-8 px-3 rounded-md bg-[#FAF7F1] border border-[#DDDCD4] hover:border-brand text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5 text-brand" />
                      <span>Gửi thông báo thử</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Danh sách từng mục thông báo có Toggle Switch riêng */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">
                  Tùy chỉnh từng mục thông báo
                </h4>
                <div className="divide-y divide-[#ECEAE2]">
                  {NOTIFICATION_TOGGLE_ITEMS.map((item) => {
                    const isChecked =
                      notificationSettings.masterEnabled &&
                      Boolean(notificationSettings[item.key]);
                    return (
                      <div
                        key={item.key}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-ink">
                            {item.title}
                          </p>
                          <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={isChecked}
                          disabled={!notificationSettings.masterEnabled}
                          onChange={(val) =>
                            onUpdateNotificationSetting?.(item.key, val)
                          }
                          label={item.title}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lịch sử thông báo gần đây */}
              <div className="pt-3 border-t border-[#ECEAE2] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                    Thông báo gần đây ({notificationHistory.length})
                  </h4>
                  {notificationHistory.length > 0 &&
                    onClearNotificationHistory && (
                      <button
                        type="button"
                        onClick={onClearNotificationHistory}
                        className="text-xs font-semibold text-ink-secondary hover:text-[#AF421F]"
                      >
                        Xóa lịch sử
                      </button>
                    )}
                </div>

                {notificationHistory.length === 0 ? (
                  <p className="text-xs text-ink-secondary py-2">
                    Chưa có thông báo nào được ghi nhận trên thiết bị này.
                  </p>
                ) : (
                  <div className="divide-y divide-[#ECEAE2] max-h-48 overflow-y-auto">
                    {notificationHistory.slice(0, 8).map((item) => (
                      <div key={item.id} className="py-2.5 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-ink">
                            {item.title}
                          </p>
                          <span className="text-[11px] text-ink-secondary shrink-0">
                            {item.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NHẬT KÝ KỶ NIỆM HÀNG TUẦN */}
          {activeTab === 'WEEKLY_SNAP' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#ECEAE2]">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-brand shrink-0" />
                    <span>Nhật ký Chạm ảnh mỗi tuần</span>
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Cập nhật hình ảnh sau khi nhận nuôi để báo tin bình an cho người cứu hộ.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddSnapForm((v) => !v)}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-brand hover:bg-brand-hover inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Chạm ảnh tuần mới</span>
                </button>
              </div>

              {showAddSnapForm && (
                <form
                  onSubmit={handleCreateMemorySnap}
                  className="pb-4 border-b border-[#ECEAE2] space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Nhập tên bé..."
                      className="w-full h-10 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-ink outline-none focus:border-brand"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="Cân nặng (kg, tùy chọn)"
                      className="w-full h-10 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <input
                    type="text"
                    value={moodTag}
                    onChange={(e) => setMoodTag(e.target.value)}
                    placeholder="Cảm xúc / trạng thái tuần này của bé..."
                    className="w-full h-10 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-ink outline-none focus:border-brand"
                  />
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={2}
                    placeholder="Chia sẻ khoảnh khắc đáng yêu tuần này của bé..."
                    className="w-full p-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-ink outline-none focus:border-brand"
                    required
                  />
                  {snapFormError && (
                    <p className="text-xs font-semibold text-[#AF421F]">
                      {snapFormError}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <input
                      ref={snapFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSnapFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => snapFileRef.current?.click()}
                      className="h-9 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs font-semibold text-ink inline-flex items-center justify-center gap-1.5"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-brand" />
                      <span>
                        {uploadingSnap
                          ? 'Đang xử lý ảnh...'
                          : snapImage
                          ? 'Đã chọn ảnh tuần mới'
                          : 'Chọn ảnh từ thiết bị'}
                      </span>
                    </button>

                    <button
                      type="submit"
                      className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-brand hover:bg-brand-hover inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Lưu &amp; Báo bình an</span>
                    </button>
                  </div>
                </form>
              )}

              {memorySnaps.length === 0 ? (
                <p className="text-xs text-ink-secondary py-6 text-center">
                  Chưa có kỷ niệm nào. Bấm “Chạm ảnh tuần mới” để bắt đầu lưu nhật ký.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {memorySnaps.map((snap) => (
                    <div
                      key={snap.id}
                      className="rounded-lg overflow-hidden border border-[#E5E4DC] flex flex-col justify-between"
                    >
                      <div className="relative h-36 w-full bg-[#F1EFE8]">
                        <img
                          src={snap.imageUrl}
                          alt={snap.petName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-white">
                          Tuần {snap.weekNumber} • {snap.petName}
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                          <span>{snap.moodTag ? `#${snap.moodTag}` : ''}</span>
                          <span>{snap.createdAt}</span>
                        </div>
                        <p className="text-xs text-ink leading-relaxed">
                          {snap.caption}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CHẾ ĐỘ ĐI DẠO & GHÉP ĐÔI */}
          {activeTab === 'COUPLE_WALK' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#ECEAE2]">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Footprints className="w-4 h-4 text-brand shrink-0" />
                    <span>Radar Đi dạo quanh bạn (1.5km)</span>
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
                    Ưu tiên hiển thị các bài tìm thú lạc và cứu trợ trong bán kính 1.5km quanh vị trí của bạn.
                  </p>
                </div>
                <ToggleSwitch
                  checked={patrolModeActive}
                  onChange={() => onTogglePatrolMode()}
                  label="Chế độ Đi dạo quanh bạn"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-ink">
                    Ghép đôi người đồng hành
                  </h4>
                </div>
                <p className="text-xs text-ink-secondary">
                  Nhập tên người đồng hành để lưu chung Sổ tay vị trí và Nhật ký chăm sóc thú cưng:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={partnerInput}
                    onChange={(e) => setPartnerInput(e.target.value)}
                    placeholder="Nhập tên bạn đồng hành..."
                    className="flex-1 h-10 px-3 rounded-lg bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-ink outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (partnerInput.trim()) {
                        onLinkPartnerName(partnerInput.trim());
                      }
                    }}
                    className="h-10 px-4 rounded-lg text-xs font-semibold text-white bg-brand hover:bg-brand-hover inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Kết nối</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[#ECEAE2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-secondary">
            <p className="flex items-center gap-1.5 flex-wrap">
              <Mail className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Mọi ý kiến đóng góp, phản hồi gửi về email:</span>
              <a
                href="mailto:luuhuy05032005h@gmail.com?subject=G%C3%B3p%20%C3%BD%20%26%20Ph%E1%BA%A3n%20h%E1%BB%93i%20cho%20%C4%90%E1%BB%91m%20Nh%E1%BB%8F"
                className="font-bold text-brand hover:underline break-all"
              >
                luuhuy05032005h@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
