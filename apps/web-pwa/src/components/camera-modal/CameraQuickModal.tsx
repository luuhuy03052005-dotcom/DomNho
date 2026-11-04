'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  ImagePlus,
  LifeBuoy,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { DomSpot, SpotType, ThemeId } from '@/lib/types';
import { compressImageToWebpClient } from '@/lib/image-compressor';
import {
  rankSpotsByVisualSimilarity,
  VisualAnalysisResult,
  VisualMatchItem,
} from '@/lib/visual-matcher';
import LocationMapPickerModal from '@/components/modals/LocationMapPickerModal';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80';

interface CameraQuickModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  userCoords: { lat: number; lng: number; label: string; isRealGps?: boolean };
  existingSpots?: DomSpot[];
  onSelectMatchedSpot?: (spot: DomSpot) => void;
  onClose: () => void;
  onCreateSpot: (payload: {
    spotType: SpotType;
    title: string;
    story: string;
    species: 'cat' | 'dog' | 'other';
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

const BREED_PRESETS: Record<'cat' | 'dog' | 'other', string[]> = {
  cat: [
    'Mèo ta',
    'Mèo Mướp',
    'Mèo Anh lông ngắn',
    'Mèo Anh lông dài',
    'Mèo Xiêm',
    'Mèo Ba Tư',
    'Mèo lai',
    'Chưa rõ giống',
  ],
  dog: [
    'Chó ta / Chó cỏ',
    'Poodle',
    'Phốc sóc (Pomeranian)',
    'Corgi',
    'Chó Phú Quốc',
    'Golden / Labrador',
    'Husky / Alaska',
    'Chó lai',
    'Chưa rõ giống',
  ],
  other: [
    'Chim / Cú',
    'Thỏ kiểng',
    'Hamster / Chuột lang',
    'Rùa',
    'Sóc / Nhím',
    'Thú nhỏ khác',
  ],
};

const COAT_COLOR_PRESETS: string[] = [
  'Vàng trắng',
  'Mướp vàng',
  'Tam thể',
  'Đen tuyền',
  'Trắng tinh',
  'Xám khói',
  'Nâu vàng',
  'Đen trắng',
  'Đồi mồi',
];

const ESSENTIAL_TRAITS: string[] = [
  'Đeo vòng cổ',
  'Quấn người',
  'Nhát người',
  'Đang cần cứu hộ',
  'Sức khỏe ổn định',
];

const TRAIT_GROUPS: {
  id: 'appearance' | 'behavior' | 'health';
  label: string;
  items: string[];
}[] = [
  {
    id: 'appearance',
    label: 'Ngoại hình & Phụ kiện',
    items: [
      'Đeo vòng cổ',
      'Có thẻ tên / chuông',
      'Tai cụp',
      'Đuôi ngắn / cộc',
      'Mắt hai màu',
      'Còn nhỏ tháng',
      'Đã trưởng thành',
    ],
  },
  {
    id: 'behavior',
    label: 'Tính cách',
    items: [
      'Quấn người',
      'Nhát người',
      'Hiền lành',
      'Biết nghe lời',
      'Hay kêu tìm chủ',
      'Thân thiện với trẻ nhỏ',
    ],
  },
  {
    id: 'health',
    label: 'Sức khỏe & Hỗ trợ',
    items: [
      'Đang cần cứu hộ',
      'Bị thương nhẹ',
      'Cần nhà tạm (Foster)',
      'Đã tiêm phòng',
      'Đã triệt sản',
      'Sức khỏe ổn định',
    ],
  },
];

export default function CameraQuickModal({
  isOpen,
  userCoords,
  existingSpots = [],
  onSelectMatchedSpot,
  onClose,
  onCreateSpot,
}: CameraQuickModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [spotType, setSpotType] = useState<SpotType>('RED_SOS');
  const [species, setSpecies] = useState<'cat' | 'dog' | 'other'>('cat');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [breed, setBreed] = useState('Mèo ta');
  const [coatColor, setCoatColor] = useState('Vàng trắng');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([
    'Đang cần cứu hộ',
  ]);
  const [customTraitInput, setCustomTraitInput] = useState('');
  const [showMoreTraits, setShowMoreTraits] = useState(false);
  const [activeTraitGroup, setActiveTraitGroup] = useState<
    'appearance' | 'behavior' | 'health'
  >('appearance');
  const [openPresetMenu, setOpenPresetMenu] = useState<
    'breed' | 'color' | null
  >(null);

  const [images, setImages] = useState<string[]>([]);
  const [compressedKB, setCompressedKB] = useState<number>(0);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiStatusText, setAiStatusText] = useState<string>('');
  const [lastAiAnalysis, setLastAiAnalysis] =
    useState<VisualAnalysisResult | null>(null);

  const [customAddress, setCustomAddress] = useState<string>('');
  const [pinnedCoords, setPinnedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hasExactLocation, setHasExactLocation] = useState<boolean>(true);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let stream: MediaStream | null = null;

    async function startCamera() {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
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

  const handleSelectSpecies = (nextSpecies: 'cat' | 'dog' | 'other') => {
    setSpecies(nextSpecies);
    setOpenPresetMenu(null);
    if (
      nextSpecies === 'cat' &&
      (breed === 'Chó ta / Chó cỏ' || breed === 'Chim / Cú')
    ) {
      setBreed('Mèo ta');
    } else if (
      nextSpecies === 'dog' &&
      (breed === 'Mèo ta' || breed === 'Chim / Cú')
    ) {
      setBreed('Chó ta / Chó cỏ');
    } else if (
      nextSpecies === 'other' &&
      (breed === 'Mèo ta' || breed === 'Chó ta / Chó cỏ')
    ) {
      setBreed('Chim / Cú');
    }
  };

  const suggestedMatches: VisualMatchItem[] = useMemo(() => {
    if (images.length === 0 || existingSpots.length === 0) return [];
    const effectiveAnalysis: VisualAnalysisResult = {
      species: lastAiAnalysis?.species || species,
      breed: breed || lastAiAnalysis?.breed || '',
      coatColor: coatColor || lastAiAnalysis?.coatColor || '',
      primaryColors: lastAiAnalysis?.primaryColors || [coatColor],
      coatPattern: lastAiAnalysis?.coatPattern || '',
      traits:
        selectedTraits.length > 0
          ? selectedTraits
          : lastAiAnalysis?.traits || [],
      suggestedTitle: title || lastAiAnalysis?.suggestedTitle || '',
      visualMatches: lastAiAnalysis?.visualMatches,
    };
    const effectiveCoords = pinnedCoords || {
      lat: userCoords.lat,
      lng: userCoords.lng,
    };
    return rankSpotsByVisualSimilarity(
      effectiveAnalysis,
      existingSpots,
      effectiveCoords
    ).slice(0, 4);
  }, [
    images.length,
    existingSpots,
    lastAiAnalysis,
    species,
    breed,
    coatColor,
    selectedTraits,
    title,
    pinnedCoords,
    userCoords.lat,
    userCoords.lng,
  ]);

  if (!isOpen || !mounted) return null;

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
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 0) {
        setLastAiAnalysis(null);
      }
      return next;
    });
  };

  const analyzeWithAi = async (dataUrlToAnalyze?: string) => {
    const targetImg = dataUrlToAnalyze || images[0];
    if (!targetImg) {
      setAiStatusText('Vui lòng chụp hoặc tải ảnh lên trước khi nhận diện.');
      return;
    }
    setAiAnalyzing(true);
    setAiStatusText(
      'Đang phân tích hình ảnh và kiểm tra các bài viết trùng khớp...'
    );
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: targetImg,
          candidateSpots: existingSpots,
          userCoords: pinnedCoords || {
            lat: userCoords.lat,
            lng: userCoords.lng,
          },
        }),
      });
      const data = await res.json();
      if (data.ok && data.analysis) {
        const a: VisualAnalysisResult = data.analysis;
        setLastAiAnalysis(a);
        if (a.species === 'dog' || a.species === 'cat' || a.species === 'other') {
          setSpecies(a.species);
        }
        if (a.breed) setBreed(a.breed);
        if (a.coatColor) setCoatColor(a.coatColor);
        if (Array.isArray(a.traits) && a.traits.length > 0) {
          setSelectedTraits(a.traits.slice(0, 5));
        }
        if (a.suggestedTitle && !title) {
          setTitle(a.suggestedTitle);
        }
        const matchCount = Array.isArray(data.matches)
          ? data.matches.length
          : 0;
        setAiStatusText(
          matchCount > 0
            ? `✓ Nhận diện: ${a.breed || ''} (${a.coatColor || ''}) — Phát hiện ${matchCount} bài viết có đặc điểm trùng khớp cao.`
            : `✓ Đã nhận diện: ${a.breed || ''} (${a.coatColor || ''})`
        );
      } else {
        setAiStatusText(
          'Đã tải ảnh thành công. Bạn có thể chọn hoặc tự nhập đặc điểm bên dưới.'
        );
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

  const handleAddCustomTrait = () => {
    const cleaned = customTraitInput.trim();
    if (!cleaned) return;
    if (!selectedTraits.includes(cleaned)) {
      setSelectedTraits((prev) => [...prev, cleaned]);
    }
    setCustomTraitInput('');
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
    const effectiveBreed =
      breed.trim() ||
      (species === 'cat'
        ? 'Mèo'
        : species === 'dog'
        ? 'Chó'
        : 'Thú cưng');
    const effectiveColor = coatColor.trim() || 'Chưa rõ màu lông';

    const defaultTitle =
      spotType === 'RED_SOS'
        ? `Cần cứu hộ: ${effectiveBreed} (${effectiveColor}) tại ${effectiveAddress}`
        : spotType === 'ORANGE_SIGHT'
        ? `Tìm thú lạc: ${effectiveBreed} (${effectiveColor}) tại ${effectiveAddress}`
        : `${effectiveBreed} (${effectiveColor}) chờ đón mái ấm tại ${effectiveAddress}`;

    onCreateSpot({
      spotType,
      title: title.trim() || defaultTitle,
      story:
        story.trim() ||
        `Bài đăng hỗ trợ thú cưng tại khu vực ${effectiveAddress}.`,
      species,
      breed: effectiveBreed,
      coatColor: effectiveColor,
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

  const currentBreedPresets = BREED_PRESETS[species];
  const activeGroupObj =
    TRAIT_GROUPS.find((g) => g.id === activeTraitGroup) || TRAIT_GROUPS[0];

  // Combine essential traits with any custom/extra selected traits so selected ones are always visible
  const visibleCompactTraits = Array.from(
    new Set([...selectedTraits, ...ESSENTIAL_TRAITS])
  ).slice(0, 8);

  return createPortal(
    <AnimatePresence>
      <div
        data-testid="create-post-backdrop"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        className="fixed inset-0 z-[110] bg-[#142820]/50 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.96, y: 18, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 18, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl max-h-[92dvh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#DDDCD4] overflow-hidden flex flex-col"
        >
          <div className="shrink-0 p-4 sm:px-5 sm:py-4 border-b border-[#DDDCD4] flex items-center justify-between gap-3 bg-[#FAF7F1]">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-extrabold text-[#142820]">
                Đăng tin cứu hộ, tìm lạc hoặc nhận nuôi
              </h3>
              <p className="text-xs text-[#52605A] mt-0.5">
                Tự động phân tích ảnh, cho phép tự nhập hoặc chọn nhanh đặc điểm
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-[10px] bg-white border border-[#DDDCD4] text-[#142820] flex items-center justify-center hover:bg-[#F1EFE8] transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-[#142820]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                  Hình ảnh thực tế ({images.length} ảnh)
                </span>
                <span className="text-[11px] text-[#52605A]">
                  Tối đa 10 ảnh
                </span>
              </div>

              {images.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                    {images.map((img, idx) => (
                      <div
                        key={`${img.slice(0, 32)}-${idx}`}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#DDDCD4] shrink-0 group bg-[#F1EFE8]"
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
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
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
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-[#DDDCD4] hover:border-[#0E513B] flex flex-col items-center justify-center text-[#52605A] hover:text-[#0E513B] transition-colors shrink-0 bg-[#FAF7F1]"
                      >
                        <Plus className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-bold">Thêm ảnh</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 h-9 px-3 rounded-[10px] bg-white border border-[#DDDCD4] hover:border-[#0E513B] text-xs font-semibold text-[#142820] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-[#0E513B]" />
                      <span>Chọn thêm ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => analyzeWithAi()}
                      disabled={aiAnalyzing}
                      className="h-9 px-3.5 rounded-[10px] bg-[#E8EFE6] text-[#0E513B] text-xs font-bold hover:bg-[#DDDCD4] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {aiAnalyzing ? 'Đang đối chiếu...' : 'Phân tích lại'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full py-5 px-4 rounded-xl border-2 border-dashed border-[#DDDCD4] bg-[#FAF7F1] flex flex-col items-center justify-center text-center">
                  {cameraActive ? (
                    <div className="relative w-full aspect-[16/9] max-h-44">
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
                        className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#0E513B] text-white text-xs font-bold shadow-lg flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp ảnh này</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="w-10 h-10 rounded-full bg-[#E8EFE6] text-[#0E513B] flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#142820]">
                          Tải lên hoặc chụp ảnh thực tế của bé
                        </p>
                        <p className="text-[11px] text-[#52605A] mt-0.5">
                          Hệ thống tự động đối chiếu với các bài đăng quanh khu
                          vực
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-4 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
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
                <p className="text-xs font-medium text-[#0E513B] mt-2 flex items-center gap-1.5 bg-[#E8EFE6]/60 p-2.5 rounded-[10px]">
                  <span>{aiStatusText}</span>
                </p>
              )}

              {images.length > 0 && suggestedMatches.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#142820]">
                      Bài viết có đặc điểm tương đồng ({suggestedMatches.length})
                    </p>
                    <span className="text-[11px] text-[#52605A]">
                      Kiểm tra trước khi đăng
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {suggestedMatches.map((m) => (
                      <div
                        key={m.spot.id}
                        className="p-2 rounded-[10px] bg-white border border-[#DDDCD4] flex items-center gap-2.5 hover:border-[#0E513B]/50 transition-colors"
                      >
                        <img
                          src={m.spot.images?.[0] || FALLBACK_PET_IMAGE}
                          alt={m.spot.title}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== FALLBACK_PET_IMAGE) {
                              target.src = FALLBACK_PET_IMAGE;
                            }
                          }}
                          className="w-12 h-12 rounded-lg object-cover border border-[#DDDCD4] shrink-0 bg-[#F1EFE8]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#0E513B] text-white text-[10px] font-bold">
                              Trùng {m.matchPercent}%
                            </span>
                            <span className="text-[10px] text-[#52605A] truncate">
                              {m.spot.areaLabel}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#142820] line-clamp-1">
                            {m.spot.title}
                          </p>
                        </div>
                        {onSelectMatchedSpot && (
                          <button
                            type="button"
                            onClick={() => onSelectMatchedSpot(m.spot)}
                            className="h-8 px-2.5 rounded-lg bg-[#E8EFE6] hover:bg-[#0E513B] text-[#0E513B] hover:text-white text-[11px] font-bold shrink-0 inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Xem</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1.5">
                Nhu cầu bài đăng
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSpotType('RED_SOS')}
                  className={`h-10 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'RED_SOS'
                      ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-[#AF421F] shrink-0" />
                  <span className="truncate">Cứu trợ SOS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpotType('ORANGE_SIGHT')}
                  className={`h-10 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'ORANGE_SIGHT'
                      ? 'bg-[#FFF3D8] text-[#80570D] border-[#80570D] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-[#80570D] shrink-0" />
                  <span className="truncate">Tìm thú lạc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpotType('YELLOW_ADOPT')}
                  className={`h-10 px-2 rounded-[10px] text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    spotType === 'YELLOW_ADOPT'
                      ? 'bg-[#E8EFE6] text-[#0E513B] border-[#0E513B] shadow-sm'
                      : 'bg-white text-[#142820] border-[#DDDCD4] hover:bg-[#F1EFE8]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-[#0E513B] shrink-0" />
                  <span className="truncate">Chờ nhận nuôi</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1.5">
                  Loài thú cưng
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#FAF7F1] p-1 rounded-[10px] border border-[#DDDCD4]">
                  <button
                    type="button"
                    onClick={() => handleSelectSpecies('cat')}
                    className={`h-9 rounded-[8px] text-xs font-bold transition-colors ${
                      species === 'cat'
                        ? 'bg-[#0E513B] text-white shadow-sm'
                        : 'text-[#52605A] hover:text-[#142820]'
                    }`}
                  >
                    Mèo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSpecies('dog')}
                    className={`h-9 rounded-[8px] text-xs font-bold transition-colors ${
                      species === 'dog'
                        ? 'bg-[#0E513B] text-white shadow-sm'
                        : 'text-[#52605A] hover:text-[#142820]'
                    }`}
                  >
                    Chó
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSpecies('other')}
                    className={`h-9 rounded-[8px] text-xs font-bold transition-colors ${
                      species === 'other'
                        ? 'bg-[#0E513B] text-white shadow-sm'
                        : 'text-[#52605A] hover:text-[#142820]'
                    }`}
                  >
                    Loài khác
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                      {species === 'other' ? 'Tên loài / Giống' : 'Giống'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPresetMenu((curr) =>
                          curr === 'breed' ? null : 'breed'
                        )
                      }
                      className="text-[11px] font-bold text-[#0E513B] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Chọn nhanh</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder={
                        species === 'cat'
                          ? 'Tự nhập hoặc chọn: Mèo ta, Mèo Anh...'
                          : species === 'dog'
                          ? 'Tự nhập hoặc chọn: Poodle, Chó ta...'
                          : 'Tự nhập loài: Chim, Thỏ, Hamster...'
                      }
                      className="w-full h-10 pl-3 pr-8 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] focus:outline-none focus:border-[#0E513B]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPresetMenu((curr) =>
                          curr === 'breed' ? null : 'breed'
                        )
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#52605A] hover:bg-[#F1EFE8] flex items-center justify-center"
                      aria-label="Mở gợi ý giống"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {openPresetMenu === 'breed' && (
                    <div className="mt-1.5 p-2 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] flex flex-wrap gap-1.5">
                      {currentBreedPresets.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setBreed(item);
                            setOpenPresetMenu(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            breed === item
                              ? 'bg-[#0E513B] text-white border-[#0E513B]'
                              : 'bg-white text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                      Màu lông / Ngoại hình
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPresetMenu((curr) =>
                          curr === 'color' ? null : 'color'
                        )
                      }
                      className="text-[11px] font-bold text-[#0E513B] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Chọn nhanh</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={coatColor}
                      onChange={(e) => setCoatColor(e.target.value)}
                      placeholder="Tự nhập: Vàng trắng, Tam thể, Đen..."
                      className="w-full h-10 pl-3 pr-8 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] focus:outline-none focus:border-[#0E513B]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenPresetMenu((curr) =>
                          curr === 'color' ? null : 'color'
                        )
                      }
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-[#52605A] hover:bg-[#F1EFE8] flex items-center justify-center"
                      aria-label="Mở gợi ý màu lông"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {openPresetMenu === 'color' && (
                    <div className="mt-1.5 p-2 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] flex flex-wrap gap-1.5">
                      {COAT_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setCoatColor(color);
                            setOpenPresetMenu(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            coatColor === color
                              ? 'bg-[#0E513B] text-white border-[#0E513B]'
                              : 'bg-white text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
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
                  <span>Ghim trên bản đồ</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Tự nhập số nhà, tên đường hoặc bấm Ghim bản đồ..."
                  className="w-full h-10 pl-9 pr-24 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
                />
                <MapPin className="w-4 h-4 text-[#52605A] absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-[8px] bg-[#E8EFE6] text-[#0E513B] text-[11px] font-bold hover:bg-[#0E513B] hover:text-white transition-colors"
                >
                  Ghim bản đồ
                </button>
              </div>

              {pinnedCoords && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0E513B] bg-[#E8EFE6]/70 px-3 py-1.5 rounded-[8px]">
                  <Check className="w-3.5 h-3.5 text-[#0E513B]" />
                  <span>
                    Đã ghim tọa độ: {pinnedCoords.lat.toFixed(5)},{' '}
                    {pinnedCoords.lng.toFixed(5)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1">
                  Tiêu đề bài viết
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Bé mèo mướp lạc gần ngã tư Thủ Đức (có thể để trống tự tạo)"
                  className="w-full h-10 px-3 rounded-[10px] border border-[#DDDCD4] text-xs font-semibold text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
                />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A] block mb-1">
                  Mô tả chi tiết hoàn cảnh
                </span>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={2}
                  placeholder="Mô tả tình trạng của bé, thời điểm phát hiện và điều cần hỗ trợ..."
                  className="w-full p-2.5 rounded-[10px] border border-[#DDDCD4] text-xs font-medium text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B] resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#52605A]">
                  Đặc điểm nhận diện ({selectedTraits.length} đã chọn)
                </span>
                <button
                  type="button"
                  onClick={() => setShowMoreTraits((v) => !v)}
                  className="text-xs font-bold text-[#0E513B] hover:underline inline-flex items-center gap-1"
                >
                  <span>
                    {showMoreTraits
                      ? 'Thu gọn danh sách'
                      : '+ Thêm lựa chọn theo nhóm'}
                  </span>
                  {showMoreTraits ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTraitInput}
                  onChange={(e) => setCustomTraitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTrait();
                    }
                  }}
                  placeholder="Tự nhập đặc điểm riêng (VD: Đeo chuông đỏ, chân tập tễnh...)"
                  className="flex-1 h-9 px-3 rounded-[10px] border border-[#DDDCD4] text-xs font-medium text-[#142820] placeholder:text-[#52605A]/70 focus:outline-none focus:border-[#0E513B]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTrait}
                  className="h-9 px-3 rounded-[10px] bg-[#E8EFE6] hover:bg-[#0E513B] text-[#0E513B] hover:text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {!showMoreTraits ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {visibleCompactTraits.map((trait) => {
                    const active = selectedTraits.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => toggleTrait(trait)}
                        className={`h-8 px-3 rounded-full text-xs font-semibold transition-all border inline-flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#0E513B] text-white border-[#0E513B]'
                            : 'bg-[#F1EFE8] text-[#142820] border-transparent hover:border-[#DDDCD4]'
                        }`}
                      >
                        <span>{trait}</span>
                        {active && <X className="w-3 h-3 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-[12px] bg-[#FAF7F1] border border-[#DDDCD4] space-y-2.5">
                  {selectedTraits.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#DDDCD4]/70">
                      <span className="text-[11px] font-bold text-[#52605A] mr-1">
                        Đã chọn:
                      </span>
                      {selectedTraits.map((trait) => (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => toggleTrait(trait)}
                          className="h-7 px-2.5 rounded-full bg-[#0E513B] text-white text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <span>{trait}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 bg-white p-1 rounded-[9px] border border-[#DDDCD4]">
                    {TRAIT_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveTraitGroup(group.id)}
                        className={`flex-1 py-1.5 px-2 rounded-[7px] text-[11px] font-bold transition-colors ${
                          activeTraitGroup === group.id
                            ? 'bg-[#E8EFE6] text-[#0E513B]'
                            : 'text-[#52605A] hover:text-[#142820]'
                        }`}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {activeGroupObj.items.map((trait) => {
                      const active = selectedTraits.includes(trait);
                      return (
                        <button
                          key={trait}
                          type="button"
                          onClick={() => toggleTrait(trait)}
                          className={`h-8 px-3 rounded-full text-xs font-semibold transition-all border ${
                            active
                              ? 'bg-[#0E513B] text-white border-[#0E513B]'
                              : 'bg-white text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
                          }`}
                        >
                          {trait}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#DDDCD4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-[10px] border border-[#DDDCD4] text-xs font-bold text-[#142820] hover:bg-[#F1EFE8] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-[10px] bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đăng tin ngay ({images.length} ảnh)</span>
              </button>
            </div>
          </form>
        </motion.div>

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
      </div>
    </AnimatePresence>,
    document.body
  );
}
