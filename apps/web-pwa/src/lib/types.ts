export type ThemeId = 'morning_sun' | 'pine_hill' | 'sunset' | 'twilight';

export type SpotType = 'RED_SOS' | 'ORANGE_SIGHT' | 'YELLOW_ADOPT' | 'GREEN_PEACE';

export type SpotStatus = 'ACTIVE' | 'MATCHED' | 'RESOLVED' | 'FADED' | 'SHADOWBANNED';

export type SpotVisibility = 'PUBLIC' | 'PRIVATE_COUPLE';

export type CrawlPlatform =
  | 'GOOGLE_MAPS'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'THREADS'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'SOCIAL_MEDIA'
  | 'RESCUE_PORTAL'
  | 'USER_POST';

export type PlatformFilter =
  | 'ALL'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'THREADS'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'RESCUE_PORTAL'
  | 'SOCIAL_MEDIA'
  | 'GOOGLE_MAPS';

export type EntityCategory = 'RESCUE_CENTER' | 'INDIVIDUAL_PET';

export type ViewMode = 'map' | 'list';

export type MainTab = 'explore' | 'map' | 'stories' | 'saved' | 'profile';

export type ExploreCategory = 'ALL' | 'RESCUE' | 'LOST' | 'ADOPT';

export type OriginFilter = 'ALL' | 'USER_POST' | 'EXTERNAL';

export type RegionFilter = 'ALL' | 'SOUTH' | 'CENTRAL' | 'NORTH';

export const REGION_LABELS: Record<
  RegionFilter,
  { label: string; shortLabel: string; emoji: string; desc: string }
> = {
  ALL: {
    label: 'Toàn quốc',
    shortLabel: 'Tất cả',
    emoji: '',
    desc: 'Tất cả khu vực trên toàn quốc',
  },
  SOUTH: {
    label: 'Miền Nam',
    shortLabel: 'Miền Nam',
    emoji: '',
    desc: 'TP.HCM, Cần Thơ, Bình Dương, Đồng Nai, Vĩnh Long...',
  },
  CENTRAL: {
    label: 'Miền Trung',
    shortLabel: 'Miền Trung',
    emoji: '',
    desc: 'Đà Nẵng, Huế, Quảng Nam, Khánh Hòa, Tây Nguyên...',
  },
  NORTH: {
    label: 'Miền Bắc',
    shortLabel: 'Miền Bắc',
    emoji: '',
    desc: 'Hà Nội, Hải Phòng, Quảng Ninh, Bắc Ninh...',
  },
};

export function detectRegionFromAddress(
  text?: string | null,
  lat?: number | null
): RegionFilter {
  if (typeof lat === 'number' && lat > 0) {
    if (lat < 12.0) return 'SOUTH';
    if (lat < 18.0) return 'CENTRAL';
    return 'NORTH';
  }
  const lower = String(text || '').toLowerCase();
  if (
    lower.includes('hồ chí minh') ||
    lower.includes('tp.hcm') ||
    lower.includes('tphcm') ||
    lower.includes('sài gòn') ||
    lower.includes('sai gon') ||
    lower.includes('bình thạnh') ||
    lower.includes('thủ đức') ||
    lower.includes('quận ') ||
    lower.includes('tân bình') ||
    lower.includes('bình quới') ||
    lower.includes('bình thới') ||
    lower.includes('vĩnh long') ||
    lower.includes('long hồ') ||
    lower.includes('cần thơ') ||
    lower.includes('đồng nai') ||
    lower.includes('bình dương') ||
    lower.includes('miền tây')
  ) {
    return 'SOUTH';
  }
  if (
    lower.includes('đà nẵng') ||
    lower.includes('da nang') ||
    lower.includes('liên chiểu') ||
    lower.includes('mẹ suốt') ||
    lower.includes('quảng nam') ||
    lower.includes('huế') ||
    lower.includes('thừa thiên') ||
    lower.includes('nha trang') ||
    lower.includes('khánh hòa') ||
    lower.includes('quy nhơn') ||
    lower.includes('bình định') ||
    lower.includes('đà lạt') ||
    lower.includes('lâm đồng') ||
    lower.includes('miền trung')
  ) {
    return 'CENTRAL';
  }
  if (
    lower.includes('hà nội') ||
    lower.includes('ha noi') ||
    lower.includes('trâu quỳ') ||
    lower.includes('gia lâm') ||
    lower.includes('cầu giấy') ||
    lower.includes('hoàn kiếm') ||
    lower.includes('đống đa') ||
    lower.includes('ba đình') ||
    lower.includes('hải phòng') ||
    lower.includes('quảng ninh') ||
    lower.includes('bắc ninh') ||
    lower.includes('thái nguyên') ||
    lower.includes('miền bắc')
  ) {
    return 'NORTH';
  }
  return 'ALL';
}

export const ENTITY_CATEGORY_LABEL: Record<EntityCategory, string> = {
  RESCUE_CENTER: 'Trung tâm Cứu trợ & Nhận nuôi',
  INDIVIDUAL_PET: 'Cá thể Thú cưng',
};

export function isUserWebPost(spot: Pick<DomSpot, 'sourceType'>): boolean {
  return spot.sourceType === 'USER_POST';
}

export function normalizePhoneDigits(rawPhone?: string | null): string {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export function isValidVietnamesePhone(rawPhone?: string | null): boolean {
  const normalized = normalizePhoneDigits(rawPhone);
  return /^0[235789]\d{8,9}$/.test(normalized);
}

export function isSpotDeletedOrHidden(
  spot?: Partial<DomSpot> | null,
  deletedIds?: Set<string> | string[]
): boolean {
  if (!spot || !spot.id) return true;
  if (deletedIds) {
    const inDeleted =
      deletedIds instanceof Set
        ? deletedIds.has(spot.id)
        : Array.isArray(deletedIds) && deletedIds.includes(spot.id);
    if (inDeleted) return true;
  }
  if (typeof spot.lightPower === 'number' && spot.lightPower <= 0) return true;
  if (spot.status === 'FADED' || spot.status === 'SHADOWBANNED') return true;
  if ((spot.sourceType as string) === 'DELETED_POST') return true;
  const normalizedTitle = String(spot.title || '').trim().toLowerCase();
  if (
    normalizedTitle === '[deleted]' ||
    normalizedTitle.includes('pizza xúc xích') ||
    normalizedTitle.includes('đế bánh tròn')
  ) {
    return true;
  }
  return false;
}

export function deterministicAccountIdFromPhone(rawPhone?: string | null): string {
  const clean = normalizePhoneDigits(rawPhone);
  if (!clean) return '00000000-0000-4000-8000-000000000000';
  const seedA = `dom_nho_uid_a:${clean}`;
  const seedB = `dom_nho_uid_b:${clean}`;
  const seedC = `dom_nho_uid_c:${clean}`;
  const seedD = `dom_nho_uid_d:${clean}`;

  const fnv32 = (str: string, init: number) => {
    let h = init >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };

  const p1 = fnv32(seedA, 0x811c9dc5);
  const p2 = fnv32(seedB, 0x9e3779b9);
  const p3 = fnv32(seedC, 0x85ebca6b);
  const p4 = fnv32(seedD, 0xc2b2ae35);

  return `${p1}-${p2.slice(0, 4)}-4${p2.slice(5, 8)}-8${p3.slice(1, 4)}-${p3.slice(4, 8)}${p4}`;
}

export function isSpotOwnedByUser(
  spot: Pick<DomSpot, 'sourceType' | 'authorId' | 'rawPhoneSecret'>,
  sessionOrUserId?: UserSession | string | null
): boolean {
  if (!isUserWebPost(spot)) return false;
  if (!sessionOrUserId) return false;

  if (typeof sessionOrUserId === 'string') {
    return Boolean(spot.authorId && spot.authorId === sessionOrUserId);
  }

  if (spot.authorId && spot.authorId === sessionOrUserId.id) {
    return true;
  }

  if (sessionOrUserId.rawPhone) {
    const detId = deterministicAccountIdFromPhone(sessionOrUserId.rawPhone);
    if (spot.authorId && spot.authorId === detId) {
      return true;
    }
    if (spot.rawPhoneSecret) {
      const spotPhone = normalizePhoneDigits(spot.rawPhoneSecret);
      const userPhone = normalizePhoneDigits(sessionOrUserId.rawPhone);
      if (spotPhone.length >= 8 && spotPhone === userPhone) {
        return true;
      }
    }
  }

  return false;
}

export interface SpotBadgeMeta {
  label: string;
  uppercaseLabel: string;
  bgHex: string;
  textHex: string;
  categoryKind: 'RESCUE' | 'LOST' | 'ADOPT';
}

export function getSpotBadgeMeta(spot: DomSpot): SpotBadgeMeta {
  const userPost = isUserWebPost(spot);

  if (spot.spotType === 'ORANGE_SIGHT') {
    return {
      label: userPost ? 'Tìm thú lạc' : 'Tin tìm thú lạc',
      uppercaseLabel: 'THÚ LẠC',
      bgHex: '#FFF3D8',
      textHex: '#80570D',
      categoryKind: 'LOST',
    };
  }

  if (spot.spotType === 'RED_SOS') {
    return {
      label: userPost ? 'Cần cứu trợ' : 'Tin cứu hộ',
      uppercaseLabel: userPost ? 'CỨU TRỢ' : 'TIN CỨU HỘ',
      bgHex: '#FFF0E5',
      textHex: '#AF421F',
      categoryKind: 'RESCUE',
    };
  }

  if (!userPost) {
    if (spot.entityCategory === 'RESCUE_CENTER') {
      return {
        label: 'Trạm & Mái ấm',
        uppercaseLabel: 'TRẠM & NHẬN NUÔI',
        bgHex: '#E8EFE6',
        textHex: '#0E513B',
        categoryKind: 'ADOPT',
      };
    }
    return {
      label: 'Tin cứu hộ',
      uppercaseLabel: 'TIN CỨU HỘ',
      bgHex: '#FFF0E5',
      textHex: '#AF421F',
      categoryKind: 'RESCUE',
    };
  }

  if (spot.spotType === 'GREEN_PEACE') {
    return {
      label: 'Đã tìm được nhà',
      uppercaseLabel: 'MÁI ẤM',
      bgHex: '#E8EFE6',
      textHex: '#0E513B',
      categoryKind: 'ADOPT',
    };
  }

  return {
    label: 'Chờ nhận nuôi',
    uppercaseLabel: 'NHẬN NUÔI',
    bgHex: '#E8EFE6',
    textHex: '#0E513B',
    categoryKind: 'ADOPT',
  };
}

export function detectPlatformFromUrl(
  url?: string | null,
  fallback: CrawlPlatform = 'SOCIAL_MEDIA'
): CrawlPlatform {
  if (!url) return fallback;
  const lower = url.toLowerCase();
  if (
    lower.includes('google.com/maps') ||
    lower.includes('maps.google.com') ||
    lower.includes('maps.app.goo.gl') ||
    lower.includes('goo.gl/maps')
  ) {
    return 'GOOGLE_MAPS';
  }
  if (
    lower.includes('facebook.com') ||
    lower.includes('fb.com') ||
    lower.includes('fb.watch')
  ) {
    return 'FACEBOOK';
  }
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return 'INSTAGRAM';
  }
  if (lower.includes('threads.net') || lower.includes('threads.com')) {
    return 'THREADS';
  }
  if (lower.includes('tiktok.com')) {
    return 'TIKTOK';
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'YOUTUBE';
  }
  return fallback;
}

export interface PlatformBadgeMeta {
  id: CrawlPlatform;
  label: string;
  shortLabel: string;
  emoji: string;
  colorHex: string;
  bgRgba: string;
}

export const PLATFORM_BADGE_MAP: Record<CrawlPlatform, PlatformBadgeMeta> = {
  FACEBOOK: {
    id: 'FACEBOOK',
    label: 'Facebook',
    shortLabel: 'Facebook',
    emoji: '',
    colorHex: '#1877F2',
    bgRgba: 'rgba(24, 119, 242, 0.14)',
  },
  INSTAGRAM: {
    id: 'INSTAGRAM',
    label: 'Instagram',
    shortLabel: 'Instagram',
    emoji: '',
    colorHex: '#E1306C',
    bgRgba: 'rgba(225, 48, 108, 0.14)',
  },
  THREADS: {
    id: 'THREADS',
    label: 'Threads',
    shortLabel: 'Threads',
    emoji: '',
    colorHex: '#2C2623',
    bgRgba: 'rgba(44, 38, 35, 0.14)',
  },
  TIKTOK: {
    id: 'TIKTOK',
    label: 'TikTok',
    shortLabel: 'TikTok',
    emoji: '',
    colorHex: '#FE2C55',
    bgRgba: 'rgba(254, 44, 85, 0.14)',
  },
  YOUTUBE: {
    id: 'YOUTUBE',
    label: 'YouTube',
    shortLabel: 'YouTube',
    emoji: '',
    colorHex: '#FF0000',
    bgRgba: 'rgba(255, 0, 0, 0.13)',
  },
  GOOGLE_MAPS: {
    id: 'GOOGLE_MAPS',
    label: 'Google Maps',
    shortLabel: 'Google Maps',
    emoji: '',
    colorHex: '#2A9D8F',
    bgRgba: 'rgba(42, 157, 143, 0.14)',
  },
  RESCUE_PORTAL: {
    id: 'RESCUE_PORTAL',
    label: 'Trạm Cứu Hộ',
    shortLabel: 'Trạm Cứu Hộ',
    emoji: '',
    colorHex: '#2A9D8F',
    bgRgba: 'rgba(42, 157, 143, 0.14)',
  },
  SOCIAL_MEDIA: {
    id: 'SOCIAL_MEDIA',
    label: 'Báo chí & Cộng đồng',
    shortLabel: 'Báo chí',
    emoji: '',
    colorHex: '#E07A5F',
    bgRgba: 'rgba(224, 122, 95, 0.15)',
  },
  USER_POST: {
    id: 'USER_POST',
    label: 'Tự đăng trên Web',
    shortLabel: 'Tự đăng',
    emoji: '',
    colorHex: '#E63946',
    bgRgba: 'rgba(230, 57, 70, 0.14)',
  },
};

export function getPlatformBadgeMeta(
  platform?: CrawlPlatform,
  sourceUrl?: string | null
): PlatformBadgeMeta {
  const detected = detectPlatformFromUrl(sourceUrl, platform || 'SOCIAL_MEDIA');
  if (
    detected === 'SOCIAL_MEDIA' &&
    platform &&
    PLATFORM_BADGE_MAP[platform]
  ) {
    return PLATFORM_BADGE_MAP[platform];
  }
  return PLATFORM_BADGE_MAP[detected] || PLATFORM_BADGE_MAP.SOCIAL_MEDIA;
}

export function getFriendlySourceName(
  domain?: string,
  fallback?: string,
  sourceUrl?: string
): string {
  let d = (domain || '').replace(/^www\./, '').toLowerCase();
  if (!d && sourceUrl && sourceUrl.startsWith('http')) {
    try {
      d = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      d = '';
    }
  }
  const map: Record<string, string> = {
    'thanhnien.vn': 'Báo Thanh Niên',
    'tuoitre.vn': 'Báo Tuổi Trẻ',
    'vnexpress.net': 'VnExpress',
    'kenh14.vn': 'Kenh14',
    'vietnamnet.vn': 'VietNamNet',
    'zingnews.vn': 'ZNews',
    'znews.vn': 'ZNews',
    'dantri.com.vn': 'Báo Dân Trí',
    'nld.com.vn': 'Báo Người Lao Động',
    'plo.vn': 'Báo Pháp Luật TP.HCM',
    'sggp.org.vn': 'Báo Sài Gòn Giải Phóng',
    'laodong.vn': 'Báo Lao Động',
    'tienphong.vn': 'Báo Tiền Phong',
    'vtcnews.vn': 'VTC News',
    'vtv.vn': 'VTV News',
    'vov.vn': 'Báo Điện Tử VOV',
    'soha.vn': 'Soha News',
    'afamily.vn': 'Afamily',
    'saostar.vn': 'SaoStar',
    '24h.com.vn': 'Tin tức 24h',
    'baodanang.vn': 'Báo Đà Nẵng',
    'hanoimoi.com.vn': 'Báo Hà Nội Mới',
    'baocantho.com.vn': 'Báo Cần Thơ',
    'chotot.com': 'Chợ Tốt Thú Cưng',
    'facebook.com': 'Facebook',
    'm.facebook.com': 'Facebook',
    'web.facebook.com': 'Facebook',
    'fb.com': 'Facebook',
    'fb.watch': 'Facebook Watch',
    'instagram.com': 'Instagram',
    'instagr.am': 'Instagram',
    'threads.net': 'Threads',
    'threads.com': 'Threads',
    'tiktok.com': 'TikTok',
    'vm.tiktok.com': 'TikTok',
    'vt.tiktok.com': 'TikTok',
    'youtube.com': 'YouTube',
    'm.youtube.com': 'YouTube',
    'youtu.be': 'YouTube',
    'google.com': 'Google Maps',
    'maps.google.com': 'Google Maps',
  };
  if (map[d]) return map[d];
  if (d.endsWith('facebook.com') || d.endsWith('fb.com')) return 'Facebook';
  if (d.endsWith('instagram.com')) return 'Instagram';
  if (d.endsWith('threads.net') || d.endsWith('threads.com')) return 'Threads';
  if (d.endsWith('tiktok.com')) return 'TikTok';
  if (d.endsWith('youtube.com') || d === 'youtu.be') return 'YouTube';
  return fallback || d || 'Cộng đồng Đốm Nhỏ';
}

export interface SpotVerificationInfo {
  httpStatus: number;
  imageHttpStatus: number;
  verifiedAt: string;
  geminiModel: string;
  sourceDomain: string;
  canonicalUrl: string;
  imageCount: number;
}

export interface SightingItem {
  id: string;
  reporterName: string;
  imageUrl: string;
  note: string;
  emotionTag: string;
  createdAt: string;
  distanceFromOriginMeters: number;
  lat: number;
  lng: number;
  googleMapsUrl?: string;
}

export interface ContactUnlockRequest {
  id: string;
  postId: string;
  requesterName: string;
  requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER';
  message: string;
  proofImageUrl?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface DomSpot {
  id: string;
  authorId: string;
  authorName: string;
  spotType: SpotType;
  status: SpotStatus;
  visibility: SpotVisibility;
  coupleRoomCode?: string;

  title: string;
  story: string;
  species: 'cat' | 'dog' | 'other';
  breed: string;
  coatColor: string;
  traits: string[];
  images: string[];

  publicLat: number;
  publicLng: number;
  fuzzRadiusMeters: number;
  areaLabel: string;
  formattedAddress?: string;
  hasExactLocation?: boolean;

  googleMapsUrl?: string;
  googleMapsDirectionsUrl?: string;
  googleMapsEmbedUrl?: string;
  googlePlaceId?: string;
  isSavedToGoogleMaps?: boolean;

  lightPower: number;
  boostCount: number;
  isEmergencyBoosted?: boolean;

  allowFoster: boolean;
  eyeStoryTag?: string;

  maskedPhone: string;
  rawPhoneSecret?: string;
  zaloLink?: string;
  isContactUnlockedForViewer?: boolean;

  sourceType: 'USER_POST' | 'FB_CRAWLER';
  sourcePlatform?: CrawlPlatform;
  sourceUrl?: string;
  isVerified?: boolean;
  verificationInfo?: SpotVerificationInfo;

  entityCategory?: EntityCategory;
  publishedDate?: string;

  hoursAgo: number;
  createdAt: string;

  sightings: SightingItem[];
}

export interface MemorySnap {
  id: string;
  postId: string;
  petName: string;
  weekNumber: number;
  imageUrl: string;
  caption: string;
  moodTag: string;
  weightKg?: number;
  sentToRescuer: boolean;
  rescuerName: string;
  areaLabel: string;
  googleMapsUrl?: string;
  createdAt: string;
}

export interface VetStation {
  id: string;
  name: string;
  address: string;
  hotline: string;
  is247: boolean;
  rescueDiscount: string;
  lat: number;
  lng: number;
  googleMapsUrl?: string;
  googleMapsDirectionsUrl?: string;
  googleMapsEmbedUrl?: string;
  rating?: number;
}

export interface SavedGoogleMapPlace {
  id: string;
  spotId?: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  sourcePlatform: CrawlPlatform;
  sourceUrl?: string;
  savedAt: string;
  notes?: string;
  imageUrl?: string;
  isVerified?: boolean;
  sourceDomain?: string;
}

export interface UserSession {
  id: string;
  displayName: string;
  pinCode: string;
  rawPhone: string;
  maskedPhone: string;
  deviceSecretToken: string;
  coupleRoomCode: string;
  partnerName?: string;
  patrolModeActive: boolean;
  dailyPostCount: number;
  lastPostDate: string;
  isShadowbanned: boolean;
  createdAt: string;
}

export interface SpotMatchResult {
  matchedSpot: DomSpot;
  distanceMeters: number;
  similarityScore: number;
  commonTraits: string[];
}
