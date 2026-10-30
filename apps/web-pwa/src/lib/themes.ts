import { SpotType, ThemeId } from './types';

export const DESIGN_TOKENS = {
  canvas: '#FAF7F1',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFE8',
  ink: '#142820',
  inkSecondary: '#52605A',
  brand: '#0E513B',
  brandHover: '#0A412F',
  brandSoft: '#E8EFE6',
  rescue: '#AF421F',
  rescueSoft: '#FFF0E5',
  lost: '#80570D',
  lostSoft: '#FFF3D8',
  accent: '#D8724D',
  border: '#DDDCD4',
  focus: '#176CBA',
};

export interface ThemePalette {
  id: ThemeId;
  name: string;
  subtitle: string;
  bgHex: string;
  textHex: string;
  mutedTextHex: string;
  frostedBg: string;
  frostedSheetBg: string;
  frostedCardBg: string;
  pillBg: string;
  accentSurface: string;
  mapCanvasBg: string;
  mapWaterHex: string;
  mapParkHex: string;
  mapRoadHex: string;
  mapMajorRoadHex: string;
  mapTileFilter: string;
  isDarkTheme: boolean;
}

export const DOM_THEMES: Record<ThemeId, ThemePalette> = {
  morning_sun: {
    id: 'morning_sun',
    name: 'Đốm Nhỏ',
    subtitle: 'Kem ấm & Xanh rừng',
    bgHex: '#FAF7F1',
    textHex: '#142820',
    mutedTextHex: '#52605A',
    frostedBg: '#FFFFFF',
    frostedSheetBg: '#FFFFFF',
    frostedCardBg: '#FFFFFF',
    pillBg: '#F1EFE8',
    accentSurface: '#E8EFE6',
    mapCanvasBg: '#FAF7F1',
    mapWaterHex: '#CFE3E6',
    mapParkHex: '#E5EFE4',
    mapRoadHex: '#FFFFFF',
    mapMajorRoadHex: '#F2EDE4',
    mapTileFilter: 'sepia(0.08) saturate(0.95) brightness(1.02) contrast(0.98)',
    isDarkTheme: false,
  },
  pine_hill: {
    id: 'pine_hill',
    name: 'Đồi Thông',
    subtitle: 'Sương mai dịu mát',
    bgHex: '#ECF2EE',
    textHex: '#163E34',
    mutedTextHex: '#4D6459',
    frostedBg: 'rgba(242, 248, 244, 0.95)',
    frostedSheetBg: '#FFFFFF',
    frostedCardBg: '#FFFFFF',
    pillBg: 'rgba(22, 62, 52, 0.08)',
    accentSurface: 'rgba(42, 157, 143, 0.14)',
    mapCanvasBg: '#E6EFE9',
    mapWaterHex: '#C2DDE0',
    mapParkHex: '#CDE2D2',
    mapRoadHex: '#F9FCFA',
    mapMajorRoadHex: '#E4EDE7',
    mapTileFilter: 'hue-rotate(12deg) saturate(0.88) brightness(1.02) contrast(0.95)',
    isDarkTheme: false,
  },
  sunset: {
    id: 'sunset',
    name: 'Hoàng Hôn',
    subtitle: 'Chiều hồng hoài niệm',
    bgHex: '#FCEEE9',
    textHex: '#2C2623',
    mutedTextHex: '#755850',
    frostedBg: 'rgba(255, 244, 240, 0.92)',
    frostedSheetBg: '#FFFFFF',
    frostedCardBg: '#FFFFFF',
    pillBg: 'rgba(224, 122, 95, 0.12)',
    accentSurface: 'rgba(230, 57, 70, 0.11)',
    mapCanvasBg: '#F9E7E0',
    mapWaterHex: '#D5DEE2',
    mapParkHex: '#E4E6D4',
    mapRoadHex: '#FFF9F6',
    mapMajorRoadHex: '#FAD4C4',
    mapTileFilter: 'sepia(0.26) hue-rotate(-10deg) saturate(1.05) brightness(1.01)',
    isDarkTheme: false,
  },
  twilight: {
    id: 'twilight',
    name: 'Chạng Vạng',
    subtitle: 'Xanh khói êm đềm',
    bgHex: '#232730',
    textHex: '#F5EFEA',
    mutedTextHex: '#B0B6C3',
    frostedBg: 'rgba(42, 47, 58, 0.90)',
    frostedSheetBg: 'rgba(37, 42, 52, 0.95)',
    frostedCardBg: 'rgba(52, 58, 72, 0.88)',
    pillBg: 'rgba(245, 239, 234, 0.10)',
    accentSurface: 'rgba(244, 162, 97, 0.16)',
    mapCanvasBg: '#232730',
    mapWaterHex: '#1D2B3A',
    mapParkHex: '#24332C',
    mapRoadHex: '#2E3440',
    mapMajorRoadHex: '#3B4252',
    mapTileFilter: 'invert(0.86) hue-rotate(185deg) saturate(0.65) brightness(0.92) contrast(0.88)',
    isDarkTheme: true,
  },
};

export interface SpotLexiconMeta {
  type: SpotType;
  label: string;
  shortName: string;
  tagline: string;
  colorHex: string;
  glowRgba: string;
  softBgRgba: string;
  actionVerb: string;
}

export const SPOT_LEXICON: Record<SpotType, SpotLexiconMeta> = {
  RED_SOS: {
    type: 'RED_SOS',
    label: 'Cần Cứu Trợ',
    shortName: 'Cần cứu trợ',
    tagline: 'Đang cần hỗ trợ khẩn cấp',
    colorHex: '#AF421F',
    glowRgba: 'rgba(175, 66, 31, 0.45)',
    softBgRgba: '#FFF0E5',
    actionVerb: 'Xem cách giúp bé →',
  },
  ORANGE_SIGHT: {
    type: 'ORANGE_SIGHT',
    label: 'Tìm Thú Lạc',
    shortName: 'Tìm thú lạc',
    tagline: 'Khoảnh khắc vừa bắt gặp',
    colorHex: '#80570D',
    glowRgba: 'rgba(128, 87, 13, 0.45)',
    softBgRgba: '#FFF3D8',
    actionVerb: 'Xem cách giúp bé →',
  },
  YELLOW_ADOPT: {
    type: 'YELLOW_ADOPT',
    label: 'Chờ Nhận Nuôi',
    shortName: 'Chờ nhận nuôi',
    tagline: 'Chờ một mái nhà yêu thương',
    colorHex: '#0E513B',
    glowRgba: 'rgba(14, 81, 59, 0.48)',
    softBgRgba: '#E8EFE6',
    actionVerb: 'Tìm hiểu về bé →',
  },
  GREEN_PEACE: {
    type: 'GREEN_PEACE',
    label: 'Đã Bình Yên',
    shortName: 'Đã bình yên',
    tagline: 'Đã tìm được mái ấm',
    colorHex: '#0E513B',
    glowRgba: 'rgba(14, 81, 59, 0.42)',
    softBgRgba: '#E8EFE6',
    actionVerb: 'Xem câu chuyện →',
  },
};

