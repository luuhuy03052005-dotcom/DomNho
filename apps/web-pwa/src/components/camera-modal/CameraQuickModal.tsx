'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  MapPin,
  MapPinOff,
  PenTool,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { SpotType, ThemeId } from '@/lib/types';
import { DOM_THEMES } from '@/lib/themes';
import { compressImageToWebpClient } from '@/lib/image-compressor';

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
    imageUrl: string;
    compressedSizeKB: number;
    allowFoster: boolean;
    hasExactLocation: boolean;
    customAddress: string;
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
  'Nhận Foster',
];

export default function CameraQuickModal({
  isOpen,
  themeId,
  userCoords,
  onClose,
  onCreateSpot,
}: CameraQuickModalProps) {
  const theme = DOM_THEMES[themeId];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [spotType, setSpotType] = useState<SpotType>('ORANGE_SIGHT');
  const [species, setSpecies] = useState<'cat' | 'dog'>('cat');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [breed, setBreed] = useState('Mèo ta');
  const [coatColor, setCoatColor] = useState('Vàng trắng');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([
    'Mèo ta',
    'Đang cần cứu hộ',
  ]);
  const [hasExactLocation, setHasExactLocation] = useState<boolean>(true);
  const [customAddress, setCustomAddress] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [compressedKB, setCompressedKB] = useState<number>(0);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiStatusText, setAiStatusText] = useState<string>('');

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
      setPreviewUrl(webp);
      const kb = Math.max(18, Math.round((webp.length * 3) / 4 / 1024));
      setCompressedKB(kb);
      analyzeWithRealGemini25Flash(webp);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImageToWebpClient(file, 1080, 0.78);
      setPreviewUrl(res.dataUrl);
      setCompressedKB(res.sizeKB);
      await analyzeWithRealGemini25Flash(res.dataUrl);
    } catch {
      setAiStatusText('Không thể đọc file ảnh này. Vui lòng chọn ảnh khác.');
    }
  };

  const analyzeWithRealGemini25Flash = async (dataUrlToAnalyze?: string) => {
    const targetImg = dataUrlToAnalyze || previewUrl;
    if (!targetImg) {
      setAiStatusText('Vui lòng chụp hoặc tải lên 1 bức ảnh thật trước khi phân tích.');
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
          `✓ Đã nhận diện: ${a.breed || ''} (${a.coatColor || ''}) — bạn có thể chỉnh lại nếu cần`
        );
      } else {
        setAiStatusText('Đã lưu ảnh. Bạn có thể chọn nhanh đặc điểm bên dưới.');
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
    if (!previewUrl) {
      setAiStatusText(
        '⚠️ Vui lòng chụp trực tiếp từ Camera hoặc tải ảnh thực tế lên trước khi đăng bài!'
      );
      return;
    }

    const effectiveAddress = customAddress.trim() || userCoords.label;
    const defaultTitle =
      spotType === 'RED_SOS'
        ? `Khẩn cấp: Tìm ${breed} (${coatColor}) thất lạc tại ${effectiveAddress}`
        : spotType === 'ORANGE_SIGHT'
        ? `Bắt gặp ${breed} (${coatColor}) tại ${effectiveAddress}`
        : `${breed} (${coatColor}) tìm người nhận nuôi tại ${effectiveAddress}`;

    onCreateSpot({
      spotType,
      title: title.trim() || defaultTitle,
      story:
        story.trim() ||
        `Bài đăng trực tiếp trên Đốm Nhỏ tại khu vực ${effectiveAddress}.`,
      species,
      breed,
      coatColor,
      traits: selectedTraits,
      imageUrl: previewUrl,
      compressedSizeKB: compressedKB || 64,
      allowFoster: spotType === 'YELLOW_ADOPT',
      hasExactLocation,
      customAddress: effectiveAddress,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, y: 28, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 28, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 270, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[90dvh] rounded-[32px] shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: theme.frostedSheetBg,
            color: theme.textHex,
          }}
        >
          <div className="p-4 pb-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E63946] text-white flex items-center gap-1">
                  <PenTool className="w-3 h-3" />
                  Tự đăng trên Web
                </span>
              </div>
              <h3 className="text-base font-bold">
                Đăng Bài Cứu Hộ / Tìm Thú Lạc / Nhận Nuôi
              </h3>
              <p className="text-xs" style={{ color: theme.mutedTextHex }}>
                Hỗ trợ cộng đồng báo phát hiện và liên hệ trực tiếp trên Đốm Nhỏ
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.pillBg, color: theme.textHex }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-5 pb-5 overflow-y-auto no-scrollbar space-y-4"
          >
            <div className="relative w-full aspect-[4/3] max-h-[210px] rounded-[28px] overflow-hidden shadow-inner bg-black/20 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Ảnh thực tế đã chọn"
                  className="w-full h-full object-cover"
                />
              ) : cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold">
                    Bấm “Tải ảnh thật lên” bên dưới để tự động nhận diện đặc điểm của bé
                  </p>
                </div>
              )}

              <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-black/55 text-white backdrop-blur-md flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#2A9D8F]" />
                  {hasExactLocation
                    ? `Ghim vị trí: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                    : 'Chỉ đăng khu vực chung (Không ghim tọa độ)'}
                </span>

                {compressedKB > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2A9D8F] text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {compressedKB}KB
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2">
                <label className="cursor-pointer px-4 py-2 rounded-full text-xs font-bold bg-white text-[#2C2623] shadow-lg flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#E63946]" />
                  Tải ảnh thật lên
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {cameraActive && (
                  <button
                    type="button"
                    onClick={captureFromLiveCamera}
                    className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
                    title="Chụp từ Camera"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#E63946] flex items-center justify-center text-white">
                      <Camera className="w-4 h-4" />
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => analyzeWithRealGemini25Flash()}
                  disabled={aiAnalyzing}
                  className="px-3.5 py-2 rounded-full text-xs font-bold bg-[#2C2623] text-[#FFFDF9] shadow-lg flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#F4A261]" />
                  {aiAnalyzing ? 'Đang nhận diện...' : 'Nhận diện tự động'}
                </button>
              </div>
            </div>

            {aiStatusText && (
              <p className="text-xs font-semibold text-[#2A9D8F] px-1">
                {aiStatusText}
              </p>
            )}

            <div>
              <p className="text-xs font-bold mb-2">1. Chọn loại bài đăng:</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'RED_SOS' as SpotType,
                    title: 'Đốm Đỏ',
                    sub: 'Tìm thú lạc / SOS',
                    color: '#E63946',
                  },
                  {
                    id: 'ORANGE_SIGHT' as SpotType,
                    title: 'Đốm Cam',
                    sub: 'Bắt gặp ngoài đường',
                    color: '#E07A5F',
                  },
                  {
                    id: 'YELLOW_ADOPT' as SpotType,
                    title: 'Đốm Vàng',
                    sub: 'Nhận nuôi / Foster',
                    color: '#F4A261',
                  },
                ].map((item) => {
                  const active = spotType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSpotType(item.id)}
                      className="p-3 rounded-2xl text-left transition-all"
                      style={{
                        backgroundColor: active
                          ? item.color
                          : theme.frostedCardBg,
                        color: active ? '#FFFFFF' : theme.textHex,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{item.title}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: active ? '#FFFFFF' : item.color,
                          }}
                        />
                      </div>
                      <p className="text-[11px] opacity-85 mt-0.5">{item.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="p-3.5 rounded-2xl space-y-2.5"
              style={{ backgroundColor: theme.frostedCardBg }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">2. Xác nhận địa chỉ & vị trí:</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setHasExactLocation(true)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all"
                    style={{
                      backgroundColor: hasExactLocation ? '#2A9D8F' : theme.pillBg,
                      color: hasExactLocation ? '#FFFFFF' : theme.textHex,
                    }}
                  >
                    <MapPin className="w-3 h-3" />
                    Có địa chỉ cụ thể (Ghim Bản đồ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasExactLocation(false)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all"
                    style={{
                      backgroundColor: !hasExactLocation ? '#E07A5F' : theme.pillBg,
                      color: !hasExactLocation ? '#FFFFFF' : theme.textHex,
                    }}
                  >
                    <MapPinOff className="w-3 h-3" />
                    Chỉ biết khu vực (Hiện Danh sách)
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder={
                  hasExactLocation
                    ? `Nhập địa chỉ cụ thể (Mặc định: ${userCoords.label})`
                    : 'Nhập tên Quận/Huyện, Tỉnh/Thành phố (VD: Quận Bình Thạnh, TP.HCM)'
                }
                className="w-full rounded-xl px-3.5 py-2 text-xs outline-none"
                style={{
                  backgroundColor: theme.pillBg,
                  color: theme.textHex,
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">3. Đặc điểm nhận dạng thực tế:</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setSpecies('cat')}
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor:
                        species === 'cat' ? '#E07A5F' : theme.pillBg,
                      color: species === 'cat' ? '#FFFFFF' : theme.textHex,
                    }}
                  >
                    Mèo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecies('dog')}
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor:
                        species === 'dog' ? '#E07A5F' : theme.pillBg,
                      color: species === 'dog' ? '#FFFFFF' : theme.textHex,
                    }}
                  >
                    Chó
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_TRAITS.map((trait) => {
                  const active = selectedTraits.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => toggleTrait(trait)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: active ? '#2A9D8F' : theme.pillBg,
                        color: active ? '#FFFFFF' : theme.textHex,
                      }}
                    >
                      {active ? `✓ ${trait}` : `+ ${trait}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề ngắn (VD: Tìm mèo mướp vàng lạc gần Điện Biên Phủ...)"
                className="w-full rounded-2xl px-4 py-2.5 text-xs outline-none"
                style={{
                  backgroundColor: theme.frostedCardBg,
                  color: theme.textHex,
                }}
              />
              <textarea
                rows={2}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Mô tả chi tiết vị trí & tình trạng thực tế của bé..."
                className="w-full rounded-2xl px-4 py-2.5 text-xs outline-none"
                style={{
                  backgroundColor: theme.frostedCardBg,
                  color: theme.textHex,
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full text-sm font-bold text-white shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #E63946 0%, #E07A5F 100%)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              {hasExactLocation
                ? 'Đăng Bài & Ghim Lên Bản Đồ'
                : 'Đăng Bài Vào Danh Sách Khu Vực'}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
