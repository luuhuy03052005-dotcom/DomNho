'use client';

import React, { useState } from 'react';
import { ArrowLeft, Compass, Crosshair, Heart, LifeBuoy, MapPin, Plus, Shield, Stethoscope, X } from 'lucide-react';
import DomNhoMapCanvas from '@/components/map/DomNhoMapCanvas';
import { DomSpot, ExploreCategory, ThemeId, VetStation } from '@/lib/types';
import { calculateDistanceMeters } from '@/lib/security';
import { isSpotPinAllowedOnMap } from '@/lib/spot-validation';

interface FullMapViewProps {
  spots: DomSpot[];
  selectedSpot: DomSpot | null;
  onSelectSpot: (spot: DomSpot | null) => void;
  onOpenSpotDetail: (spot: DomSpot) => void;
  userCoords: { lat: number; lng: number; label: string; isRealGps?: boolean };
  onRequestRealGps: () => void;
  onBackToExplore: () => void;
  onOpenCreatePost: () => void;
  vetStations: VetStation[];
}

export default function FullMapView({
  spots,
  selectedSpot,
  onSelectSpot,
  onOpenSpotDetail,
  userCoords,
  onRequestRealGps,
  onBackToExplore,
  onOpenCreatePost,
  vetStations,
}: FullMapViewProps) {
  const [category, setCategory] = useState<ExploreCategory>('ALL');
  const [showVets, setShowVets] = useState<boolean>(false);

  // Filter map spots based on category
  const filteredSpots = spots.filter((spot) => {
    if (!isSpotPinAllowedOnMap(spot)) return false;
    if (category === 'RESCUE') return spot.spotType === 'RED_SOS';
    if (category === 'LOST') return spot.spotType === 'ORANGE_SIGHT';
    if (category === 'ADOPT') {
      return spot.spotType === 'YELLOW_ADOPT' || spot.entityCategory === 'RESCUE_CENTER';
    }
    return true;
  });

  const getDistanceString = (spot: DomSpot) => {
    if (!spot.publicLat || !spot.publicLng) return null;
    const meters = calculateDistanceMeters(
      userCoords.lat,
      userCoords.lng,
      spot.publicLat,
      spot.publicLng
    );
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#FAF7F1] flex flex-col select-none">
      <header className="absolute top-0 inset-x-0 z-30 bg-[#FAF7F1]/95 backdrop-blur-md border-b border-[#DDDCD4] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={onBackToExplore}
            className="flex items-center gap-1.5 h-10 px-3 rounded-[10px] bg-white border border-[#DDDCD4] text-[#142820] text-xs font-semibold hover:border-[#0E513B] transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#0E513B]" />
            <span className="hidden sm:inline">Khám phá</span>
          </button>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setCategory('ALL')}
              className={`h-9 px-3 rounded-[10px] text-xs font-semibold transition-all shrink-0 ${
                category === 'ALL'
                  ? 'bg-[#0E513B] text-white shadow-sm'
                  : 'bg-white border border-[#DDDCD4] text-[#142820] hover:bg-[#F1EFE8]'
              }`}
            >
              Tất cả ({filteredSpots.length})
            </button>
            <button
              type="button"
              onClick={() => setCategory('RESCUE')}
              className={`h-9 px-3 rounded-[10px] text-xs font-semibold transition-all shrink-0 ${
                category === 'RESCUE'
                  ? 'bg-[#0E513B] text-white shadow-sm'
                  : 'bg-white border border-[#DDDCD4] text-[#AF421F] hover:bg-[#FFF0E5]'
              }`}
            >
              Cứu trợ
            </button>
            <button
              type="button"
              onClick={() => setCategory('LOST')}
              className={`h-9 px-3 rounded-[10px] text-xs font-semibold transition-all shrink-0 ${
                category === 'LOST'
                  ? 'bg-[#0E513B] text-white shadow-sm'
                  : 'bg-white border border-[#DDDCD4] text-[#80570D] hover:bg-[#FFF3D8]'
              }`}
            >
              Thú lạc
            </button>
            <button
              type="button"
              onClick={() => setCategory('ADOPT')}
              className={`h-9 px-3 rounded-[10px] text-xs font-semibold transition-all shrink-0 ${
                category === 'ADOPT'
                  ? 'bg-[#0E513B] text-white shadow-sm'
                  : 'bg-white border border-[#DDDCD4] text-[#0E513B] hover:bg-[#E8EFE6]'
              }`}
            >
              Nhận nuôi
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowVets((prev) => !prev)}
            className={`h-10 px-3 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              showVets
                ? 'bg-[#0E513B] text-white'
                : 'bg-white border border-[#DDDCD4] text-[#52605A] hover:text-[#142820]'
            }`}
            title="Bật/tắt hiển thị phòng khám thú y 24/7"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Phòng khám thú y</span>
          </button>

          <button
            type="button"
            onClick={onRequestRealGps}
            className="w-10 h-10 rounded-[10px] bg-white border border-[#DDDCD4] text-[#142820] flex items-center justify-center hover:border-[#0E513B] transition-all shadow-sm"
            title="Định vị vị trí của tôi"
          >
            <Crosshair className="w-4 h-4 text-[#0E513B]" />
          </button>

          <button
            type="button"
            onClick={onOpenCreatePost}
            className="h-10 px-3 sm:px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng tin</span>
          </button>
        </div>
      </header>

      <div className="w-full h-full pt-16">
        <DomNhoMapCanvas
          themeId="morning_sun"
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot) => onSelectSpot(spot)}
          userCoords={userCoords}
          patrolModeActive={false}
          searchRadiusMeters={15000}
          focusCoordsTrigger={null}
          onStepPatrolWalk={() => {}}
          onRequestRealGps={onRequestRealGps}
          onOpenNearbySearch={() => {}}
          showVetStations={showVets}
          vetStations={vetStations}
          newlyDroppedSpotId={null}
        />
      </div>

      {selectedSpot && (
        <div className="absolute bottom-5 inset-x-4 max-w-md mx-auto z-40 bg-white rounded-2xl shadow-xl border border-[#DDDCD4] p-3.5 flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F1EFE8] shrink-0 border border-[#DDDCD4]">
            <img
              src={selectedSpot.images?.[0] || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80'}
              alt={selectedSpot.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedSpot.spotType === 'RED_SOS'
                    ? 'bg-[#FFF0E5] text-[#AF421F]'
                    : selectedSpot.spotType === 'ORANGE_SIGHT'
                    ? 'bg-[#FFF3D8] text-[#80570D]'
                    : 'bg-[#E8EFE6] text-[#0E513B]'
                }`}
              >
                {selectedSpot.spotType === 'RED_SOS'
                  ? 'Cần cứu trợ'
                  : selectedSpot.spotType === 'ORANGE_SIGHT'
                  ? 'Thú lạc'
                  : 'Chờ nhận nuôi'}
              </span>
              {getDistanceString(selectedSpot) && (
                <span className="text-xs font-semibold text-[#52605A]">
                  {getDistanceString(selectedSpot)}
                </span>
              )}
            </div>

            <h4 className="text-sm font-bold text-[#142820] truncate mt-1">
              {selectedSpot.title}
            </h4>

            <p className="text-xs text-[#52605A] truncate">
              {selectedSpot.areaLabel || selectedSpot.formattedAddress || 'TP.HCM'}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenSpotDetail(selectedSpot)}
                className="flex-1 h-8 px-3 rounded-[8px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-semibold flex items-center justify-center transition-colors"
              >
                Xem cách giúp bé →
              </button>
              <button
                type="button"
                onClick={() => onSelectSpot(null)}
                className="w-8 h-8 rounded-[8px] border border-[#DDDCD4] text-[#52605A] hover:bg-[#F1EFE8] flex items-center justify-center transition-colors"
                aria-label="Đóng bảng thông tin"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

