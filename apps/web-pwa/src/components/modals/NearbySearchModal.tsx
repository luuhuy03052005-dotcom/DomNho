'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  ExternalLink,
  Globe,
  LocateFixed,
  MapPin,
  MapPinOff,
  Navigation,
  PenTool,
  Radar,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  DomSpot,
  EntityCategory,
  SpotType,
  ThemeId,
  VetStation,
  getFriendlySourceName,
  isUserWebPost,
} from '@/lib/types';
import { DOM_THEMES, SPOT_LEXICON } from '@/lib/themes';
import { calculateDistanceMeters, formatDistanceVi } from '@/lib/security';
import { GeolocationState } from '@/hooks/useGeolocation';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface NearbySearchModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  spots: DomSpot[];
  vetStations: VetStation[];
  userCoords: GeolocationState;
  isLocatingGps: boolean;
  gpsError: string | null;
  searchRadiusMeters: number;
  onChangeSearchRadius: (radiusMeters: number) => void;
  onRequestRealGps: () => void;
  onSelectCustomLocation: (lat: number, lng: number, label: string) => void;
  onSelectSpotOnMap: (spot: DomSpot) => void;
  onFocusCoordsOnMap: (lat: number, lng: number, label: string) => void;
  onClose: () => void;
}

const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1 km' },
  { value: 3000, label: '3 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
  { value: 2000000, label: 'Toàn quốc' },
];

export default function NearbySearchModal({
  isOpen,
  themeId,
  spots,
  vetStations,
  userCoords,
  isLocatingGps,
  gpsError,
  searchRadiusMeters,
  onChangeSearchRadius,
  onRequestRealGps,
  onSelectCustomLocation,
  onSelectSpotOnMap,
  onFocusCoordsOnMap,
  onClose,
}: NearbySearchModalProps) {
  const theme = DOM_THEMES[themeId];
  const [keyword, setKeyword] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [addressCandidates, setAddressCandidates] = useState<
    { id: string; address: string; lat: number; lng: number }[]
  >([]);
  const [speciesFilter, setSpeciesFilter] = useState<
    'ALL' | 'dog' | 'cat' | 'VET'
  >('ALL');
  const [spotTypeFilter, setSpotTypeFilter] = useState<SpotType | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EntityCategory>('ALL');

  const spotsWithDistance = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return spots
      .map((s) => {
        const hasPin = isSpotPinAllowedOnMap(s);
        const distanceMeters = hasPin
          ? calculateDistanceMeters(
              userCoords.lat,
              userCoords.lng,
              s.publicLat,
              s.publicLng
            )
          : null;
        return { spot: s, hasPin, distanceMeters };
      })
      .filter(({ spot, hasPin, distanceMeters }) => {
        if (hasPin && distanceMeters !== null) {
          if (distanceMeters > searchRadiusMeters) return false;
        } else {
          if (searchRadiusMeters < 2000000 && !q) return false;
        }
        if (speciesFilter === 'dog' && spot.species !== 'dog') {
          return false;
        }
        if (speciesFilter === 'cat' && spot.species !== 'cat') {
          return false;
        }
        const category = spot.entityCategory || 'INDIVIDUAL_PET';
        if (categoryFilter !== 'ALL' && category !== categoryFilter) {
          return false;
        }
        if (
          spotTypeFilter !== 'ALL' &&
          category !== 'RESCUE_CENTER' &&
          spot.spotType !== spotTypeFilter
        ) {
          return false;
        }
        if (q) {
          const hay = [
            spot.title,
            spot.story,
            spot.breed,
            spot.coatColor,
            spot.areaLabel,
            spot.formattedAddress,
            spot.authorName,
            ...(spot.traits || []),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = a.distanceMeters ?? 9_999_999;
        const db = b.distanceMeters ?? 9_999_999;
        return da - db;
      });
  }, [
    spots,
    userCoords.lat,
    userCoords.lng,
    searchRadiusMeters,
    speciesFilter,
    spotTypeFilter,
    categoryFilter,
    keyword,
  ]);

  const vetsWithDistance = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return vetStations
      .map((v) => {
        const distanceMeters = calculateDistanceMeters(
          userCoords.lat,
          userCoords.lng,
          v.lat,
          v.lng
        );
        return { vet: v, distanceMeters };
      })
      .filter(({ vet, distanceMeters }) => {
        if (distanceMeters > searchRadiusMeters) return false;
        if (q) {
          const hay = `${vet.name} ${vet.address} ${vet.rescueDiscount}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [vetStations, userCoords.lat, userCoords.lng, searchRadiusMeters, keyword]);

  if (!isOpen) return null;

  const handleSearchAddressLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim()) return;
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(addressQuery.trim())}`
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.results)) {
        setAddressCandidates(data.results);
      }
    } catch {
      setAddressCandidates([]);
    } finally {
      setSearchingAddress(false);
    }
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
          initial={{ scale: 0.93, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.93, y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[91dvh] rounded-[32px] shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="p-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E63946]/15 text-[#E63946] flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5" />
                  Định Vị Người Dùng & Tìm Kiếm Gần Bạn
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đã xác minh địa điểm thực tế
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold mt-2">
                Tìm Kiếm Đốm Cứu Hộ & Thú Y 24/7 Quanh Vị Trí Của Bạn
              </h3>
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
            <div
              className="p-4 rounded-3xl space-y-3"
              style={{ backgroundColor: theme.frostedCardBg }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="w-9 h-9 rounded-2xl bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold">
                        Vị trí hiện tại của bạn:
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: userCoords.isRealGps
                            ? 'rgba(42, 157, 143, 0.16)'
                            : 'rgba(224, 122, 95, 0.16)',
                          color: userCoords.isRealGps ? '#2A9D8F' : '#E07A5F',
                        }}
                      >
                        {userCoords.isRealGps
                          ? `✓ Đã xác định vị trí (±${userCoords.accuracyMeters}m)`
                          : 'Tọa độ trung tâm mặc định'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold truncate mt-0.5">
                      {userCoords.label}
                    </p>
                    <p
                      className="text-[11px] font-mono"
                      style={{ color: theme.mutedTextHex }}
                    >
                      GPS: {userCoords.lat.toFixed(5)},{' '}
                      {userCoords.lng.toFixed(5)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLocatingGps}
                  onClick={onRequestRealGps}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#2A9D8F] flex items-center justify-center gap-1.5 shadow-md shrink-0 active:scale-95 transition-transform"
                >
                  <LocateFixed
                    className={`w-4 h-4 ${isLocatingGps ? 'animate-spin' : ''}`}
                  />
                  {isLocatingGps
                    ? 'Đang lấy GPS thực tế...'
                    : '🎯 Lấy vị trí GPS của tôi'}
                </button>
              </div>

              {gpsError && (
                <p className="text-[11px] font-semibold text-[#E07A5F] bg-[#E07A5F]/10 px-3 py-2 rounded-2xl">
                  💡 {gpsError}
                </p>
              )}

              <form
                onSubmit={handleSearchAddressLocation}
                className="flex flex-col sm:flex-row gap-2 pt-1"
              >
                <input
                  type="text"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Hoặc nhập địa chỉ / phường / quận của bạn để tìm quanh đó (VD: Thảo Điền, Quận 7, Cầu Giấy)..."
                  className="flex-1 rounded-2xl px-3.5 py-2 text-xs outline-none"
                  style={{
                    backgroundColor: theme.pillBg,
                    color: theme.textHex,
                  }}
                />
                <button
                  type="submit"
                  disabled={searchingAddress}
                  className="px-4 py-2 rounded-2xl text-xs font-bold bg-[#E07A5F] text-white shrink-0 active:scale-95 transition-transform"
                >
                  {searchingAddress ? 'Đang tìm...' : 'Đặt vị trí tại đây'}
                </button>
              </form>

              {addressCandidates.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold opacity-75">
                    Chọn đúng địa chỉ của bạn trên bản đồ:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {addressCandidates.map((cand) => (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => {
                          onSelectCustomLocation(
                            cand.lat,
                            cand.lng,
                            cand.address
                          );
                          onFocusCoordsOnMap(cand.lat, cand.lng, cand.address);
                          setAddressCandidates([]);
                          setAddressQuery('');
                        }}
                        className="px-3 py-2 rounded-2xl text-left text-xs font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                        style={{
                          backgroundColor: theme.pillBg,
                          color: theme.textHex,
                        }}
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#E63946] shrink-0" />
                        <span className="truncate">{cand.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="p-4 rounded-3xl space-y-3"
              style={{ backgroundColor: theme.frostedCardBg }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">
                    Bán kính tìm kiếm quanh vị trí của bạn:
                  </span>
                  <span className="text-xs font-bold text-[#2A9D8F]">
                    Tìm thấy {spotsWithDistance.length} đốm cứu hộ &{' '}
                    {vetsWithDistance.length} thú y
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RADIUS_OPTIONS.map((opt) => {
                    const active = searchRadiusMeters === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChangeSearchRadius(opt.value)}
                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          backgroundColor: active
                            ? '#2A9D8F'
                            : theme.pillBg,
                          color: active ? '#FFFFFF' : theme.textHex,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl"
                style={{ backgroundColor: theme.pillBg }}
              >
                <Search className="w-4 h-4 text-[#E63946] shrink-0" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm gần bạn theo từ khóa: mèo cứu hộ, chó lạc, Bình Thạnh, Quận 11, Thanh Niên..."
                  className="w-full bg-transparent text-xs outline-none"
                  style={{ color: theme.textHex }}
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    className="text-[11px] font-bold opacity-60 hover:opacity-100"
                  >
                    Xóa
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={
                      speciesFilter === 'VET'
                        ? 'VET'
                        : categoryFilter === 'RESCUE_CENTER'
                        ? 'RESCUE_CENTER'
                        : speciesFilter
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'VET') {
                        setSpeciesFilter('VET');
                        setCategoryFilter('ALL');
                      } else if (val === 'RESCUE_CENTER') {
                        setSpeciesFilter('ALL');
                        setCategoryFilter('RESCUE_CENTER');
                      } else {
                        setCategoryFilter('ALL');
                        setSpeciesFilter(val as any);
                      }
                    }}
                    className="w-full h-10 px-3 pr-7 rounded-2xl text-xs font-bold appearance-none cursor-pointer border border-black/5 outline-none"
                    style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
                  >
                    <option value="ALL" className="text-black bg-white">Tất cả bài viết ({spotsWithDistance.length})</option>
                    <option value="dog" className="text-black bg-white">Chó cứu hộ / bị lạc</option>
                    <option value="cat" className="text-black bg-white">Mèo cứu hộ / bị lạc</option>
                    <option value="RESCUE_CENTER" className="text-black bg-white">Trung tâm cứu trợ & nhận nuôi</option>
                    <option value="VET" className="text-black bg-white">Thú Y 24/7 gần bạn ({vetsWithDistance.length})</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">
                    ▼
                  </span>
                </div>

                {speciesFilter !== 'VET' && (
                  <div className="relative flex-1">
                    <select
                      value={spotTypeFilter}
                      onChange={(e) => setSpotTypeFilter(e.target.value as any)}
                      className="w-full h-10 px-3 pr-7 rounded-2xl text-xs font-bold appearance-none cursor-pointer border border-black/5 outline-none"
                      style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
                    >
                      <option value="ALL" className="text-black bg-white">Tất cả trạng thái</option>
                      <option value="RED_SOS" className="text-black bg-white">Cứu hộ khẩn cấp SOS</option>
                      <option value="ORANGE_SIGHT" className="text-black bg-white">Tìm thú cưng thất lạc</option>
                      <option value="YELLOW_ADOPT" className="text-black bg-white">Nhận nuôi & Foster</option>
                      <option value="GREEN_PEACE" className="text-black bg-white">Đã tìm được chủ / Bình yên</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-70">
                      ▼
                    </span>
                  </div>
                )}
              </div>
            </div>

            {speciesFilter === 'VET' ? (
              <div className="space-y-2.5">
                {vetsWithDistance.map(({ vet, distanceMeters }) => {
                  const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${vet.lat},${vet.lng}&travelmode=two-wheeler`;
                  return (
                    <div
                      key={vet.id}
                      className="p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      style={{ backgroundColor: theme.frostedCardBg }}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2A9D8F] text-white flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            Cách bạn {formatDistanceVi(distanceMeters)}
                          </span>
                          {vet.hotline && (
                            <span className="text-[11px] font-bold text-[#2A9D8F]">
                              Hotline: {vet.hotline}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold">{vet.name}</h4>
                        <p
                          className="text-xs"
                          style={{ color: theme.mutedTextHex }}
                        >
                          📍 {vet.address}
                        </p>
                        <p className="text-[11px] opacity-80">
                          {vet.rescueDiscount}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onFocusCoordsOnMap(vet.lat, vet.lng, vet.name);
                            onClose();
                          }}
                          className="px-3 py-2 rounded-full text-xs font-bold bg-[#E07A5F]/15 text-[#E07A5F] flex items-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          Xem trên Bản đồ
                        </button>
                        <a
                          href={dirUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-full text-xs font-bold bg-[#2A9D8F] text-white flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Chỉ đường từ chỗ bạn
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {spotsWithDistance.length === 0 ? (
                  <div
                    className="p-6 rounded-3xl text-center space-y-2"
                    style={{ backgroundColor: theme.frostedCardBg }}
                  >
                    <p className="text-sm font-bold">
                      Chưa có đốm sáng nào có tọa độ trong bán kính{' '}
                      {formatDistanceVi(searchRadiusMeters)} quanh vị trí này.
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: theme.mutedTextHex }}
                    >
                      Hãy mở rộng bán kính lên 10km / 25km / Toàn quốc để xem toàn bộ các ca cứu hộ thực tế!
                    </p>
                    <button
                      type="button"
                      onClick={() => onChangeSearchRadius(2000000)}
                      className="px-4 py-2 rounded-full text-xs font-bold text-white bg-[#2A9D8F]"
                    >
                      Mở rộng bán kính Toàn quốc
                    </button>
                  </div>
                ) : (
                  spotsWithDistance.map(({ spot, hasPin, distanceMeters }) => {
                    const lex = SPOT_LEXICON[spot.spotType];
                    const isUserPost = isUserWebPost(spot);
                    const sourceName = getFriendlySourceName(
                      spot.verificationInfo?.sourceDomain,
                      spot.authorName
                    );
                    const dirFromUserUrl = hasPin
                      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${spot.publicLat},${spot.publicLng}&travelmode=two-wheeler`
                      : '';

                    return (
                      <div
                        key={spot.id}
                        className="p-3.5 rounded-3xl flex flex-col sm:flex-row gap-3.5 items-start sm:items-center"
                        style={{ backgroundColor: theme.frostedCardBg }}
                      >
                        <div className="relative w-full sm:w-24 h-36 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-black/10">
                          <img
                            src={spot.images[0]}
                            alt={spot.title}
                            className="w-full h-full object-cover"
                          />
                          {hasPin && distanceMeters !== null ? (
                            <span className="absolute bottom-1.5 left-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-[#D2673B] text-white shadow-md ring-1 ring-white/30">
                              Cách bạn {formatDistanceVi(distanceMeters)}
                            </span>
                          ) : (
                            <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#133E35] text-white backdrop-blur-md">
                              {spot.areaLabel}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isUserPost ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center gap-1">
                                <PenTool className="w-2.5 h-2.5" />
                                Tự đăng trên Web
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#133E35]/10 text-[#133E35] flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" />
                                {sourceName}
                              </span>
                            )}

                            {spot.entityCategory === 'RESCUE_CENTER' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#0F766E]">
                                Trạm cứu trợ
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: lex.colorHex }}
                              >
                                {lex.shortName}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold line-clamp-2 leading-snug">
                            {spot.title}
                          </h4>

                          <p
                            className="text-xs line-clamp-2 leading-relaxed"
                            style={{ color: theme.mutedTextHex }}
                          >
                            {spot.story}
                          </p>

                          <p className="text-[11px] font-semibold flex items-center gap-1 text-[#E63946]">
                            {hasPin ? (
                              <MapPin className="w-3 h-3 shrink-0" />
                            ) : (
                              <MapPinOff className="w-3 h-3 shrink-0 text-[#E07A5F]" />
                            )}
                            <span className="truncate">
                              {hasPin
                                ? spot.formattedAddress || spot.areaLabel
                                : `${spot.areaLabel} (Chưa rõ địa chỉ số nhà)`}
                            </span>
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {hasPin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectSpotOnMap(spot);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E63946] text-white flex items-center gap-1 shadow-sm"
                                >
                                  <Compass className="w-3.5 h-3.5" />
                                  Xem trên Bản đồ
                                </button>

                                <a
                                  href={dirFromUserUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#2A9D8F] text-white flex items-center gap-1 shadow-sm"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  Chỉ đường
                                </a>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectSpotOnMap(spot);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#E07A5F] text-white flex items-center gap-1 shadow-sm"
                              >
                                Xem chi tiết bài viết
                              </button>
                            )}

                            {!isUserPost && spot.sourceUrl && (
                              <a
                                href={spot.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                                style={{
                                  backgroundColor: theme.pillBg,
                                  color: theme.textHex,
                                }}
                              >
                                Liên hệ tại {sourceName}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
