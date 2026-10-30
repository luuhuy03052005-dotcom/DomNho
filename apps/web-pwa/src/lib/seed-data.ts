import crawledData from './crawled-data.json';
import {
  DomSpot,
  MemorySnap,
  SavedGoogleMapPlace,
  VetStation,
} from './types';
import { filterTrustedSpots } from './spot-validation';

export const DEFAULT_USER_COORDS = {
  lat: 10.8505,
  lng: 106.7717,
  label: 'Thủ Đức, TP.HCM',
};

export const FEATURED_SPEC_SPOTS: DomSpot[] = [
  {
    id: 'featured-muop-1',
    authorId: 'community_rescuer_1',
    authorName: 'Minh Thư (Cứu Hộ Thủ Đức)',
    spotType: 'RED_SOS',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    title: 'Mướp cần người đón',
    story: 'Mèo con khoảng 3 tháng tuổi, bị kẹt ngoài ban công tầng 3 đã 2 ngày. Cần người có thang hoặc dụng cụ cứu hộ hỗ trợ đưa bé đến phòng khám.',
    species: 'cat',
    breed: 'Mèo Mướp',
    coatColor: 'Vàng trắng',
    traits: ['Mèo con 3 tháng', 'Kẹt ban công', 'Cần sơ cứu'],
    images: [
      'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=1200&q=80',
    ],
    publicLat: 10.8545,
    publicLng: 106.7628,
    fuzzRadiusMeters: 50,
    areaLabel: 'Linh Chiểu, TP. Thủ Đức',
    formattedAddress: 'Đường Số 16, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
    hasExactLocation: true,
    publishedDate: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    hoursAgo: 0.3,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    sourceType: 'USER_POST',
    sourcePlatform: 'RESCUE_PORTAL',
    isVerified: true,
    lightPower: 250,
    boostCount: 42,
    allowFoster: true,
    maskedPhone: '090 ••• •812',
    rawPhoneSecret: '0901234812',
    sightings: [],
  },
  {
    id: 'featured-bong-2',
    authorId: 'community_foster_2',
    authorName: 'Trạm Tạm Trú Bình Thạnh',
    spotType: 'YELLOW_ADOPT',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    title: 'Bông chờ một mái nhà',
    story: 'Bé cún ta lai lông vàng kem rất ngoan, quấn người và biết đi vệ sinh đúng chỗ. Đã được tẩy giun và tiêm 2 mũi phòng bệnh. Thân thiện với trẻ em và thú cưng khác.',
    species: 'dog',
    breed: 'Chó ta lai',
    coatColor: 'Vàng kem',
    traits: ['8 tháng tuổi', 'Đã tiêm phòng', 'Đã triệt sản', 'Thân thiện'],
    images: [
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80',
    ],
    publicLat: 10.8032,
    publicLng: 106.7145,
    fuzzRadiusMeters: 50,
    areaLabel: 'Bình Thạnh, TP.HCM',
    formattedAddress: 'Phường 25, Quận Bình Thạnh, TP.HCM',
    hasExactLocation: true,
    publishedDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    hoursAgo: 4,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    sourceType: 'USER_POST',
    sourcePlatform: 'RESCUE_PORTAL',
    isVerified: true,
    lightPower: 180,
    boostCount: 28,
    allowFoster: true,
    maskedPhone: '093 ••• •556',
    rawPhoneSecret: '0939888556',
    sightings: [],
  },
];

const RAW_CRAWLED_SPOTS: DomSpot[] = filterTrustedSpots(
  ((crawledData as any).spots as DomSpot[]) || []
);

export const INITIAL_DOM_SPOTS: DomSpot[] = [
  ...FEATURED_SPEC_SPOTS,
  ...RAW_CRAWLED_SPOTS.filter(
    (s) => s.id !== 'featured-muop-1' && s.id !== 'featured-bong-2'
  ),
];

export const VET_EMERGENCY_STATIONS: VetStation[] =
  ((crawledData as any).vetStations as VetStation[]) || [];

const trustedSpotIds = new Set(INITIAL_DOM_SPOTS.map((s) => s.id));

export const SAVED_GOOGLE_MAPS_PLACES: SavedGoogleMapPlace[] = (
  ((crawledData as any).savedGoogleMapsPlaces as SavedGoogleMapPlace[]) || []
).filter((p) => !p.spotId || trustedSpotIds.has(p.spotId));

export const INITIAL_MEMORY_SNAPS: MemorySnap[] = [];
