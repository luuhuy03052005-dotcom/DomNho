import crawledData from './crawled-data.json';
import {
  DomSpot,
  MemorySnap,
  SavedGoogleMapPlace,
  VetStation,
} from './types';
import { filterTrustedSpots } from './spot-validation';

export const DEFAULT_USER_COORDS = {
  lat: 10.7885,
  lng: 106.7025,
  label: 'Trung tâm TP. Hồ Chí Minh',
};

/** Chỉ giữ lại các đốm sáng vượt qua bộ kiểm duyệt (ảnh thật, link chuẩn, còn mới, đã phân loại) */
export const INITIAL_DOM_SPOTS: DomSpot[] = filterTrustedSpots(
  ((crawledData as any).spots as DomSpot[]) || []
);

export const VET_EMERGENCY_STATIONS: VetStation[] =
  ((crawledData as any).vetStations as VetStation[]) || [];

const trustedSpotIds = new Set(INITIAL_DOM_SPOTS.map((s) => s.id));

export const SAVED_GOOGLE_MAPS_PLACES: SavedGoogleMapPlace[] = (
  ((crawledData as any).savedGoogleMapsPlaces as SavedGoogleMapPlace[]) || []
).filter((p) => !p.spotId || trustedSpotIds.has(p.spotId));

/**
 * Kỷ niệm là dữ liệu CÁ NHÂN của người dùng (ảnh tự chụp mỗi tuần) —
 * không lấy bài viết của người khác để giả làm kỷ niệm.
 */
export const INITIAL_MEMORY_SNAPS: MemorySnap[] = [];
