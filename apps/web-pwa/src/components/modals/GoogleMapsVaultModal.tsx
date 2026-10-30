'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkCheck,
  Compass,
  Download,
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  Navigation,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  CrawlPlatform,
  DomSpot,
  PlatformFilter,
  SavedGoogleMapPlace,
  ThemeId,
  detectPlatformFromUrl,
  getPlatformBadgeMeta,
} from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';

interface GoogleMapsVaultModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  savedPlaces: SavedGoogleMapPlace[];
  spots: DomSpot[];
  userCoords: { lat: number; lng: number };
  isCrawlingLive?: boolean;
  onTriggerPlatformCrawl?: (platform: PlatformFilter) => Promise<void> | void;
  onClose: () => void;
  onFocusSpotOnWebMap: (spotId?: string, lat?: number, lng?: number) => void;
  onAddSyncedSpotAndPlace: (
    newSpot: DomSpot,
    newPlace: SavedGoogleMapPlace | null
  ) => void;
}

const CRAWL_CHANNEL_BUTTONS: {
  id: PlatformFilter;
  label: string;
  color: string;
}[] = [
  { id: 'ALL', label: 'Tất cả nguồn', color: '#133E35' },
  { id: 'FACEBOOK', label: 'Facebook', color: '#1877F2' },
  { id: 'INSTAGRAM', label: 'Instagram', color: '#E1306C' },
  { id: 'THREADS', label: 'Threads', color: '#2C2623' },
  { id: 'TIKTOK', label: 'TikTok', color: '#FE2C55' },
  { id: 'YOUTUBE', label: 'YouTube', color: '#FF0000' },
  { id: 'SOCIAL_MEDIA', label: 'Báo chí & Trạm', color: '#D2673B' },
];

export default function GoogleMapsVaultModal({
  isOpen,
  themeId,
  savedPlaces,
  userCoords,
  isCrawlingLive = false,
  onTriggerPlatformCrawl,
  onClose,
  onFocusSpotOnWebMap,
  onAddSyncedSpotAndPlace,
}: GoogleMapsVaultModalProps) {
  const theme = DOM_THEMES[themeId];
  const [inputUrl, setInputUrl] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeCrawlChannel, setActiveCrawlChannel] =
    useState<PlatformFilter | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<CrawlPlatform | 'ALL'>(
    'ALL'
  );

  if (!isOpen) return null;

  const filteredPlaces = savedPlaces.filter((p) => {
    if (filterPlatform === 'ALL') return true;
    const detected = detectPlatformFromUrl(p.sourceUrl, p.sourcePlatform);
    return detected === filterPlatform || p.sourcePlatform === filterPlatform;
  });

  const handleCrawlByPlatform = async (channel: PlatformFilter) => {
    if (!onTriggerPlatformCrawl || isCrawlingLive) return;
    setActiveCrawlChannel(channel);
    setStatusMsg(
      `Đang quét tự động các bài viết công khai từ ${
        channel === 'ALL' ? 'tất cả các nền tảng' : channel
      }...`
    );
    try {
      await onTriggerPlatformCrawl(channel);
      setStatusMsg(
        `✅ Đã hoàn tất quét và cập nhật dữ liệu thực tế từ ${
          channel === 'ALL' ? 'đa nền tảng' : channel
        }!`
      );
    } catch {
      setStatusMsg('⚠️ Không thể kết nối lúc này, vui lòng thử lại sau.');
    } finally {
      setActiveCrawlChannel(null);
    }
  };

  const handleCrawlAndLinkUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setSyncing(true);
    setStatusMsg(
      'Đang trích xuất ảnh gốc, nội dung & kiểm duyệt qua Gemini 2.5 Flash...'
    );
    try {
      const res = await fetch('/api/google-maps-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputUrl.trim(),
          note: inputNote.trim(),
          userLat: userCoords.lat,
          userLng: userCoords.lng,
        }),
      });
      const data = await res.json();
      if (data.ok && data.spot) {
        onAddSyncedSpotAndPlace(data.spot, data.savedPlace || null);
        setInputUrl('');
        setInputNote('');
        if (data.savedPlace) {
          setStatusMsg(
            `✅ Đã lưu địa điểm "${data.savedPlace.title}" (${data.savedPlace.address}) và ghim lên bản đồ!`
          );
        } else {
          setStatusMsg(
            `✅ Đã thêm bài viết "${data.spot.title}" vào Danh sách (Bài viết không nêu địa chỉ cụ thể nên không tự gán vị trí trên bản đồ).`
          );
        }
      } else {
        setStatusMsg(
          `⚠️ Không thể trích xuất: ${data.error || 'Vui lòng thử lại'}`
        );
      }
    } catch (err: any) {
      setStatusMsg(`⚠️ Lỗi kết nối: ${err?.message || 'Thử lại sau'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 270, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90dvh] rounded-[32px] shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="p-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  Thu Thập Tin Đa Nguồn & Kho Địa Điểm Google Maps
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold mt-2">
                Cập Nhật Từ Facebook, Instagram, Threads, TikTok & Báo Chí
              </h3>
              <p className="text-xs mt-0.5" style={{ color: theme.mutedTextHex }}>
                Quét tự động hoặc dán đường dẫn từ bất kỳ mạng xã hội nào — chỉ ghim lên Bản đồ khi có địa chỉ cụ thể, hoặc đưa vào Danh sách nếu chỉ có khu vực chung.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: theme.pillBg }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-5 overflow-y-auto no-scrollbar space-y-4">
            {onTriggerPlatformCrawl && (
              <div
                className="p-4 rounded-3xl space-y-2.5"
                style={{ backgroundColor: theme.frostedCardBg }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#2A9D8F] ${
                        isCrawlingLive ? 'animate-spin' : ''
                      }`}
                    />
                    1. Quét tự động tin mới theo từng nền tảng:
                  </p>
                  {isCrawlingLive && (
                    <span className="text-[11px] font-bold text-[#2A9D8F]">
                      Đang quét & lọc qua Gemini 2.5 Flash...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {CRAWL_CHANNEL_BUTTONS.map((btn) => {
                    const isRunning =
                      isCrawlingLive && activeCrawlChannel === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        disabled={isCrawlingLive}
                        onClick={() => handleCrawlByPlatform(btn.id)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60"
                        style={{ backgroundColor: btn.color }}
                      >
                        {isRunning && (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        )}
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form
              onSubmit={handleCrawlAndLinkUrl}
              className="p-4 rounded-3xl space-y-3"
              style={{ backgroundColor: theme.frostedCardBg }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#E63946]" />
                  2. Dán link bài đăng Facebook, Instagram, Threads, TikTok, YouTube hoặc Google Maps:
                </p>
              </div>

              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Dán link: facebook.com/..., instagram.com/p/..., threads.net/@..., tiktok.com/@.../video/..., google.com/maps/..."
                className="w-full rounded-2xl px-3.5 py-2.5 text-xs outline-none"
                style={{
                  backgroundColor: theme.pillBg,
                  color: theme.textHex,
                }}
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Ghi chú thêm nếu muốn (không bắt buộc)..."
                  className="flex-1 rounded-2xl px-3.5 py-2.5 text-xs outline-none"
                  style={{
                    backgroundColor: theme.pillBg,
                    color: theme.textHex,
                  }}
                />
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#2A9D8F] flex items-center justify-center gap-1.5 shadow-md shrink-0 active:scale-95 transition-transform"
                >
                  {syncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  {syncing ? 'Đang trích xuất...' : 'Kiểm Duyệt & Thêm Vào Web'}
                </button>
              </div>

              {statusMsg && (
                <p className="text-xs font-semibold text-[#2A9D8F] pt-1">
                  {statusMsg}
                </p>
              )}
            </form>

            <div
              className="p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-2"
              style={{ backgroundColor: 'rgba(42, 157, 143, 0.12)' }}
            >
              <div className="text-xs">
                <p className="font-bold text-[#2A9D8F]">
                  🗺️ Đồng Bộ Toàn Bộ {savedPlaces.length} Địa Điểm Có Tọa Độ Cụ Thể Lên Google My Maps
                </p>
                <p style={{ color: theme.mutedTextHex }}>
                  Tải file KML chuẩn Google Earth/Maps hoặc mở trực tiếp Google My Maps để lưu vào tài khoản Google của bạn.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/google-maps-sync?format=kml"
                  download="dom-nho-google-maps.kml"
                  className="px-3.5 py-2 rounded-full text-xs font-bold text-white bg-[#2A9D8F] flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải File .KML Google Maps
                </a>
                <a
                  href="https://www.google.com/maps/d/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-full text-xs font-bold bg-white text-[#2C2623] shadow flex items-center gap-1"
                >
                  Mở Google My Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `Tất cả (${savedPlaces.length})` },
                { id: 'FACEBOOK', label: 'Facebook' },
                { id: 'INSTAGRAM', label: 'Instagram' },
                { id: 'THREADS', label: 'Threads' },
                { id: 'TIKTOK', label: 'TikTok' },
                { id: 'RESCUE_PORTAL', label: 'Trạm Cứu Hộ' },
                { id: 'SOCIAL_MEDIA', label: 'Báo chí' },
                { id: 'GOOGLE_MAPS', label: 'Google Maps' },
              ].map((tab) => {
                const active = filterPlatform === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterPlatform(tab.id as any)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={{
                      backgroundColor: active ? theme.textHex : theme.pillBg,
                      color: active ? theme.bgHex : theme.textHex,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {filteredPlaces.map((place) => {
                const badge = getPlatformBadgeMeta(
                  place.sourcePlatform,
                  place.sourceUrl
                );

                return (
                  <div
                    key={place.id}
                    className="p-3.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    style={{ backgroundColor: theme.frostedCardBg }}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: badge.bgRgba,
                            color: badge.colorHex,
                          }}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[11px] opacity-70 font-mono">
                          GPS: {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold truncate">
                        {place.title}
                      </h4>
                      <p
                        className="text-xs flex items-center gap-1"
                        style={{ color: theme.mutedTextHex }}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#E63946] shrink-0" />
                        <span className="truncate">{place.address}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          onFocusSpotOnWebMap(
                            place.spotId,
                            place.lat,
                            place.lng
                          );
                          onClose();
                        }}
                        className="px-3 py-2 rounded-full text-xs font-bold bg-[#E07A5F]/15 text-[#E07A5F] flex items-center gap-1 hover:bg-[#E07A5F] hover:text-white transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Định vị trên Web
                      </button>

                      <a
                        href={place.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-full text-xs font-bold bg-[#2A9D8F] text-white flex items-center gap-1 shadow-sm"
                        title="Mở địa điểm này trên Google Maps để Lưu (Save) hoặc Chỉ đường"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Lưu trên Google Maps
                      </a>

                      {place.sourceUrl &&
                        place.sourceUrl !== place.googleMapsUrl && (
                          <a
                            href={place.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1"
                            style={{
                              backgroundColor: theme.pillBg,
                              color: theme.textHex,
                            }}
                            title="Mở bài viết gốc"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Nguồn
                          </a>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
