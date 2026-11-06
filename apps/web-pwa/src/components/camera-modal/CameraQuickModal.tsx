'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
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
import {
  DomSpot,
  SpotType,
  ThemeId,
  isSpotDeletedOrHidden,
} from '@/lib/types';
import { compressImageToWebpClient } from '@/lib/image-compressor';
import {
  VisualAnalysisResult,
  VisualMatchItem,
  rankSpotsByVisualSimilarity,
} from '@/lib/visual-matcher';
import LocationMapPickerModal from '@/components/modals/LocationMapPickerModal';

const FALLBACK_PET_IMAGE =
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80';

interface CameraQuickModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  userCoords: { lat: number; lng: number; label: string };
  existingSpots?: DomSpot[];
  editingSpot?: DomSpot | null;
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
  onUpdateSpot?: (
    spotId: string,
    payload: {
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
    }
  ) => void;
}

const BREED_PRESETS: Record<'cat' | 'dog' | 'other', string[]> = {
  cat: [
    'Mèo ta',
    'Mèo Mướp',
    'Mèo Anh lông ngắn',
    'Mèo Anh lông dài',
    'Mèo Ba Tư',
    'Mèo Xiêm',
    'Mèo lai',
    'Chưa rõ giống',
  ],
  dog: [
    'Chó ta / Chó cỏ',
    'Chó Poodle',
    'Chó Phốc Sóc',
    'Chó Corgi',
    'Chó Golden / Лаbrador',
    'Chó Husky / Alaska',
    'Chó Phú Quốc',
    'Chó lai',
    'Chưa rõ giống',
  ],
  other: [
    'Chim / Cú',
    'Thỏ cảnh',
    'Hamster / Sóc',
    'Rùa',
    ' Động vật khác',
  ],
};

const COAT_COLOR_PRESETS: string[] = [
  'Vàng trắng',
  'Vàng cam',
  'Tam thể',
  'Mướp xám',
  'Đen tuyền',
  'Trắng tinh',
  'Đen trắng',
  'Nâu vàng',
  'Xám xanh',
];

const ESSENTIAL_TRAITS: string[] = [
  'Đang cần cứu hộ',
  'Đeo vòng cổ',
  'Nhát người',
  'Quấn người',
  'Đang bị thương',
  'Cần tìm chủ gấp',
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
      'Có chuông nhỏ',
      'Mặc áo thú cưng',
      'Tai cụp',
      'Đuôi ngắn / cụt',
      'Lông xù dày',
      'Bé còn nhỏ (dưới 6 tháng)',
      'Kích thước lớn',
    ],
  },
  {
    id: 'behavior',
    label: 'Tính cách',
    items: [
      'Nhát người',
      'Quấn người',
      'Hiền lành',
      'Hoảng loạn / Sợ tiếng động',
      'Biết nghe gọi tên',
      'Thân thiện với trẻ nhỏ',
    ],
  },
  {
    id: 'health',
    label: 'Sức khỏe & Hỗ trợ',
    items: [
      'Đang cần cứu hộ',
      'Đang bị thương',
      'Cần tìm nhà tạm (Foster)',
      'Cần tìm chủ gấp',
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
  editingSpot = null,
  onSelectMatchedSpot,
  onClose,
  onCreateSpot,
  onUpdateSpot,
}: CameraQuickModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const [mounted, setMounted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [spotType, setSpotType] = useState<SpotType>('RED_SOS');
  const [species, setSpecies] = useState<'cat' | 'dog' | 'other'>('cat');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [breed, setBreed] = useState('');
  const [coatColor, setCoatColor] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [customTraitInput, setCustomTraitInput] = useState('');
  const [showMoreTraits, setShowMoreTraits] = useState(false);
  const [activeTraitGroup, setActiveTraitGroup] = useState<
    'appearance' | 'behavior' | 'health'
  >('appearance');

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
  const [hasUserMovedPin, setHasUserMovedPin] = useState<boolean>(false);
  const [hasExactLocation, setHasExactLocation] = useState<boolean>(true);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      isSubmittingRef.current = false;
      return;
    }
    isSubmittingRef.current = false;
    if (editingSpot) {
      setSpotType(
        editingSpot.spotType === 'GREEN_PEACE'
          ? 'YELLOW_ADOPT'
          : editingSpot.spotType
      );
      setSpecies(editingSpot.species || 'cat');
      setTitle(editingSpot.title || '');
      setStory(editingSpot.story || '');
      setBreed(editingSpot.breed || '');
      setCoatColor(editingSpot.coatColor || '');
      setSelectedTraits(
        Array.isArray(editingSpot.traits) ? editingSpot.traits : []
      );
      setImages(Array.isArray(editingSpot.images) ? editingSpot.images : []);
      setCustomAddress(
        editingSpot.formattedAddress || editingSpot.areaLabel || ''
      );
      setPinnedCoords(
        editingSpot.publicLat && editingSpot.publicLng
          ? { lat: editingSpot.publicLat, lng: editingSpot.publicLng }
          : null
      );
      setHasUserMovedPin(false);
      setHasExactLocation(editingSpot.hasExactLocation ?? true);
      setAiStatusText('');
      setLastAiAnalysis(null);
    } else {
      setSpotType('RED_SOS');
      setSpecies('cat');
      setTitle('');
      setStory('');
      setBreed('');
      setCoatColor('');
      setSelectedTraits([]);
      setCustomTraitInput('');
      setImages([]);
      setCompressedKB(0);
      setAiStatusText('');
      setLastAiAnalysis(null);
      setCustomAddress('');
      setPinnedCoords(null);
      setHasUserMovedPin(false);
      setHasExactLocation(true);
    }
  }, [isOpen, editingSpot]);

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
    if (breed && !BREED_PRESETS[nextSpecies].includes(breed)) {
      setBreed('');
    }
  };

  const suggestedMatches: VisualMatchItem[] = useMemo(() => {
    if (images.length === 0 || existingSpots.length === 0) return [];
    if (lastAiAnalysis?.isPet === false) return [];
    const activeSpots = existingSpots.filter(
      (s) =>
        !isSpotDeletedOrHidden(s) &&
        (!editingSpot || s.id !== editingSpot.id)
    );
    if (activeSpots.length === 0) return [];

    const effectiveAnalysis: VisualAnalysisResult = {
      isPet: lastAiAnalysis?.isPet ?? true,
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
      activeSpots,
      effectiveCoords
    ).slice(0, 4);
  }, [
    images.length,
    existingSpots,
    editingSpot,
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
        if (a.isPet === false) {
          setAiStatusText(
            'Ảnh tải lên không rõ hình thú cưng (chó/mèo). Vui lòng chọn ảnh rõ mặt/lông của bé hoặc tự nhập thông tin bên dưới.'
          );
          return;
        }
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
    if (isSubmittingRef.current) return;
    if (images.length === 0) {
      setAiStatusText(
        'Vui lòng chụp hoặc tải lên ít nhất 1 bức ảnh thực tế của bé!'
      );
      return;
    }

    isSubmittingRef.current = true;

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

    const payload = {
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
      allowFoster:
        spotType === 'YELLOW_ADOPT' ||
        selectedTraits.includes('Cần tìm nhà tạm (Foster)'),
      hasExactLocation,
      customAddress: effectiveAddress,
      pinnedLat:
        editingSpot && !hasUserMovedPin ? undefined : pinnedCoords?.lat,
      pinnedLng:
        editingSpot && !hasUserMovedPin ? undefined : pinnedCoords?.lng,
    };

    if (editingSpot && onUpdateSpot) {
      onUpdateSpot(editingSpot.id, payload);
      return;
    }

    onCreateSpot(payload);
  };

  const currentBreedPresets = BREED_PRESETS[species];
  const activeGroupObj =
    TRAIT_GROUPS.find((g) => g.id === activeTraitGroup) || TRAIT_GROUPS[0];

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
        className="fixed inset-0 z-[110] bg-[#FAF7F1] sm:bg-[#142820]/50 sm:backdrop-blur-md flex items-stretch sm:items-center justify-center sm:p-4"
      >
        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 14, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-[620px] bg-[#FAF7F1] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-[#DDDCD4] overflow-hidden flex flex-col text-[#142820]"
        >
          {/* Header cố định */}
          <div className="shrink-0 px-4 sm:px-5 pt-[max(12px,env(safe-area-inset-top,0px))] pb-3 sm:py-4 border-b border-[#DDDCD4] flex items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden w-9 h-9 -ml-1 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-[#142820] flex items-center justify-center shrink-0"
                aria-label="Quay lại"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold text-[#142820] truncate">
                  {editingSpot
                    ? 'Chỉnh sửa bài đăng'
                    : 'Đăng tin cứu hộ & tìm thú lạc'}
                </h3>
                <p className="text-xs text-[#52605A] truncate">
                  {editingSpot
                    ? 'Cập nhật hình ảnh, thông tin nhận diện và vị trí bài viết'
                    : 'Điền thông tin hoặc chọn gợi ý nhanh bên dưới'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] bg-[#FAF7F1] border border-[#DDDCD4] text-[#142820] flex items-center justify-center hover:bg-[#F1EFE8] transition-colors shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nội dung cuộn được chia thành các thẻ trắng rõ ràng */}
          <form
            id="dom-nho-create-post-form"
            onSubmit={handleSubmit}
            className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto overscroll-contain space-y-3.5"
          >
            {/* THẺ 1: HÌNH ẢNH & LOẠI TIN */}
            <section className="p-4 rounded-2xl bg-white border border-[#E4E1D8] space-y-3.5 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-extrabold text-[#142820]">
                    1. Hình ảnh thực tế ({images.length}/10)
                  </label>
                  {images.length > 0 && (
                    <button
                      type="button"
                      onClick={() => analyzeWithAi()}
                      disabled={aiAnalyzing}
                      className="text-xs font-bold text-[#0E513B] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {aiAnalyzing ? 'Đang nhận diện...' : 'Nhận diện lại bằng AI'}
                      </span>
                    </button>
                  )}
                </div>

                {images.length > 0 ? (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {images.map((img, idx) => (
                      <div
                        key={`${img.slice(0, 32)}-${idx}`}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#DDDCD4] shrink-0 bg-[#F1EFE8]"
                      >
                        <img
                          src={img}
                          alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0E513B] text-white">
                            Ảnh chính
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
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
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-[#DDDCD4] hover:border-[#0E513B] flex flex-col items-center justify-center text-[#0E513B] transition-colors shrink-0 bg-[#FAF7F1]"
                      >
                        <Plus className="w-5 h-5 mb-0.5" />
                        <span className="text-[11px] font-bold">Thêm ảnh</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-[#DDDCD4] bg-[#FAF7F1] flex flex-col items-center justify-center text-center">
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
                          <p className="text-xs sm:text-sm font-bold text-[#142820]">
                            Tải lên hoặc chụp ảnh thực tế của bé
                          </p>
                          <p className="text-xs text-[#52605A] mt-0.5">
                            Hệ thống tự động gợi ý đặc điểm và đối chiếu tin quanh bạn
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 px-4 rounded-xl bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
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
                  <p className="text-xs font-medium text-[#0E513B] mt-2.5 flex items-center gap-1.5 bg-[#E8EFE6]/70 px-3 py-2 rounded-xl">
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

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {suggestedMatches.map((m) => (
                        <div
                          key={m.spot.id}
                          className="p-2 rounded-xl bg-white border border-[#DDDCD4] flex items-center gap-2.5"
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
                            className="w-11 h-11 rounded-lg object-cover border border-[#DDDCD4] shrink-0 bg-[#F1EFE8]"
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

              <div className="pt-2 border-t border-[#F1EFE8]">
                <label className="text-xs font-bold text-[#52605A] block mb-2">
                  Mục đích bài đăng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpotType('RED_SOS')}
                    className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      spotType === 'RED_SOS'
                        ? 'bg-[#FFF0E5] text-[#AF421F] border-[#AF421F] shadow-sm'
                        : 'bg-[#FAF7F1] text-[#142820] border-[#DDDCD4]'
                    }`}
                  >
                    <LifeBuoy className="w-4 h-4 text-[#AF421F] shrink-0" />
                    <span className="truncate">Cứu trợ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpotType('ORANGE_SIGHT')}
                    className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      spotType === 'ORANGE_SIGHT'
                        ? 'bg-[#FFF3D8] text-[#80570D] border-[#80570D] shadow-sm'
                        : 'bg-[#FAF7F1] text-[#142820] border-[#DDDCD4]'
                    }`}
                  >
                    <Search className="w-4 h-4 text-[#80570D] shrink-0" />
                    <span className="truncate">Tìm thú lạc</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpotType('YELLOW_ADOPT')}
                    className={`h-11 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      spotType === 'YELLOW_ADOPT'
                        ? 'bg-[#E8EFE6] text-[#0E513B] border-[#0E513B] shadow-sm'
                        : 'bg-[#FAF7F1] text-[#142820] border-[#DDDCD4]'
                    }`}
                  >
                    <Heart className="w-4 h-4 text-[#0E513B] shrink-0" />
                    <span className="truncate">Nhận nuôi</span>
                  </button>
                </div>
              </div>
            </section>

            {/* THẺ 2: THÔNG TIN THÚ CƯNG */}
            <section className="p-4 rounded-2xl bg-white border border-[#E4E1D8] space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-extrabold text-[#142820]">
                  2. Thông tin thú cưng
                </label>
                <span className="text-xs text-[#52605A]">
                  Tự gõ hoặc chạm gợi ý
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 bg-[#FAF7F1] p-1 rounded-xl border border-[#DDDCD4]">
                <button
                  type="button"
                  onClick={() => handleSelectSpecies('cat')}
                  className={`h-10 rounded-[9px] text-xs sm:text-sm font-bold transition-colors ${
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
                  className={`h-10 rounded-[9px] text-xs sm:text-sm font-bold transition-colors ${
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
                  className={`h-10 rounded-[9px] text-xs sm:text-sm font-bold transition-colors ${
                    species === 'other'
                      ? 'bg-[#0E513B] text-white shadow-sm'
                      : 'text-[#52605A] hover:text-[#142820]'
                  }`}
                >
                  Loài khác
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#142820]">
                    {species === 'other' ? 'Tên loài / Giống' : 'Giống thú cưng'}
                  </label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder={
                      species === 'cat'
                        ? 'Nhập giống (VD: Mèo ta, Mèo Anh...)'
                        : species === 'dog'
                        ? 'Nhập giống (VD: Poodle, Chó ta...)'
                        : 'Nhập tên loài (VD: Chim, Thỏ...)'
                    }
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B]"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    {currentBreedPresets.slice(0, 6).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBreed(item)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                          breed === item
                            ? 'bg-[#0E513B] text-white border-[#0E513B]'
                            : 'bg-[#FAF7F1] text-[#52605A] border-[#E4E1D8] hover:border-[#0E513B]'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#142820]">
                    Màu lông / Ngoại hình
                  </label>
                  <input
                    type="text"
                    value={coatColor}
                    onChange={(e) => setCoatColor(e.target.value)}
                    placeholder="Nhập màu lông (VD: Vàng trắng, Tam thể...)"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B]"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    {COAT_COLOR_PRESETS.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCoatColor(color)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                          coatColor === color
                            ? 'bg-[#0E513B] text-white border-[#0E513B]'
                            : 'bg-[#FAF7F1] text-[#52605A] border-[#E4E1D8] hover:border-[#0E513B]'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* THẺ 3: ĐẶC ĐIỂM NHẬN DIỆN */}
            <section className="p-4 rounded-2xl bg-white border border-[#E4E1D8] space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-extrabold text-[#142820]">
                  3. Đặc điểm nhận diện ({selectedTraits.length})
                </label>
                <button
                  type="button"
                  onClick={() => setShowMoreTraits((v) => !v)}
                  className="text-xs font-bold text-[#0E513B] hover:underline inline-flex items-center gap-1"
                >
                  <span>
                    {showMoreTraits
                      ? 'Thu gọn danh sách'
                      : 'Thêm lựa chọn theo nhóm'}
                  </span>
                  {showMoreTraits ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {!showMoreTraits ? (
                <div className="flex flex-wrap gap-1.5">
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
                            : 'bg-[#FAF7F1] text-[#142820] border-[#DDDCD4] hover:border-[#0E513B]'
                        }`}
                      >
                        <span>{trait}</span>
                        {active && <X className="w-3 h-3 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] space-y-2.5">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DDDCD4]">
                    {TRAIT_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveTraitGroup(group.id)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-colors ${
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

              <div className="flex items-center gap-2 pt-1">
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
                  placeholder="Tự nhập đặc điểm khác (VD: Đeo chuông đỏ, chân tập tễnh...)"
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTrait}
                  className="h-10 px-3.5 rounded-xl bg-[#E8EFE6] hover:bg-[#0E513B] text-[#0E513B] hover:text-white text-xs font-bold inline-flex items-center gap-1 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </section>

            {/* THẺ 4: VỊ TRÍ & NỘI DUNG MÔ TẢ */}
            <section className="p-4 rounded-2xl bg-white border border-[#E4E1D8] space-y-3.5 shadow-sm">
              <label className="text-sm font-extrabold text-[#142820] block">
                4. Vị trí &amp; Nội dung chi tiết
              </label>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#142820]">
                  Địa chỉ / Khu vực phát hiện
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-[#0E513B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="Nhập số nhà, tên đường, phường..."
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="h-11 px-3.5 rounded-xl bg-[#E8EFE6] hover:bg-[#0E513B] text-[#0E513B] hover:text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ghim bản đồ</span>
                  </button>
                </div>

                {pinnedCoords && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0E513B] bg-[#E8EFE6]/70 px-3 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-[#0E513B]" />
                    <span>
                      Đã ghim tọa độ: {pinnedCoords.lat.toFixed(5)},{' '}
                      {pinnedCoords.lng.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#142820]">
                  Tiêu đề bài viết (tùy chọn)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Để trống hệ thống sẽ tự tạo tiêu đề ngắn gọn..."
                  className="w-full h-11 px-3.5 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#142820]">
                  Mô tả hoàn cảnh
                </label>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={3}
                  placeholder="Mô tả tình trạng của bé, thời điểm phát hiện và điều cần hỗ trợ..."
                  className="w-full p-3 rounded-xl bg-[#FAF7F1] border border-[#DDDCD4] text-xs sm:text-sm font-medium text-[#142820] placeholder:text-[#7A857F] focus:bg-white focus:outline-none focus:border-[#0E513B] resize-none"
                />
              </div>
            </section>
          </form>

          {/* Thanh nút hành động cố định ở đáy */}
          <div className="shrink-0 px-4 sm:px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] sm:py-3.5 border-t border-[#DDDCD4] bg-white flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border border-[#DDDCD4] text-xs sm:text-sm font-bold text-[#142820] hover:bg-[#F1EFE8] transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="dom-nho-create-post-form"
              className="flex-1 h-11 rounded-xl bg-[#0E513B] hover:bg-[#0A412F] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {editingSpot
                  ? `Lưu thay đổi (${images.length} ảnh)`
                  : `Đăng tin ngay (${images.length} ảnh)`}
              </span>
            </button>
          </div>
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
            setHasUserMovedPin(true);
            setHasExactLocation(true);
          }}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
}
