'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, LocateFixed, MapPin, Navigation, X } from 'lucide-react';
import LocationMapPickerModal from '@/components/modals/LocationMapPickerModal';

interface LocationOption {
  label: string;
  sub: string;
  lat: number;
  lng: number;
}

const PRESET_LOCATIONS: LocationOption[] = [
  {
    label: 'Thủ Đức, TP.HCM',
    sub: 'Linh Chiểu, Hiệp Bình Chánh, Tam Bình, Thảo Điền',
    lat: 10.8505,
    lng: 106.765,
  },
  {
    label: 'Bình Thạnh, TP.HCM',
    sub: 'Bạch Đằng, Điện Biên Phủ, Hàng Xanh, Chu Văn An',
    lat: 10.803,
    lng: 106.711,
  },
  {
    label: 'Quận 1, TP.HCM',
    sub: 'Bến Nghé, Bến Thành, Nguyễn Huệ, Đa Kao',
    lat: 10.7769,
    lng: 106.7009,
  },
  {
    label: 'Quận 7, TP.HCM',
    sub: 'Phú Mỹ Hưng, Tân Phong, Tân Quy, Huỳnh Tấn Phát',
    lat: 10.734,
    lng: 106.7218,
  },
  {
    label: 'Cầu Giấy, Hà Nội',
    sub: 'Xuân Thủy, Duy Tân, Trung Kính, Hoàng Quốc Việt',
    lat: 21.0333,
    lng: 105.7833,
  },
  {
    label: 'Hải Châu, Đà Nẵng',
    sub: 'Bạch Đằng, Nguyễn Văn Linh, Trần Phú, Hòa Cường',
    lat: 16.0544,
    lng: 108.2022,
  },
];

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLabel: string;
  currentLat?: number;
  currentLng?: number;
  onSelectLocation: (lat: number, lng: number, label: string) => void;
  onRequestGps: () => void;
  isLocatingGps?: boolean;
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  currentLabel,
  currentLat = 10.8505,
  currentLng = 106.765,
  onSelectLocation,
  onRequestGps,
  isLocatingGps = false,
}: LocationPickerModalProps) {
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState(false);

  if (!isOpen && !isInteractiveMapOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && !isInteractiveMapOpen && (
          <div
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[20px] border border-[#DDDCD4] shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-[#DDDCD4] flex items-center justify-between bg-[#FAF7F1]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand" />
                  <h3 className="text-base font-bold text-ink">
                    Chọn khu vực quanh bạn
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[40px] min-h-[40px] rounded-[10px] bg-white border border-[#DDDCD4] flex items-center justify-center text-ink hover:bg-[#F1EFE8]"
                  aria-label="Đóng bảng chọn vị trí"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onRequestGps();
                    onClose();
                  }}
                  disabled={isLocatingGps}
                  className="w-full p-3.5 rounded-[12px] bg-brand-soft text-brand border border-brand/30 flex items-center justify-between gap-3 text-left hover:bg-[#d8e7d5] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                      <LocateFixed
                        className={`w-4 h-4 ${
                          isLocatingGps ? 'animate-spin' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold">
                        {isLocatingGps
                          ? 'Đang xác định GPS...'
                          : 'Định vị GPS thực tế của bạn'}
                      </p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Tự động tìm kiếm các bé ở gần bạn nhất
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsInteractiveMapOpen(true)}
                  className="w-full p-3.5 rounded-[12px] bg-[#FFF0E5]/70 text-ink border border-[#AF421F]/35 flex items-center justify-between gap-3 text-left hover:bg-[#FFF0E5] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#AF421F] text-white flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">
                        Ghim vị trí trên bản đồ
                      </p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Di chuyển bản đồ để chọn chính xác con đường, ngõ hẻm
                      </p>
                    </div>
                  </div>
                </button>

                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2 px-1">
                    Khu vực trọng điểm
                  </p>
                  <div className="space-y-1.5">
                    {PRESET_LOCATIONS.map((loc) => {
                      const isCurrent = currentLabel
                        .toLowerCase()
                        .includes(loc.label.split(',')[0].toLowerCase());
                      return (
                        <button
                          key={loc.label}
                          type="button"
                          onClick={() => {
                            onSelectLocation(loc.lat, loc.lng, loc.label);
                            onClose();
                          }}
                          className={`w-full p-3 rounded-[10px] border flex items-center justify-between text-left transition-all ${
                            isCurrent
                              ? 'border-brand bg-brand-soft/60 text-ink'
                              : 'border-[#DDDCD4]/80 bg-[#FAF7F1] hover:bg-white hover:border-brand text-ink'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{loc.label}</p>
                            <p className="text-[11px] text-ink-secondary mt-0.5">
                              {loc.sub}
                            </p>
                          </div>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-brand shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LocationMapPickerModal
        isOpen={isInteractiveMapOpen}
        initialLat={currentLat}
        initialLng={currentLng}
        initialAddress={currentLabel}
        onClose={() => {
          setIsInteractiveMapOpen(false);
          onClose();
        }}
        onConfirmLocation={(res) => {
          setIsInteractiveMapOpen(false);
          onSelectLocation(res.lat, res.lng, res.formattedAddress);
          onClose();
        }}
      />
    </>
  );
}
