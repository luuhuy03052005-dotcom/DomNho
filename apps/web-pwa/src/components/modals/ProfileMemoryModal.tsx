'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarHeart,
  Camera,
  CheckCircle2,
  Flame,
  Footprints,
  QrCode,
  Users,
  X,
} from 'lucide-react';
import { DomSpot, MemorySnap, ThemeId, UserSession } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
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
}

export default function ProfileMemoryModal({
  isOpen,
  themeId,
  userSession,
  spots,
  memorySnaps,
  patrolModeActive,
  onTogglePatrolMode,
  onClose,
  onRequireAuth,
  onResolveSpotToPeace,
  onAddWeeklyMemorySnap,
  onActivateEmergencyBoost,
  onLinkPartnerName,
}: ProfileMemoryModalProps) {
  const theme = DOM_THEMES[themeId];
  const [activeTab, setActiveTab] = useState<'MEMORY_PACT' | 'MY_SPOTS' | 'COUPLE_PATROL'>(
    'MEMORY_PACT'
  );
  const [showAddSnapForm, setShowAddSnapForm] = useState(false);
  const [petName, setPetName] = useState('');
  const [caption, setCaption] = useState('');
  const [moodTag] = useState('Bình yên & Quấn chủ');
  const [weightKg, setWeightKg] = useState('');
  const [snapPhotoUrl, setSnapPhotoUrl] = useState('');
  const [partnerInput, setPartnerInput] = useState('');

  if (!isOpen) return null;

  const mySpots = spots.filter(
    (s) => !!userSession && s.authorId === userSession.id
  );

  const handleSnapPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToWebpClient(file, 960, 0.8);
      setSnapPhotoUrl(compressed.dataUrl);
    } catch {
      // ignore
    }
  };

  const handleSubmitSnap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || !snapPhotoUrl) return;
    const w = parseFloat(weightKg);
    onAddWeeklyMemorySnap({
      petName: petName.trim() || 'Bé cưng',
      caption: caption.trim(),
      moodTag,
      weightKg: Number.isFinite(w) && w > 0 ? w : undefined,
      imageUrl: snapPhotoUrl,
    });
    setCaption('');
    setSnapPhotoUrl('');
    setShowAddSnapForm(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 270, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl max-h-[88dvh] rounded-[32px] shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="p-5 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #2A9D8F 0%, #E07A5F 100%)',
                }}
              >
                {userSession ? userSession.displayName.charAt(0).toUpperCase() : 'Đ'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold">
                    {userSession
                      ? userSession.partnerName
                        ? `${userSession.displayName} & ${userSession.partnerName}`
                        : userSession.displayName
                      : 'Khách Đi Dạo • Chế Độ Xem Tự Do'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F]">
                    {userSession ? 'Tài khoản đã xác thực' : 'Chưa định danh'}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: theme.mutedTextHex }}>
                  {userSession
                    ? `SĐT bảo mật: ${userSession.maskedPhone} • Mã phòng đôi: ${userSession.coupleRoomCode}`
                    : 'Chạm tạo biệt danh 3 giây để lưu bài tự đăng và Bản đồ Kỷ niệm'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!userSession && (
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="px-3.5 py-2 rounded-full text-xs font-bold text-white bg-[#E07A5F]"
                >
                  Định danh 3 giây
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.pillBg }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-5 flex items-center gap-2 flex-wrap">
            {[
              { id: 'MY_SPOTS', label: `Bài tự đăng của tôi (${mySpots.length})` },
              { id: 'MEMORY_PACT', label: 'Chạm Ảnh Mỗi Tuần' },
              { id: 'COUPLE_PATROL', label: 'Đi Dạo Cùng Nhau' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: active ? theme.textHex : theme.pillBg,
                    color: active ? theme.bgHex : theme.textHex,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
            {activeTab === 'MEMORY_PACT' && (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-3xl flex items-center justify-between gap-3"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <div>
                    <p className="text-xs font-bold text-[#2A9D8F] flex items-center gap-1.5">
                      <CalendarHeart className="w-4 h-4" />
                      Cam Kết Kỷ Niệm • Chạm Ảnh Mỗi Tuần
                    </p>
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: theme.mutedTextHex }}
                    >
                      Mỗi tuần chụp 1 bức ảnh cập nhật sau khi nhận nuôi: vừa gửi báo tin bình an cho người cứu hộ cũ, vừa ghép thành Nhật ký trưởng thành.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSnapForm((v) => !v)}
                    className="px-4 py-2.5 rounded-full text-xs font-bold text-white bg-[#2A9D8F] shrink-0 flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Chạm ảnh tuần mới
                  </button>
                </div>

                {showAddSnapForm && (
                  <form
                    onSubmit={handleSubmitSnap}
                    className="p-4 rounded-3xl space-y-3"
                    style={{ backgroundColor: theme.frostedCardBg }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        placeholder="Tên bé (VD: Bé Muối)"
                        className="rounded-2xl px-3 py-2 text-xs outline-none"
                        style={{
                          backgroundColor: theme.pillBg,
                          color: theme.textHex,
                        }}
                      />
                      <input
                        type="text"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="Cân nặng (kg)"
                        className="rounded-2xl px-3 py-2 text-xs outline-none"
                        style={{
                          backgroundColor: theme.pillBg,
                          color: theme.textHex,
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Khoảnh khắc đáng nhớ tuần này của bé..."
                      className="w-full rounded-2xl px-3 py-2.5 text-xs outline-none"
                      style={{
                        backgroundColor: theme.pillBg,
                        color: theme.textHex,
                      }}
                    />
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        {snapPhotoUrl ? 'Đã chọn ảnh tuần này' : 'Chọn ảnh thật của bé (bắt buộc)'}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleSnapPhotoChange}
                          className="hidden"
                        />
                      </label>
                      {snapPhotoUrl && (
                        <img
                          src={snapPhotoUrl}
                          alt="Ảnh kỷ niệm tuần này"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSnapForm(false)}
                        className="px-3 py-1.5 rounded-full text-xs"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={!snapPhotoUrl}
                        className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#2A9D8F] disabled:opacity-50"
                      >
                        Lưu Kỷ Niệm
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {memorySnaps.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-3xl flex gap-3.5 items-center"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <img
                        src={snap.imageUrl}
                        alt={snap.petName}
                        className="w-20 h-20 rounded-2xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F]">
                            Tuần thứ {snap.weekNumber} • {snap.petName}
                            {snap.weightKg ? ` (${snap.weightKg}kg)` : ''}
                          </span>
                          <span className="text-[10px] opacity-65">
                            {snap.createdAt}
                          </span>
                        </div>
                        <p className="text-xs font-medium mt-1.5 leading-relaxed">
                          “{snap.caption}”
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] opacity-75">
                          <span>📍 {snap.areaLabel}</span>
                          {snap.sentToRescuer && snap.rescuerName && (
                            <span className="text-[#2A9D8F] font-semibold">
                              ✓ Đã gửi cho {snap.rescuerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {memorySnaps.length === 0 && (
                    <p className="text-xs italic py-2" style={{ color: theme.mutedTextHex }}>
                      Chưa có kỷ niệm nào. Bấm “Chạm ảnh tuần mới” và chọn ảnh thật của bé để bắt đầu nhật ký.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'COUPLE_PATROL' && (
              <div className="space-y-4">
                <div
                  className="p-4 rounded-3xl flex items-center justify-between gap-3"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center justify-center shrink-0">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">
                        Chế độ Đi Dạo Cùng Nhau (Radar 500m)
                      </p>
                      <p
                        className="text-xs mt-0.5 leading-relaxed"
                        style={{ color: theme.mutedTextHex }}
                      >
                        Khi đi dạo phố trong bán kính 500m của một Đốm Đỏ, hệ thống gửi thông báo để hai bạn cùng để mắt tìm phụ.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onTogglePatrolMode}
                    className="px-4 py-2 rounded-full text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: patrolModeActive ? '#2A9D8F' : theme.pillBg,
                      color: patrolModeActive ? '#FFFFFF' : theme.textHex,
                    }}
                  >
                    {patrolModeActive ? 'Đang Bật' : 'Đang Tắt'}
                  </button>
                </div>

                <div
                  className="p-4 rounded-3xl space-y-3"
                  style={{ backgroundColor: theme.frostedCardBg }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#E07A5F]" />
                        Không Gian Kỷ Niệm Cặp Đôi
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: theme.mutedTextHex }}
                      >
                        Cùng người thương chia sẻ các Đốm Xanh kỷ niệm và hành trình cứu hộ.
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-2xl text-xs font-bold bg-[#E07A5F]/15 text-[#E07A5F] flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      {userSession?.coupleRoomCode || 'DN-LOVE'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={partnerInput}
                      onChange={(e) => setPartnerInput(e.target.value)}
                      placeholder="Nhập tên người thương / bạn đồng hành (VD: Minh Khôi)..."
                      className="flex-1 rounded-2xl px-3.5 py-2.5 text-xs outline-none"
                      style={{
                        backgroundColor: theme.pillBg,
                        color: theme.textHex,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (partnerInput.trim()) {
                          onLinkPartnerName(partnerInput.trim());
                          setPartnerInput('');
                        }
                      }}
                      className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#E07A5F]"
                    >
                      Ghép Đôi Bản Đồ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'MY_SPOTS' && (
              <div className="space-y-3">
                {mySpots.length === 0 ? (
                  <p className="text-xs italic py-2" style={{ color: theme.mutedTextHex }}>
                    Bạn chưa đăng bài nào trên Web. Hãy bấm nút “+ Đăng bài” trên thanh công cụ để đăng tin cứu hộ hoặc nhận nuôi.
                  </p>
                ) : (
                  mySpots.map((spot) => (
                    <div
                      key={spot.id}
                      className="p-3.5 rounded-3xl flex items-center justify-between gap-3"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={spot.images[0]}
                          alt={spot.title}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{spot.title}</p>
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: theme.mutedTextHex }}
                          >
                            {spot.areaLabel} • Độ sáng: {spot.lightPower}%
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {spot.spotType !== 'GREEN_PEACE' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onResolveSpotToPeace(spot.id)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2A9D8F] text-white flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Đã tìm thấy / Chuyển Đốm Xanh
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onActivateEmergencyBoost(spot.id)}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E63946]/15 text-[#E63946] flex items-center gap-1"
                                >
                                  <Flame className="w-3 h-3" />
                                  Truyền Lửa Khẩn Cấp 5km
                                </button>
                              </>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F]">
                                🌿 Đốm Xanh Bình Yên • Đã lưu kỷ niệm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
