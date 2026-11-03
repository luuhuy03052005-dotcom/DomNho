'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Check,
  CheckCircle2,
  Heart,
  ImagePlus,
  LifeBuoy,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { SpotType, ThemeId } from '@/lib/types';
import { compressImageToWebpClient } from '@/lib/image-compressor';
import LocationMapPickerModal from '@/components/modals/LocationMapPickerModal';

interface CameraQuickModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  userCoords: { lat: number; lng: number; label: string; isRealGps?: boolean };
  onClose: () => void;
  onCreateSpot: (payload: {
    spotType: SpotType;
    title: string;
    story: string;
    species: 'cat' | 'dog';
    breed: string;
    coatColor: string;
    traits: string[];
    images: string[];
    compressedSizeKB: number;
    allowFoster: boolean;
    hasExactLocation: boolean;
    customAddress: string;
    pinnedLat?: number;
    pinnedLng?: number;
  }) => void;
}

const QUICK_TRAITS = [
  'Mèo ta',
  'Chó cưng',
  'Mướp vàng',
  'Vàng trắng',
  'Tam thể',
  'Đeo vòng cổ',
  'Nhát người',
  'Quấn người',
  'Đang cần cứu hộ',
  'Nhận nuôi',
];

export default function CameraQuickModal({
  isOpen,
  userCoords,
  onClose,
  onCreateSpot,
}: CameraQuickModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [spotType, setSpotType] = useState<SpotType>('RED_SOS');
  const [species, setSpecies] = useState<'cat' | 'dog'>('cat');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [breed, setBreed] = useState('Mèo ta');
  const [coatColor, setCoatColor] = useState('Vàng trắng');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([
    'Mèo ta',
    'Đang cần cứu hộ',
  ]);

  const [images, setImages] = useState<string[]>([]);
  const [compressedKB, setCompressedKB] = useState<number>(0);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiStatusText, setAiStatusText] = useState<string>('');

  const [customAddress, setCustomAddress] = useState<string>('');
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasExactLocation, setHasExactLocation] = useState<boolean>(true);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch {
        setCameraActive(false);
      }
    }

    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const captureFromLiveCamera = () => {
    if (!cameraActive || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL('image/webp', 0.8);
      const kb = Math.max(18, Math.round((webp.length * 3) / 4 / 1024));
      setImages((prev) => [...prev, webp]);
      setCompressedKB((prev) => prev + kb);
      if (images.length === 0) {
        analyzeWithAi(webp);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setAiStatusText(`Đang xử lý ${files.length} ảnh...`);
    try {
      const results: string[] = [];
      let totalKB = 0;
      for (const file of files) {
        const res = await compressImageToWebpClient(file, 1080, 0.78);
        results.push(res.dataUrl);
        totalKB += res.sizeKB;
      }
      const updatedImages = [...images, ...results].slice(0, 10);
      setImages(updatedImages);
      setCompressedKB((prev) => prev + totalKB);

      if (images.length === 0 && results[0]) {
        await analyzeWithAi(results[0]);
      } else {
        setAiStatusText(`✓ Đã thêm ${results.length} ảnh thành công.`);
      }
    } catch {
      setAiStatusText('Không thể đọc file ảnh này. Vui lòng chọn ảnh khác.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const analyzeWithAi = async (dataUrlToAnalyze?: string) => {
    const targetImg = dataUrlToAnalyze || images[0];
    if (!targetImg) {
      setAiStatusText('Vui lòng chụp hoặc tải ảnh lên trước khi nhận diện.');
      return;
    }
    setAiAnalyzing(true);
    setAiStatusText('Đang nhận diện đặc điểm của bé từ ảnh...');
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: targetImg }),
      });
      const data = await res.json();
      if (data.ok && data.analysis) {
        const a = data.analysis;
        if (a.species === 'dog' || a.species === 'cat') setSpecies(a.species);
        if (a.breed) setBreed(a.breed);
        if (a.coatColor) setCoatColor(a.coatColor);
        if (Array.isArray(a.traits) && a.traits.length > 0) {
          setSelectedTraits(a.traits.slice(0, 4));
        }
        if (a.suggestedTitle && !title) {
          setTitle(a.suggestedTitle);
        }
        setAiStatusText(
          `✓ Đã nhận diện: ${a.breed || ''} (${a.coatColor || ''})`
        );
      } else {
        setAiStatusText('Đã tải ảnh thành công. Bạn có thể chọn đặc điểm bên dưới.');
      }
    } catch {
      setAiStatusText('Đã lưu ảnh thành công.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setAiStatusText(
        'Vui lòng chụp hoặc tải lên ít nhất 1 bức ảnh thực tế của bé!'
      );
      return;
    }

    const effectiveAddress = customAddress.trim() || userCoords.label;
    const defaultTitle =
      spotType === 'RED_SOS'
        ? `Cần cứu hộ: ${breed} (${coatColor}) tại ${effectiveAddress}`
        : spotType === 'ORANGE_SIGHT'
        ? `Tìm thú lạc: ${breed} (${coatColor}) tại ${effectiveAddress}`
        : `${breed} (${coatColor}) chờ đón mái ấm tại ${effectiveAddress}`;

    onCreateSpot({
      spotType,
      title: title.trim() || defaultTitle,
      story:
        story.trim() ||
        `Bài đăng hỗ trợ thú cưng tại khu vực ${effectiveAddress}.`,
      species,
      breed,
      coatColor,
      traits: selectedTraits,
      images,
      compressedSizeKB: compressedKB || 64,
      allowFoster: spotType === 'YELLOW_ADOPT',
      hasExactLocation,
      customAddress: effectiveAddress,
      pinnedLat: pinnedCoords?.lat,
      pinnedLng: pinnedCoords?.lng,
    });
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[92dvh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#DDDCD4] overflow-hidden flex flex-col"
        >
          <div className="p-4 sm:p-5 border-b border-[#DDDCD4] flex items-center justify-between bg-[#FAF7F1]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#142820]">
                Đăng tin cần cứu hộ, tìm lạc hoặc nhận nuôi
              </h3>
              <p className="text-xs text-[#52605A] mt-0.5">
                Chia sẻ hình ảnh và vị trí để cộng đồng chung tay giúp bé
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-[#DDDCD4] text-[#142820] flex items-center justify-center hover:bg-[#F1EFE8] transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-5 overflow-y-auto no-scrollbar space-y-5 text-[#142820]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                  Hình ảnh thực tế ({images.length} ảnh)
                </span>
                <span className="text-[11px] text-[#52605A]">
                  Có thể chọn nhiều ảnh cùng lúc
                </span>
              </div>

              {images.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {images.map((img, idx) => (
                      <div
                        key={`${img.slice(0, 32)}-${idx}`}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-[#DDDCD4] shrink-0 group bg-[#F1EFE8]"
                      >
                        <img
                          src={img}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0E513B] text-white">
                            Ảnh bìa
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                          title="Xóa ảnh này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {images.length < 10 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-[#DDDCD4] hover:border-[#0E513B] flex flex-col items-center justify-center text-[#52605A] hover:text-[#0E513B] transition-colors shrink-0 bg-[#FAF7F1]"
                      >
                        <Plus className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Thêm ảnh</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 h-10 px-3 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-semibold text-[#142820] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ImagePlus className="w-4 h-4 text-[#0E513B]" />
                      <span>Chọn thêm nhiều ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeWithAi()}
                      disabled={aiAnalyzing}
                      className="h-10 px-3.5 rounded-[10px] bg-[#E8EFE6] text-[#0E513B] text-xs font-bold hover:bg-[#DDDCD4] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiAnalyzing ? 'Đang nhận diện...' : 'Nhận diện lại'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-[16/9] max-h-52 rounded-2xl overflow-hidden border-2 border-dashed border-[#DDDCD4] bg-[#FAF7F1] flex flex-col items-center justify-center p-4 text-center">
                  {cameraActive ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={captureFromLiveCamera}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#0E513B] text-white text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp ảnh này</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#142820]">
                          Tải lên hoặc chụp nhiều ảnh của bé
                        </p>
                        <p className="text-[11px] text-[#52605A] mt-0.5">
                          Hỗ trợ định dạng JPG, PNG, WEBP (tự động nén dung lượng nhẹ)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-5 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all"
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span>Chọn ảnh từ thiết bị</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {aiStatusText && (
                <p className="text-xs font-medium text-[#0E513B] mt-1.5 flex items-center gap-1.5 bg-[#E8EFE6]/60 p-2 rounded-[8px]">
                  <span>{aiStatusText}</span>
                </p>
              )}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-2">
                Nhu cầu bài đăng
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSpotType('RED_SOS')}
                  className={`h-11 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'RED_SOS'
                      ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <LifeBuoy className="w-4 h-4 text-[#AF421F]" />
                  <span>Cứu trợ SOS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpotType('ORANGE_SIGHT')}
                  className={`h-11 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'ORANGE_SIGHT'
                      ? 'bg-[#FFF3D8] text-[#80570D] border-[#80570D] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <Search className="w-4 h-4 text-[#80570D]" />
                  <span>Tìm thú lạc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpotType('YELLOW_ADOPT')}
                  className={`h-11 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'YELLOW_ADOPT'
                      ? 'bg-[#E8EFE6] text-[#0E513B] border-[#0E513B] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <Heart className="w-4 h-4 text-[#0E513B]" />
                  <span>Chờ nhận nuôi</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                  Vị trí địa chỉ
                </span>
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="text-xs font-bold text-[#0E513B] hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#AF421F]" />
                  <span>Ghim trên Google Map</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder={`VD: Số 29 Đường 16, Phường Linh Chiểu, Thủ Đức`}
                  className="w-full h-11 pl-9 pr-24 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
                />
                <MapPin className="w-4 h-4 text-[#52605A] absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-[8px] bg-[#E8EFE6] text-[#0E513B] text-[11px] font-bold hover:bg-[#0E513B] hover:text-white transition-colors"
                >
                  Ghim bản đồ
                </button>
              </div>

              {pinnedCoords && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0E513B] bg-[#E8EFE6]/70 px-3 py-1.5 rounded-[8px]">
                  <Check className="w-3.5 h-3.5 text-[#0E513B]" />
                  <span>
                    Đã lưu tọa độ bản đồ: {pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1.5">
                Tiêu đề bài viết
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bé mèo mướp bị kẹt ngoài ban công tầng 3"
                className="w-full h-11 px-3 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
              />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1.5">
                Mô tả chi tiết hoàn cảnh
              </span>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={3}
                placeholder="Mô tả cụ thể tình trạng sức khỏe của bé, đặc điểm nhận dạng và điều bạn cần mọi người hỗ trợ..."
                className="w-full p-3 rounded-[10px] border border-[#DDDCD4] text-xs font-medium text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B] resize-none"
              />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-2">
                Đặc điểm nhận diện nhanh
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TRAITS.map((trait) => {
                  const active = selectedTraits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => toggleTrait(trait)}
                      className={`h-8 px-3 rounded-full text-xs font-semibold transition-all border ${
                        active
                          ? 'bg-[#0E513B] text-white border-[#0E513B]'
                          : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:border-[#DDDCD4]'
                      }`}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#DDDCD4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] hover:bg-[#F1EFE8] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex-1 h-12 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Đăng tin ngay ({images.length} ảnh)</span>
              </button>
            </div>
          </form>

          <LocationMapPickerModal
            isOpen={isMapPickerOpen}
            initialLat={pinnedCoords?.lat || userCoords.lat}
            initialLng={pinnedCoords?.lng || userCoords.lng}
            initialAddress={customAddress || userCoords.label}
            onClose={() => setIsMapPickerOpen(false)}
            onConfirmLocation={(result) => {
              setCustomAddress(result.formattedAddress);
              setPinnedCoords({ lat: result.lat, lng: result.lng });
              setHasExactLocation(true);
            }}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
