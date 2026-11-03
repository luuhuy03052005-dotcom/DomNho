import { DomSpot } from './types';

/**
 * Bộ kiểm duyệt dữ liệu dùng chung — "Thà ít mà chắc, chậm mà chắc".
 * Mọi đốm sáng hiển thị trên bản đồ phải vượt qua TẤT CẢ các điều kiện dưới đây.
 */

/** Bài viết cá thể (tìm chủ / thất lạc / cần nhận nuôi) cũ hơn ngưỡng này bị loại bỏ */
export const MAX_INDIVIDUAL_POST_AGE_DAYS = 180;

/** Các nguồn ảnh minh họa / ảnh kho — tuyệt đối không được dùng làm ảnh thú cưng */
const FORBIDDEN_IMAGE_HOSTS = [
  'unsplash.com',
  'images.unsplash.com',
  'picsum.photos',
  'placekitten.com',
  'placedog.net',
  'placeholder.com',
  'via.placeholder.com',
  'dummyimage.com',
  'loremflickr.com',
  'pexels.com',
  'pixabay.com',
  'freepik.com',
  'shutterstock.com',
  'istockphoto.com',
  'gettyimages.com',
  'thumb_1000.jpg',
  'videodt3601',
];

export function isForbiddenImageUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/')) return false; // ảnh thật người dùng tự chụp / tải lên
  if (!lower.startsWith('https://') && !lower.startsWith('http://')) return true;
  return FORBIDDEN_IMAGE_HOSTS.some((h) => lower.includes(h));
}

export function isValidHttpUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function getPostAgeDays(spot: DomSpot, now = Date.now()): number | null {
  if (!spot.publishedDate) return null;
  const t = Date.parse(spot.publishedDate);
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / 86_400_000);
}

/**
 * Kiểm tra chuỗi địa chỉ có đủ thông tin cụ thể (số nhà, tên đường, phường/xã, địa danh cụ thể) hay không.
 * Nếu chỉ ghi chung chung tên Tỉnh/Thành phố hoặc Quận/Huyện mà không có phường/đường/địa danh cụ thể -> trả về false để không gán tọa độ bừa bãi lên bản đồ.
 */
export function hasSpecificAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  const text = address.trim();
  if (text.length < 6) return false;

  const specificPattern =
    /(\b\d+[a-zA-Z/]*\s+[A-ZÀ-Ỵa-zà-ỵ])|(đường|phố|hẻm|ngõ|ngách|kiệt|ấp|thôn|xóm|phường|p\.\s*\d|xã|thị trấn|khu phố|kdc|khu dân cư|chung cư|học viện|đại học|trường|bệnh viện|phòng khám|công viên|chợ|cầu|bình quới|thảo điền|trâu quỳ|bình thới|hòa khánh|linh chiểu|bến nghé|đa kao)/i;

  return specificPattern.test(text);
}

/**
 * Chỉ cho phép ghim lên Bản đồ khi bài viết thực sự có địa chỉ/vị trí cụ thể và tọa độ hợp lệ.
 * Bài viết không rõ địa chỉ cụ thể chỉ hiển thị ở chế độ Danh sách, tuyệt đối không gán vị trí bậy lên Bản đồ.
 */
export function isSpotPinAllowedOnMap(spot: DomSpot): boolean {
  if (!spot || typeof spot !== 'object') return false;
  if (spot.hasExactLocation === false) return false;
  if (!Number.isFinite(spot.publicLat) || !Number.isFinite(spot.publicLng)) {
    return false;
  }
  if (Math.abs(spot.publicLat) < 0.1 || Math.abs(spot.publicLng) < 0.1) {
    return false;
  }
  if (spot.sourceType === 'USER_POST') {
    return true;
  }
  return hasSpecificAddress(spot.formattedAddress || spot.areaLabel);
}

/**
 * Trả về lý do bị loại (string) hoặc null nếu bài viết hợp lệ.
 */
export function getSpotRejectionReason(spot: DomSpot, now = Date.now()): string | null {
  if (!spot || typeof spot !== 'object') return 'invalid';
  if (!Array.isArray(spot.images) || spot.images.length === 0) return 'no-image';
  const cleanImages = spot.images.filter((img) => !isForbiddenImageUrl(img));
  if (cleanImages.length === 0) return 'forbidden-image';

  if (spot.sourceType === 'USER_POST') return null;

  if (!isValidHttpUrl(spot.sourceUrl)) return 'invalid-source-url';
  if (!spot.isVerified) return 'not-verified';
  if (spot.entityCategory !== 'RESCUE_CENTER' && spot.entityCategory !== 'INDIVIDUAL_PET') {
    return 'unclassified';
  }

  if (spot.entityCategory === 'INDIVIDUAL_PET') {
    const age = getPostAgeDays(spot, now);
    if (age === null) return 'unknown-publish-date';
    if (age > MAX_INDIVIDUAL_POST_AGE_DAYS) return 'outdated-post';
  }

  return null;
}

export function filterTrustedSpots(spots: DomSpot[], now = Date.now()): DomSpot[] {
  return (spots || [])
    .filter((s) => getSpotRejectionReason(s, now) === null)
    .map((s) => {
      const exact = isSpotPinAllowedOnMap(s);
      const cleanImages = (s.images || []).filter((img) => !isForbiddenImageUrl(img));
      return {
        ...s,
        images: cleanImages.length > 0 ? cleanImages : s.images,
        hasExactLocation: exact,
      };
    });
}

