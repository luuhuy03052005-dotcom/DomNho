'use client';

import React, { useState } from 'react';
import {
  Bookmark,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Home,
  LifeBuoy,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import ImageLightboxModal from '@/components/modals/ImageLightboxModal';
import {
  DomSpot,
  getFriendlySourceName,
  getSpotBadgeMeta,
  isUserWebPost,
} from '@/lib/types';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=800&q=80';

interface PetCardProps {
  spot: DomSpot;
  userCoords: { lat: number; lng: number };
  onSelectDetail: (spot: DomSpot) => void;
  onToggleSave: (spot: DomSpot) => void;
  isSaved?: boolean;
  isAuthor?: boolean;
  onEditSpot?: (spot: DomSpot) => void;
  onDeleteSpot?: (spotId: string) => void;
  matchInfo?: {
    matchPercent: number;
    matchReasons: string[];
  };
}

function PawBadgeIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="7.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="5.5" r="2.2" fill="currentColor" />
      <circle cx="17" cy="7.5" r="2.2" fill="currentColor" />
      <path
        d="M7.2 16C6.4 12.8 9 10.8 12 10.8C15 10.8 17.6 12.8 16.8 16C16.2 18.2 14.3 19.6 12 19.6C9.7 19.6 7.8 18.2 7.2 16Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PetCard({
  spot,
  userCoords,
  onSelectDetail,
  onToggleSave,
  isSaved = false,
  isAuthor = false,
  onEditSpot,
  onDeleteSpot,
  matchInfo,
}: PetCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasMapPin = isSpotPinAllowedOnMap(spot);
  const isUserPost = isUserWebPost(spot);

  const distMeters = hasMapPin
    ? calculateDistanceMeters(
        userCoords.lat,
        userCoords.lng,
        spot.publicLat,
        spot.publicLng
      )
    : null;

  const badgeMeta = getSpotBadgeMeta(spot);

  const sourceName = isUserPost
    ? 'Tin cộng đồng'
    : getFriendlySourceName(
        spot.verificationInfo?.sourceDomain,
        spot.authorName,
        spot.sourceUrl
      );

  const timeOrDateLabel = (() => {
    if (isUserPost) {
      if (typeof spot.hoursAgo === 'number') {
        if (spot.hoursAgo <= 0) return 'Cập nhật vừa xong';
        if (spot.hoursAgo < 24) return `Cập nhật ${spot.hoursAgo} giờ trước`;
      }
    }
    if (spot.publishedDate) {
      const d = new Date(spot.publishedDate);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        });
      }
    }
    return 'Cập nhật gần đây';
  })();

  const locationDisplay =
    spot.areaLabel || spot.formattedAddress || 'Chưa rõ khu vực';

  const imageUrl =
    !imgError && spot.images && spot.images[0]
      ? spot.images[0]
      : FALLBACK_PET_IMAGE;

  const photoCount = Array.isArray(spot.images) ? spot.images.length : 1;

  const badgeStyle = !isUserPost
    ? {
        bg: '#EEF0EC',
        text: '#394640',
        label: 'TIN TỔNG HỢP',
      }
    : badgeMeta.categoryKind === 'RESCUE'
    ? {
        bg: '#FFF0E8',
        text: '#A83D20',
        label: 'CỨU TRỢ',
      }
    : badgeMeta.categoryKind === 'LOST'
    ? {
        bg: '#FFF0BF',
        text: '#775000',
        label: 'THÚ LẠC',
      }
    : {
        bg: '#E9F2E2',
        text: '#275B3A',
        label: 'NHẬN NUÔI',
      };

  const primaryCtaLabel =
    badgeMeta.categoryKind === 'ADOPT' && isUserPost
      ? 'Xem thông tin nhận nuôi'
      : 'Xem chi tiết';

  return (
    <>
      <article
        className={`shrink-0 h-auto min-w-0 bg-white rounded-[12px] border p-3.5 sm:p-4 flex flex-col gap-3 transition-colors shadow-[0_2px_10px_rgba(21,37,31,0.04)] ${
          matchInfo
            ? 'border-[#123F35] ring-1 ring-[#123F35]/20'
            : 'border-[#DDE2DC] hover:border-[#123F35]/50'
        }`}
      >
        {matchInfo && matchInfo.matchReasons.length > 0 && (
          <div className="px-2.5 py-1.5 rounded-[8px] bg-[#E4EDDD] text-[12px] font-bold text-[#123F35] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Trùng khớp {matchInfo.matchPercent}% ·{' '}
              {matchInfo.matchReasons.join(' · ')}
            </span>
          </div>
        )}

        <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative w-[96px] h-[96px] sm:w-[144px] sm:h-[144px] shrink-0 bg-[#F5F6F2] rounded-[10px] overflow-hidden cursor-zoom-in border border-[#DDE2DC] group"
            title="Bấm vào ảnh để phóng to xem rõ hơn"
          >
            <img
              src={imageUrl}
              alt={spot.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />

            {isAuthor && (
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-[#123F35]/90 text-white text-[10px] font-bold">
                Của bạn
              </span>
            )}

            {photoCount > 1 && (
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold flex items-center gap-1">
                <Camera className="w-3 h-3 shrink-0" />
                <span>{photoCount}</span>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] font-extrabold text-[11px] uppercase tracking-wide shrink-0"
                  style={{
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.text,
                  }}
                >
                  {!isUserPost ? (
                    <FileText className="w-3 h-3 shrink-0" />
                  ) : badgeMeta.categoryKind === 'RESCUE' ? (
                    <LifeBuoy className="w-3 h-3 shrink-0" />
                  ) : badgeMeta.categoryKind === 'LOST' ? (
                    <PawBadgeIcon className="w-3 h-3 shrink-0" />
                  ) : (
                    <Home className="w-3 h-3 shrink-0" />
                  )}
                  <span>{badgeStyle.label}</span>
                </span>

                {isUserPost && (
                  <span className="hidden sm:inline text-[13px] font-medium text-[#52605A]">
                    · Tin cộng đồng
                  </span>
                )}
              </div>

              <h3
                onClick={() => onSelectDetail(spot)}
                className="text-[17px] sm:text-[19px] font-extrabold text-[#15251F] hover:text-[#123F35] cursor-pointer leading-snug line-clamp-2 break-words"
              >
                {spot.title}
              </h3>

              <div className="space-y-0.5 text-[13px] text-[#52605A]">
                {isUserPost ? (
                  <>
                    <p className="flex items-center gap-1.5 flex-wrap leading-snug">
                      <span className="sm:hidden inline-flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-[#52605A] shrink-0" />
                        <span>Tin cộng đồng ·</span>
                      </span>
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#123F35] shrink-0 hidden sm:inline" />
                        <span className="truncate font-medium text-[#15251F]/85">
                          {locationDisplay}
                        </span>
                      </span>
                      <span className="hidden sm:inline text-[#52605A]">
                        · {timeOrDateLabel}
                      </span>
                      {distMeters !== null && (
                        <span className="text-[#123F35] font-semibold">
                          · {formatDistanceVi(distMeters)}
                        </span>
                      )}
                    </p>
                    <p className="sm:hidden flex items-center gap-1 text-[12px] text-[#52605A]">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{timeOrDateLabel}</span>
                    </p>
                  </>
                ) : (
                  <p className="flex items-center gap-1.5 flex-wrap leading-snug">
                    <span className="font-medium text-[#52605A]">
                      Nguồn: <strong className="text-[#15251F]">{sourceName}</strong>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#123F35] shrink-0" />
                      <span className="truncate">{locationDisplay}</span>
                    </span>
                  </p>
                )}
              </div>

              <p className="hidden sm:block text-[14px] text-[#15251F]/85 leading-relaxed line-clamp-2 break-words pt-0.5">
                {spot.story}
              </p>
            </div>

            {/* Desktop Action Bar inside right column */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-2">
              {!isUserPost && spot.sourceUrl ? (
                <>
                  <a
                    href={spot.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="min-h-[42px] px-4 rounded-[10px] bg-[#123F35] hover:bg-[#0C3028] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Đọc bài gốc</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onSelectDetail(spot)}
                    className="min-h-[42px] px-3.5 rounded-[10px] bg-white hover:bg-[#F5F6F2] border border-[#DDE2DC] text-[#15251F] text-[13px] font-bold inline-flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Xem chi tiết</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectDetail(spot)}
                  className="min-h-[42px] px-5 rounded-[10px] bg-[#123F35] hover:bg-[#0C3028] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1 transition-colors"
                >
                  <span>{primaryCtaLabel}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(spot);
                }}
                aria-pressed={isSaved}
                aria-label={
                  isSaved
                    ? `Bỏ lưu bài viết ${spot.title}`
                    : `Lưu bài viết ${spot.title}`
                }
                className={`min-h-[42px] px-3.5 rounded-[10px] border text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                  isSaved
                    ? 'bg-[#E4EDDD] text-[#123F35] border-[#123F35]'
                    : 'bg-white text-[#15251F] border-[#DDE2DC] hover:border-[#123F35]'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 shrink-0 ${
                    isSaved ? 'fill-[#123F35] text-[#123F35]' : ''
                  }`}
                />
                <span>{isSaved ? 'Đã lưu' : 'Lưu tin'}</span>
              </button>

              {isAuthor && onEditSpot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSpot(spot);
                  }}
                  className="min-h-[42px] px-3 rounded-[10px] border border-[#DDE2DC] bg-[#F5F6F2] hover:bg-[#E4EDDD] text-[#123F35] text-xs font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span>Sửa</span>
                </button>
              )}

              {isAuthor &&
                onDeleteSpot &&
                (confirmDelete ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(false);
                        onDeleteSpot(spot.id);
                      }}
                      className="min-h-[42px] px-3 rounded-[10px] bg-[#A83D20] text-white text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Xóa?</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(false);
                      }}
                      className="min-h-[42px] px-2.5 rounded-[10px] border border-[#DDE2DC] bg-white text-xs font-semibold text-[#52605A]"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(true);
                    }}
                    title="Xóa bài đăng này"
                    aria-label={`Xóa bài đăng ${spot.title}`}
                    className="min-h-[42px] min-w-[42px] rounded-[10px] border border-[#DDE2DC] bg-white hover:bg-[#FFF0E8] text-[#A83D20] inline-flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Mobile Action Bar below thumbnail + text row (matches 01 · KHÁM PHÁ in mobile-explore-detail.png) */}
        <div className="flex sm:hidden items-center gap-2 pt-1">
          {!isUserPost && spot.sourceUrl ? (
            <a
              href={spot.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-h-[44px] px-4 rounded-[10px] bg-white hover:bg-[#F5F6F2] border border-[#123F35] text-[#15251F] text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Đọc bài gốc</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onSelectDetail(spot)}
              className="flex-1 min-h-[44px] px-4 rounded-[10px] bg-[#123F35] hover:bg-[#0C3028] text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{primaryCtaLabel}</span>
            </button>
          )}

          {isAuthor && onEditSpot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditSpot(spot);
              }}
              aria-label={`Chỉnh sửa bài viết ${spot.title}`}
              className="min-w-[44px] min-h-[44px] rounded-[10px] border border-[#DDE2DC] bg-[#F5F6F2] text-[#123F35] flex items-center justify-center shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {isAuthor && onDeleteSpot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirmDelete) {
                  setConfirmDelete(false);
                  onDeleteSpot(spot.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              aria-label={`Xóa bài viết ${spot.title}`}
              className={`min-w-[44px] min-h-[44px] px-2 rounded-[10px] border flex items-center justify-center shrink-0 text-xs font-bold ${
                confirmDelete
                  ? 'bg-[#A83D20] text-white border-[#A83D20]'
                  : 'bg-white text-[#A83D20] border-[#DDE2DC]'
              }`}
            >
              {confirmDelete ? 'Xóa?' : <Trash2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(spot);
            }}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Bỏ lưu bài viết ${spot.title}`
                : `Lưu bài viết ${spot.title}`
            }
            className={`min-w-[44px] min-h-[44px] rounded-[10px] border flex items-center justify-center transition-colors shrink-0 ${
              isSaved
                ? 'bg-[#E4EDDD] text-[#123F35] border-[#123F35]'
                : 'bg-white text-[#15251F] border-[#DDE2DC]'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${
                isSaved ? 'fill-[#123F35] text-[#123F35]' : ''
              }`}
            />
          </button>
        </div>
      </article>

      <ImageLightboxModal
        images={spot.images}
        initialIndex={0}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={spot.title}
      />
    </>
  );
}
