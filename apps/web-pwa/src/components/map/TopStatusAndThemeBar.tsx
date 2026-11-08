'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Heart,
  LayoutList,
  LocateFixed,
  Map as MapIcon,
  Palette,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  EntityCategory,
  OriginFilter,
  RegionFilter,
  SpotType,
  ThemeId,
  UserSession,
  ViewMode,
} from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';

export type CategoryFilter = 'ALL' | EntityCategory;

interface TopStatusAndThemeBarProps {
  themeId: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  mapPinsCount: number;
  nearby500mCount: number;
  totalSpotsCount: number;
  savedGoogleMapsCount: number;
  activeFilter: SpotType | 'ALL';
  onChangeFilter: (filter: SpotType | 'ALL') => void;
  originFilter: OriginFilter;
  onChangeOriginFilter: (origin: OriginFilter) => void;
  regionFilter: RegionFilter;
  onChangeRegionFilter: (region: RegionFilter) => void;
  userSession: UserSession | null;
  userLocationLabel: string;
  isRealGps: boolean;
  isLocatingGps: boolean;
  onRequestRealGps: () => void;
  onOpenNearbySearchModal: () => void;
  onOpenCameraModal: () => void;
  onOpenProfileModal: () => void;
  onOpenGoogleMapsVault: () => void;
  showVetStations: boolean;
  onToggleVetStations: () => void;
  isCrawlingLive: boolean;
  onTriggerLiveCrawl: () => void;
  categoryFilter: CategoryFilter;
  onChangeCategoryFilter: (filter: CategoryFilter) => void;
}

const THEME_OPTIONS: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'morning_sun', label: 'Đốm Nhỏ', swatch: '#FAF7F2' },
  { id: 'pine_hill', label: 'Đồi Thông', swatch: '#ECF2EE' },
  { id: 'sunset', label: 'Hoàng Hôn', swatch: '#FCEEE9' },
  { id: 'twilight', label: 'Chạng Vạng', swatch: '#232730' },
];

export default function TopStatusAndThemeBar({
  themeId,
  onChangeTheme,
  viewMode,
  onChangeViewMode,
  mapPinsCount,
  nearby500mCount,
  totalSpotsCount,
  savedGoogleMapsCount: _savedGoogleMapsCount,
  activeFilter,
  onChangeFilter,
  originFilter,
  onChangeOriginFilter,
  regionFilter,
  onChangeRegionFilter,
  userSession,
  userLocationLabel,
  isRealGps: _isRealGps,
  isLocatingGps,
  onRequestRealGps,
  onOpenNearbySearchModal,
  onOpenCameraModal,
  onOpenProfileModal,
  onOpenGoogleMapsVault: _onOpenGoogleMapsVault,
  showVetStations,
  onToggleVetStations,
  isCrawlingLive,
  onTriggerLiveCrawl,
  categoryFilter,
  onChangeCategoryFilter,
}: TopStatusAndThemeBarProps) {
  const theme = DOM_THEMES[themeId];
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const hasActiveFilters =
    regionFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    activeFilter !== 'ALL' ||
    originFilter !== 'ALL' ||
    showVetStations;

  return (
    <header className="fixed top-2.5 inset-x-2.5 sm:top-3.5 sm:inset-x-5 z-40 pointer-events-none flex flex-col items-center">
      <div
        className="w-full max-w-5xl rounded-2xl sm:rounded-full shadow-lg backdrop-blur-2xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 border border-black/5 pointer-events-auto"
        style={{
          backgroundColor: theme.frostedBg,
          color: theme.textHex,
        }}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            aria-label="Đốm Nhỏ: về bản đồ chính"
            onClick={() => {
              onChangeViewMode('map');
              onChangeRegionFilter('ALL');
              onChangeFilter('ALL');
              onChangeCategoryFilter('ALL');
              onChangeOriginFilter('ALL');
            }}
            className="shrink-0 rounded-md transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src="/logo-dom-nho.png"
              alt=""
              width="44"
              height="44"
              className="h-10 sm:h-11 w-auto object-contain select-none"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(19, 62, 53, 0.15))',
              }}
            />
          </button>

          <div
            className="flex items-center p-0.5 rounded-full bg-black/[0.05] border border-black/5"
            style={{ minHeight: '36px' }}
          >
            <button
              type="button"
              onClick={() => onChangeViewMode('map')}
              className="h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all"
              style={{
                backgroundColor:
                  viewMode === 'map' ? '#133E35' : 'transparent',
                color: viewMode === 'map' ? '#FFFFFF' : theme.textHex,
              }}
              title="Xem bản đồ cứu hộ"
            >
              <MapIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Bản đồ</span>
              <span className="text-[10px] opacity-80 font-mono">
                {mapPinsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('list')}
              className="h-8 px-3 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all"
              style={{
                backgroundColor:
                  viewMode === 'list' ? '#133E35' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : theme.textHex,
              }}
              title="Xem danh sách bài viết"
            >
              <LayoutList className="w-3.5 h-3.5 shrink-0" />
              <span>Danh sách</span>
              <span className="text-[10px] opacity-80 font-mono">
                {totalSpotsCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenCameraModal}
            className="h-9 px-4 rounded-full shadow-md flex items-center gap-1.5 text-xs font-extrabold text-white transition-all"
            style={{
              backgroundColor: '#D2673B',
              boxShadow: '0 4px 14px -2px rgba(210, 103, 59, 0.45)',
            }}
            title="Đăng tin cứu hộ hoặc tìm thú cưng thất lạc"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Đăng tin</span>
          </motion.button>

          <button
            type="button"
            onClick={onOpenNearbySearchModal}
            className="h-9 px-3 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-bold bg-brand text-white transition-all active:scale-95"
            title="Xem các ca cứu hộ và tìm bé lạc gần bạn"
          >
            <Compass className="w-3.5 h-3.5 text-[#FAF7F2] shrink-0" />
            <span className="hidden sm:inline">Gần bạn</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
              {nearby500mCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="h-9 px-3 rounded-full shadow-sm flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95"
            style={{
              backgroundColor: hasActiveFilters ? '#133E35' : theme.pillBg,
              color: hasActiveFilters ? '#FFFFFF' : theme.textHex,
            }}
            title="Lọc bài viết theo khu vực & thể loại"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {regionFilter === 'ALL'
                ? 'Bộ lọc'
                : regionFilter === 'SOUTH'
                ? 'Miền Nam'
                : regionFilter === 'CENTRAL'
                ? 'Miền Trung'
                : 'Miền Bắc'}
            </span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#D2673B]" />
            )}
          </button>

          <button
            type="button"
            disabled={isCrawlingLive}
            onClick={onTriggerLiveCrawl}
            className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
            style={{
              backgroundColor: theme.pillBg,
              color: theme.textHex,
            }}
            title="Làm mới dữ liệu bài viết"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isCrawlingLive ? 'animate-spin text-[#D2673B]' : 'text-brand'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onRequestRealGps}
            className="hidden lg:flex h-9 px-2.5 rounded-full shadow-sm items-center gap-1 text-[11px] font-medium transition-all active:scale-95 max-w-[130px] truncate"
            style={{
              backgroundColor: theme.pillBg,
              color: theme.textHex,
            }}
            title="Lấy định vị GPS thực tế của bạn"
          >
            <LocateFixed
              className={`w-3.5 h-3.5 shrink-0 ${
                isLocatingGps ? 'animate-spin text-[#E63946]' : 'text-[#2A9D8F]'
              }`}
            />
            <span className="truncate">
              {isLocatingGps ? 'Đang định vị' : userLocationLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenProfileModal}
            className="h-9 px-2.5 rounded-full shadow-sm flex items-center gap-1 text-xs font-bold transition-all active:scale-95"
            style={{
              backgroundColor: theme.pillBg,
              color: theme.textHex,
            }}
            title="Hồ sơ tài khoản & Nhật ký kỷ niệm"
          >
            <Heart className="w-3.5 h-3.5 text-[#D2673B] fill-[#D2673B] shrink-0" />
            <span className="hidden md:inline max-w-[80px] truncate">
              {userSession ? userSession.displayName : 'Hồ sơ'}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setThemeMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full shadow-sm flex items-center justify-center transition-all active:scale-95"
              style={{
                backgroundColor: theme.pillBg,
                color: theme.textHex,
              }}
              title="Màu sắc giao diện"
            >
              <Palette className="w-3.5 h-3.5 opacity-80" />
            </button>

            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  className="absolute right-0 mt-2 p-2 rounded-2xl shadow-xl backdrop-blur-2xl w-44 flex flex-col gap-1 z-50 border border-black/5"
                  style={{
                    backgroundColor: theme.frostedSheetBg,
                    color: theme.textHex,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 px-2 py-0.5">
                    Màu sắc giao diện
                  </p>
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChangeTheme(opt.id);
                        setThemeMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor:
                          themeId === opt.id ? theme.accentSurface : 'transparent',
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{
                          backgroundColor: opt.swatch,
                          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                        }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filterModalOpen && (
          <div
            onClick={() => setFilterModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl p-5 shadow-2xl backdrop-blur-2xl border border-black/10 space-y-4"
              style={{
                backgroundColor: theme.frostedSheetBg,
                color: theme.textHex,
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-black/5">
                <h3 className="text-sm font-bold flex items-center gap-2 text-brand">
                  <SlidersHorizontal className="w-4 h-4" />
                  Bộ Lọc Dữ Liệu
                </h3>
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 text-brand"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-brand mb-2">
                  1. Chọn Khu Vực
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ALL' as RegionFilter, label: 'Toàn quốc' },
                    { id: 'SOUTH' as RegionFilter, label: 'Miền Nam' },
                    { id: 'CENTRAL' as RegionFilter, label: 'Miền Trung' },
                    { id: 'NORTH' as RegionFilter, label: 'Miền Bắc' },
                  ].map((r) => {
                    const active = regionFilter === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onChangeRegionFilter(r.id)}
                        className="py-2 px-3 rounded-2xl text-xs font-bold transition-all"
                        style={{
                          backgroundColor: active ? '#133E35' : theme.pillBg,
                          color: active ? '#FFFFFF' : theme.textHex,
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-brand mb-2">
                  2. Chọn Nhu Cầu Bài Viết
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Tất cả bài viết',
                      active:
                        categoryFilter === 'ALL' &&
                        activeFilter === 'ALL' &&
                        originFilter === 'ALL',
                      onClick: () => {
                        onChangeCategoryFilter('ALL');
                        onChangeFilter('ALL');
                        onChangeOriginFilter('ALL');
                      },
                    },
                    {
                      label: 'Cứu hộ khẩn cấp SOS',
                      active: activeFilter === 'RED_SOS',
                      onClick: () => {
                        onChangeCategoryFilter('INDIVIDUAL_PET');
                        onChangeFilter('RED_SOS');
                      },
                    },
                    {
                      label: 'Tìm thú cưng thất lạc',
                      active: activeFilter === 'ORANGE_SIGHT',
                      onClick: () => {
                        onChangeCategoryFilter('INDIVIDUAL_PET');
                        onChangeFilter('ORANGE_SIGHT');
                      },
                    },
                    {
                      label: 'Nhận nuôi & Foster',
                      active: activeFilter === 'YELLOW_ADOPT',
                      onClick: () => {
                        onChangeCategoryFilter('ALL');
                        onChangeFilter('YELLOW_ADOPT');
                      },
                    },
                    {
                      label: 'Trạm cứu hộ cố định',
                      active: categoryFilter === 'RESCUE_CENTER',
                      onClick: () => {
                        onChangeCategoryFilter('RESCUE_CENTER');
                        onChangeFilter('ALL');
                      },
                    },
                    {
                      label: 'Bài tự đăng trên Web',
                      active: originFilter === 'USER_POST',
                      onClick: () => {
                        onChangeOriginFilter('USER_POST');
                      },
                    },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={btn.onClick}
                      className="py-2.5 px-3 rounded-2xl text-xs font-semibold text-left transition-all"
                      style={{
                        backgroundColor: btn.active ? '#133E35' : theme.pillBg,
                        color: btn.active ? '#FFFFFF' : theme.textHex,
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-black/5">
                <button
                  type="button"
                  onClick={onToggleVetStations}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    backgroundColor: showVetStations ? '#0F766E' : theme.pillBg,
                    color: showVetStations ? '#FFFFFF' : theme.textHex,
                  }}
                >
                  {showVetStations
                    ? 'Đang bật Thú y 24/7'
                    : 'Bật Phòng khám Thú y 24/7'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChangeRegionFilter('ALL');
                      onChangeCategoryFilter('ALL');
                      onChangeFilter('ALL');
                      onChangeOriginFilter('ALL');
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ color: theme.mutedTextHex }}
                  >
                    Đặt lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterModalOpen(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-brand text-white"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
