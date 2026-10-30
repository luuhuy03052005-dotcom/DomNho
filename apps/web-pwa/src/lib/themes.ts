import { SpotType, ThemeId } from './types';

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

/**
 * 4 Chế độ màu theo đúng đặc tả @UIUX.md:
 * 1. Nắng Sớm (#F7F4EF) - Mặc định, chữ nâu cà phê (#2C2623)
 * 2. Đồi Thông (#ECF2EE)
 * 3. Hoàng Hôn (#FCEEE9)
 * 4. Chạng Vạng (#232730 - xanh khói dịu, tuyệt đối không đen tuyền)
 */
export const DOM_THEMES: Record<ThemeId, ThemePalette> = {
  morning_sun: {
    id: 'morning_sun',
    name: 'Đốm Nhỏ',
    subtitle: 'Xanh ngọc & Đất nung',
    bgHex: '#FAF7F2',
    textHex: '#133E35',
    mutedTextHex: '#48645C',
    frostedBg: 'rgba(255, 253, 249, 0.92)',
    frostedSheetBg: 'rgba(250, 247, 242, 0.96)',
    frostedCardBg: 'rgba(255, 255, 255, 0.90)',
    pillBg: 'rgba(19, 62, 53, 0.08)',
    accentSurface: 'rgba(210, 103, 59, 0.12)',
    mapCanvasBg: '#F4EFE6',
    mapWaterHex: '#CFE3E6',
    mapParkHex: '#DCE8DF',
    mapRoadHex: '#FFFFFF',
    mapMajorRoadHex: '#FAD8C3',
    mapTileFilter: 'sepia(0.12) saturate(0.95) brightness(1.02) contrast(0.96)',
    isDarkTheme: false,
  },
  pine_hill: {
    id: 'pine_hill',
    name: 'Đồi Thông',
    subtitle: 'Sương mai dịu mát',
    bgHex: '#ECF2EE',
    textHex: '#163E34',
    mutedTextHex: '#4D6459',
    frostedBg: 'rgba(242, 248, 244, 0.88)',
    frostedSheetBg: 'rgba(238, 245, 240, 0.94)',
    frostedCardBg: 'rgba(255, 255, 255, 0.84)',
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
    frostedBg: 'rgba(255, 244, 240, 0.85)',
    frostedSheetBg: 'rgba(253, 240, 235, 0.92)',
    frostedCardBg: 'rgba(255, 251, 249, 0.80)',
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
    frostedBg: 'rgba(42, 47, 58, 0.84)',
    frostedSheetBg: 'rgba(37, 42, 52, 0.93)',
    frostedCardBg: 'rgba(52, 58, 72, 0.82)',
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
    label: 'Đốm Đỏ • SOS Tìm Lạc',
    shortName: 'Đốm Đỏ',
    tagline: 'Nhịp tim khẩn cấp • Đang tìm đường về nhà',
    colorHex: '#E63946',
    glowRgba: 'rgba(230, 57, 70, 0.45)',
    softBgRgba: 'rgba(230, 57, 70, 0.13)',
    actionVerb: 'Báo tin vừa gặp',
  },
  ORANGE_SIGHT: {
    type: 'ORANGE_SIGHT',
    label: 'Đốm Cam • Tín Hiệu Bắt Gặp',
    shortName: 'Đốm Cam',
    tagline: 'Khoảnh khắc người đi đường vừa chụp vội',
    colorHex: '#E07A5F',
    glowRgba: 'rgba(224, 122, 95, 0.45)',
    softBgRgba: 'rgba(224, 122, 95, 0.15)',
    actionVerb: 'Cùng để mắt hỗ trợ',
  },
  YELLOW_ADOPT: {
    type: 'YELLOW_ADOPT',
    label: 'Đốm Vàng • Đợi Nhà',
    shortName: 'Đốm Vàng',
    tagline: 'Ánh nắng ấm áp chờ một vòng tay đón về',
    colorHex: '#E07A5F',
    glowRgba: 'rgba(244, 162, 97, 0.48)',
    softBgRgba: 'rgba(244, 162, 97, 0.16)',
    actionVerb: 'Muốn đón về / Foster',
  },
  GREEN_PEACE: {
    type: 'GREEN_PEACE',
    label: 'Đốm Xanh • Bình Yên',
    shortName: 'Đốm Xanh',
    tagline: 'Đã tìm được mái ấm • Lưu giữ trên Bản đồ Kỷ niệm',
    colorHex: '#2A9D8F',
    glowRgba: 'rgba(42, 157, 143, 0.42)',
    softBgRgba: 'rgba(42, 157, 143, 0.14)',
    actionVerb: 'Xem nhật ký trưởng thành',
  },
};

