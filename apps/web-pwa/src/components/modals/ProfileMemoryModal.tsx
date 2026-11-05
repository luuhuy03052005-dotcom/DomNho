'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  CheckCircle2,
  Eye,
  Footprints,
  Heart,
  ImagePlus,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
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
} from '@/lib/types';
import { compressImageToWebpClient } from '@/lib/image-compressor';

interface ProfileMemoryModalProps {
  isOpen: boolean;
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
}

export default function ProfileMemoryModal({
  isOpen,
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
}: ProfileMemoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'MY_SPOTS' | 'WEEKLY_SNAP' | 'COUPLE_WALK'
  >('MY_SPOTS');
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
    ? spots.filter((s) => s.authorId === userSession.id)
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

  return createPortal(
    <div
      onClick={onClose}
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      className="fixed inset-0 z-[110] bg-[#142820]/50 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tài khoản và kỷ niệm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92dvh] sm:max-h-[88dvh] sm:max-w-xl bg-[#FAF7F1] text-[#142820] rounded-t-2xl sm:rounded-2xl border border-[#DDDCD4] shadow-2xl flex flex-col overflow-hidden"
      >
        <header className="shrink-0 bg-[#FAF7F1] border-b border-[#DDDCD4] px-4 sm:px-5 pt-3.5 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-[#142820]">
              Tài khoản &amp; Kỷ niệm
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -mr-1 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-[#142820] flex items-center justify-center shrink-0 transition-colors"
              aria-label="Đóng hộp thoại tài khoản"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#0E513B] text-white font-extrabold text-base flex items-center justify-center shrink-0">
                {userSession
                  ? userSession.displayName.slice(0, 1).toUpperCase()
                  : 'Đ'}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#142820]">
                    {userSession
                      ? userSession.displayName
                      : 'Khách xem tự do'}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-[#E8EFE6] text-[#0E513B] text-[11px] font-bold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    <span>
                      {userSession ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
                    </span>
                  </span>
                </div>

                <p className="text-xs text-[#52605A] leading-relaxed">
                  {userSession
                    ? `SĐT bảo mật: ${userSession.maskedPhone} • Mã ghép đôi: ${userSession.coupleRoomCode}`
                    : 'Đăng nhập nhanh bằng tên gọi, số điện thoại và mã PIN để lưu bài tự đăng và Nhật ký kỷ niệm.'}
                </p>
              </div>
            </div>

            {!userSession ? (
              <button
                type="button"
                onClick={onRequireAuth}
                className="w-full sm:w-auto min-h-[44px] px-4 rounded-[10px] bg-[#AF421F] hover:bg-[#933516] text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Đăng nhập nhanh</span>
              </button>
            ) : (
              onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto min-h-[40px] px-3.5 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] hover:border-[#AF421F] hover:text-[#AF421F] text-[#52605A] text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Đăng xuất</span>
                </button>
              )
            )}
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Các mục trong tài khoản"
          >
            {[
              {
                id: 'MY_SPOTS',
                label: `Quản lý bài đăng (${mySpots.length})`,
              },
              {
                id: 'WEEKLY_SNAP',
                label: 'Chạm ảnh mỗi tuần',
              },
              {
                id: 'COUPLE_WALK',
                label: 'Đi dạo cùng nhau',
              },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-[10px] text-xs font-bold border transition-colors ${
                    isActive
                      ? 'bg-[#0E513B] text-white border-[#0E513B]'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-[max(28px,env(safe-area-inset-bottom,0px))] space-y-4">
          {activeTab === 'WEEKLY_SNAP' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#0E513B] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Cam kết kỷ niệm • Chạm ảnh mỗi tuần</span>
                  </p>
                  <p className="text-xs sm:text-sm text-[#52605A] leading-relaxed">
                    Mỗi tuần chụp 1 bức ảnh cập nhật sau khi nhận nuôi: vừa gửi
                    báo tin bình an cho người cứu hộ cũ, vừa ghép thành Nhật ký
                    trưởng thành.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddSnapForm((v) => !v)}
                  className="w-full sm:w-auto min-h-[46px] px-4 rounded-[10px] text-xs sm:text-sm font-bold text-white bg-[#0E513B] hover:bg-[#0A412F] flex items-center justify-center gap-2 shrink-0 transition-colors"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Chạm ảnh tuần mới</span>
                </button>
              </div>

              {showAddSnapForm && (
                <form
                  onSubmit={handleCreateMemorySnap}
                  className="p-4 rounded-xl bg-white border border-[#0E513B] space-y-3"
                >
                  <p className="text-xs font-bold text-[#0E513B]">
                    Thêm ảnh Nhật ký tuần mới (gửi thông báo tới Người cứu hộ)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Nhập tên bé..."
                      className="w-full h-11 px-3 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-[#142820] outline-none focus:border-[#0E513B]"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="Cân nặng (kg, tùy chọn)"
                      className="w-full h-11 px-3 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-[#142820] outline-none focus:border-[#0E513B]"
                    />
                  </div>
                  <input
                    type="text"
                    value={moodTag}
                    onChange={(e) => setMoodTag(e.target.value)}
                    placeholder="Cảm xúc / trạng thái tuần này của bé..."
                    className="w-full h-11 px-3 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-[#142820] outline-none focus:border-[#0E513B]"
                  />
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={2}
                    placeholder="Chia sẻ khoảnh khắc đáng yêu tuần này của bé..."
                    className="w-full p-3 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-[#142820] outline-none focus:border-[#0E513B]"
                    required
                  />
                  {snapFormError && (
                    <p className="text-xs font-bold text-[#AF421F]">
                      {snapFormError}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                      className="min-h-[42px] px-3.5 rounded-[10px] bg-[#F1EFE8] hover:bg-[#E8EFE6] text-xs font-semibold text-[#142820] inline-flex items-center justify-center gap-1.5"
                    >
                      <ImagePlus className="w-4 h-4 text-[#0E513B]" />
                      <span>
                        {uploadingSnap
                          ? 'Đang nén WebP...'
                          : snapImage
                          ? 'Đã chọn ảnh tuần mới'
                          : 'Chọn ảnh từ máy'}
                      </span>
                    </button>

                    <button
                      type="submit"
                      className="min-h-[44px] px-4 rounded-[10px] text-xs font-bold text-white bg-[#0E513B] hover:bg-[#0A412F] inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Lưu &amp; Báo bình an</span>
                    </button>
                  </div>
                </form>
              )}

              {memorySnaps.length === 0 ? (
                <div className="p-6 rounded-xl bg-white border border-[#DDDCD4] text-center space-y-2">
                  <p className="text-xs sm:text-sm text-[#52605A] leading-relaxed">
                    Chưa có kỷ niệm nào. Bấm “Chạm ảnh tuần mới” và chọn ảnh
                    thật của bé để bắt đầu nhật ký.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {memorySnaps.map((snap) => (
                    <div
                      key={snap.id}
                      className="rounded-xl overflow-hidden bg-white border border-[#DDDCD4] flex flex-col justify-between"
                    >
                      <div className="relative h-40 w-full bg-[#F1EFE8]">
                        <img
                          src={snap.imageUrl}
                          alt={snap.petName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#0E513B] text-white">
                          Tuần thứ {snap.weekNumber} • {snap.petName}
                        </div>
                        {snap.weightKg && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white">
                            {snap.weightKg} kg
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          {snap.moodTag ? (
                            <span className="font-bold text-[#AF421F]">
                              #{snap.moodTag}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-[#52605A]">{snap.createdAt}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-[#142820]">
                          {snap.caption}
                        </p>
                        {snap.rescuerName && (
                          <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-[#0E513B]">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Đã gửi báo bình an tới {snap.rescuerName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'COUPLE_WALK' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#DDDCD4] space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF0E5] text-[#AF421F] flex items-center justify-center shrink-0">
                    <Footprints className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#142820]">
                      Bản đồ Kỷ niệm • Chế độ Đi dạo cùng nhau
                    </h4>
                    <p className="text-xs text-[#52605A] leading-relaxed mt-0.5">
                      Khi bật chế độ Đi dạo, hệ thống tự động ưu tiên hiển thị
                      các bài tìm thú lạc và cứu trợ trong bán kính 1.5km quanh
                      bạn.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#F1EFE8]">
                  <span className="text-xs font-semibold text-[#142820]">
                    Trạng thái Radar tuần tra quanh bạn:
                  </span>
                  <button
                    type="button"
                    onClick={onTogglePatrolMode}
                    aria-pressed={patrolModeActive}
                    className={`min-h-[42px] px-4 rounded-[10px] text-xs font-bold transition-colors ${
                      patrolModeActive
                        ? 'bg-[#0E513B] text-white'
                        : 'bg-[#F1EFE8] text-[#142820]'
                    }`}
                  >
                    {patrolModeActive
                      ? 'Đang bật Đi dạo (1.5km)'
                      : 'Đang tắt • Bấm để bật'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#DDDCD4] space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#AF421F] shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#142820]">
                    Ghép đôi Không gian Đi dạo &amp; Nuôi thú cưng
                  </h4>
                </div>
                <p className="text-xs text-[#52605A] leading-relaxed">
                  Nhập tên người đồng hành để lưu chung Sổ tay vị trí và Nhật ký
                  Chạm ảnh mỗi tuần:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={partnerInput}
                    onChange={(e) => setPartnerInput(e.target.value)}
                    placeholder="Tên người thương / bạn đồng hành..."
                    className="flex-1 h-11 px-3.5 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-xs text-[#142820] outline-none focus:border-[#0E513B]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (partnerInput.trim()) {
                        onLinkPartnerName(partnerInput.trim());
                      }
                    }}
                    className="min-h-[44px] px-4 rounded-[10px] text-xs font-bold text-white bg-[#AF421F] hover:bg-[#933516] inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Kết nối</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'MY_SPOTS' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-white border border-[#DDDCD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#0E513B]">
                    Quản lý bài đăng của bạn ({mySpots.length} bài)
                  </p>
                  <p className="text-xs text-[#52605A] leading-relaxed">
                    Thêm bài đăng mới, chỉnh sửa hình ảnh &amp; thông tin nhận
                    diện, đánh dấu đoàn tụ hoặc xóa bài viết.
                  </p>
                </div>

                {onOpenCreatePost && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreatePost();
                    }}
                    className="w-full sm:w-auto min-h-[42px] px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Đăng bài mới</span>
                  </button>
                )}
              </div>

              {mySpots.length === 0 ? (
                <div className="p-6 rounded-xl bg-white border border-[#DDDCD4] text-center space-y-3">
                  <p className="text-sm font-bold text-[#142820]">
                    {userSession
                      ? 'Bạn chưa đăng bài viết nào trên tài khoản này'
                      : 'Vui lòng đăng nhập để quản lý các bài viết của bạn'}
                  </p>
                  <p className="text-xs text-[#52605A] leading-relaxed">
                    Khi bạn đăng tin tìm thú lạc, cứu trợ hoặc nhận nuôi, bài
                    viết sẽ xuất hiện tại đây để bạn chỉnh sửa, cập nhật trạng
                    thái hoặc xóa bất cứ lúc nào.
                  </p>
                  {!userSession ? (
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="min-h-[42px] px-4 rounded-[10px] bg-[#AF421F] hover:bg-[#933516] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>Đăng nhập nhanh để bắt đầu</span>
                    </button>
                  ) : (
                    onOpenCreatePost && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreatePost();
                        }}
                        className="min-h-[42px] px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Đăng bài đầu tiên</span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                mySpots.map((sp) => {
                  const badge = getSpotBadgeMeta(sp);
                  const isConfirmingDelete = confirmDeleteId === sp.id;
                  return (
                    <div
                      key={sp.id}
                      className="p-3.5 rounded-xl bg-white border border-[#DDDCD4] space-y-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <img
                          src={sp.images[0]}
                          alt={sp.title}
                          className="w-16 h-16 rounded-[10px] object-cover shrink-0 bg-[#F1EFE8] border border-[#DDDCD4]"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
                              style={{
                                backgroundColor: badge.bgHex,
                                color: badge.textHex,
                              }}
                            >
                              {badge.uppercaseLabel}
                            </span>
                            {sp.isEmergencyBoosted && (
                              <span className="px-2 py-0.5 rounded bg-[#FFF0E5] text-[#AF421F] text-[10px] font-bold">
                                Khẩn cấp 48h
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#142820] line-clamp-1">
                            {sp.title}
                          </h4>
                          <p className="text-[11px] text-[#52605A] truncate">
                            {sp.formattedAddress || sp.areaLabel} • Quan tâm:{' '}
                            {sp.boostCount || 1} • Manh mối:{' '}
                            {sp.sightings?.length || 0}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-[#F1EFE8] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {onSelectSpotDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectSpotDetail(sp);
                              }}
                              className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold bg-[#FAF7F1] hover:bg-[#F1EFE8] text-[#142820] border border-[#DDDCD4] inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#0E513B]" />
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
                              className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold bg-[#E8EFE6] hover:bg-[#0E513B] text-[#0E513B] hover:text-white inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Sửa bài</span>
                            </button>
                          )}

                          {sp.spotType !== 'GREEN_PEACE' && (
                            <button
                              type="button"
                              onClick={() => onResolveSpotToPeace(sp.id)}
                              className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold bg-[#FAF7F1] hover:bg-[#E8EFE6] text-[#0E513B] border border-[#DDDCD4] inline-flex items-center gap-1.5 transition-colors"
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
                                className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold bg-[#FFF0E5] hover:bg-[#AF421F] text-[#AF421F] hover:text-white inline-flex items-center gap-1.5 transition-colors"
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
                                  className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold bg-[#AF421F] hover:bg-[#933516] text-white inline-flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xác nhận xóa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="min-h-[36px] px-2.5 rounded-[9px] text-xs font-semibold text-[#52605A] hover:bg-[#F1EFE8]"
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(sp.id)}
                                className="min-h-[36px] px-3 rounded-[9px] text-xs font-bold text-[#AF421F] bg-[#FFF0E5]/70 hover:bg-[#AF421F] hover:text-white border border-[#AF421F]/25 inline-flex items-center gap-1.5 transition-colors"
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
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
