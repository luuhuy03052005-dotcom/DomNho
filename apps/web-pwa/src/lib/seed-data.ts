import crawledData from '../../public/crawled-feed.json';
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

/** Dữ liệu bài viết cứu hộ, tìm thú lạc và nhận nuôi 100% crawl thực tế từ báo chí và cộng đồng */
export const INITIAL_DOM_SPOTS: DomSpot[] = filterTrustedSpots(
  ((crawledData as any).spots as DomSpot[]) || []
);

export const VET_EMERGENCY_STATIONS: VetStation[] =
  ((crawledData as any).vetStations as VetStation[]) || [];

const trustedSpotIds = new Set(INITIAL_DOM_SPOTS.map((s) => s.id));

export const SAVED_GOOGLE_MAPS_PLACES: SavedGoogleMapPlace[] = (
  ((crawledData as any).savedGoogleMapsPlaces as SavedGoogleMapPlace[]) || []
).filter((p) => !p.spotId || trustedSpotIds.has(p.spotId));

export const INITIAL_MEMORY_SNAPS: MemorySnap[] = [];
