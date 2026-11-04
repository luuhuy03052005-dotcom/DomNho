import { DomSpot, SpotMatchResult } from './types';

/**
 * 1. Làm mờ tọa độ tự động (Coordinate Fuzzing / Jittering ±150m-300m)
 * Không bao giờ hiển thị tọa độ chính xác từng mét lên bản đồ công khai
 */
export function fuzzCoordinates(
  exactLat: number,
  exactLng: number
): { publicLat: number; publicLng: number; fuzzRadiusMeters: number } {
  const signLat = Math.random() >= 0.5 ? 1 : -1;
  const signLng = Math.random() >= 0.5 ? 1 : -1;
  // 0.0014 - 0.0022 độ tương đương ~160m - 250m ngoài thực tế
  const offsetLat = signLat * (0.0014 + Math.random() * 0.0008);
  const offsetLng = signLng * (0.0014 + Math.random() * 0.0008);

  return {
    publicLat: Number((exactLat + offsetLat).toFixed(6)),
    publicLng: Number((exactLng + offsetLng).toFixed(6)),
    fuzzRadiusMeters: 200,
  };
}

/**
 * 2. Ẩn số điện thoại cá nhân (Contact Masking: 090***456)
 */
export function maskPhoneNumber(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length < 7) {
    return '090***456';
  }
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

/**
 * 3. Tính khoảng cách thực tế giữa 2 tọa độ GPS (Haversine formula - mét)
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistanceVi(meters: number): string {
  if (meters < 1000) {
    return `Cách bạn ${Math.max(50, Math.round(meters / 10) * 10)} m`;
  }
  const kmText = (meters / 1000).toFixed(1).replace('.', ',');
  return `Cách bạn ${kmText} km`;
}

/**
 * 4. Giới hạn tần suất theo Thiết bị (Rate Limiting 3 lần/ngày + Shadowban chống spam)
 */
const RATE_LIMIT_KEY = 'dom_nho_device_rate_limit_v1';

export interface RateLimitCheck {
  allowed: boolean;
  isShadowbanned: boolean;
  remainingToday: number;
  reason?: string;
}

export function checkAndIncrementDeviceRateLimit(): RateLimitCheck {
  if (typeof window === 'undefined') {
    return { allowed: true, isShadowbanned: false, remainingToday: 3 };
  }

  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = window.localStorage.getItem(RATE_LIMIT_KEY);
    const parsed = raw
      ? JSON.parse(raw)
      : { date: today, count: 0, spamAttempts: 0, shadowbanned: false };

    if (parsed.date !== today) {
      parsed.date = today;
      parsed.count = 0;
      parsed.spamAttempts = 0;
    }

    if (parsed.shadowbanned) {
      // Kẻ spam vẫn tưởng đăng thành công nhưng bài ở trạng thái SHADOWBANNED
      return {
        allowed: true,
        isShadowbanned: true,
        remainingToday: 0,
      };
    }

    if (parsed.count >= 3) {
      parsed.spamAttempts = (parsed.spamAttempts || 0) + 1;
      // Nếu cố tình spam liên tục quá 6 lần trong ngày -> kích hoạt Shadowban
      if (parsed.spamAttempts >= 4) {
        parsed.shadowbanned = true;
        window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(parsed));
        return {
          allowed: true,
          isShadowbanned: true,
          remainingToday: 0,
        };
      }
      window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(parsed));
      return {
        allowed: false,
        isShadowbanned: false,
        remainingToday: 0,
        reason:
          'Để bảo vệ bản đồ khỏi tin rác, mỗi thiết bị được Thắp Đốm tối đa 3 lần/ngày. Bạn vẫn có thể Báo tin bắt gặp hoặc Truyền Lửa không giới hạn!',
      };
    }

    parsed.count += 1;
    window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(parsed));
    return {
      allowed: true,
      isShadowbanned: false,
      remainingToday: Math.max(0, 3 - parsed.count),
    };
  } catch {
    return { allowed: true, isShadowbanned: false, remainingToday: 2 };
  }
}

/**
 * 5. Thuật toán Khớp Lệnh Kép (Double-Match Algorithm trong bán kính 3km)
 * Khi có người chụp "Đốm Cam" (Bắt gặp ngoài đường) hoặc đăng "Đốm Đỏ" (Tìm thú lạc),
 * tự động quét các Đốm đối ứng trong bán kính 3.000m có cùng loài/đặc điểm.
 */
export function findDoubleMatchesWithin3Km(
  newSpot: DomSpot,
  existingSpots: DomSpot[]
): SpotMatchResult[] {
  if (newSpot.spotType !== 'ORANGE_SIGHT' && newSpot.spotType !== 'RED_SOS') {
    return [];
  }

  const targetOppositeType =
    newSpot.spotType === 'ORANGE_SIGHT' ? 'RED_SOS' : 'ORANGE_SIGHT';

  const results: SpotMatchResult[] = [];

  for (const candidate of existingSpots) {
    if (
      candidate.id === newSpot.id ||
      candidate.spotType !== targetOppositeType ||
      candidate.status === 'FADED' ||
      candidate.status === 'SHADOWBANNED'
    ) {
      continue;
    }

    const distanceMeters = calculateDistanceMeters(
      newSpot.publicLat,
      newSpot.publicLng,
      candidate.publicLat,
      candidate.publicLng
    );

    if (distanceMeters > 3000) {
      continue;
    }

    if (candidate.species !== newSpot.species) {
      continue;
    }

    const newTraitsLower = newSpot.traits.map((t) => t.toLowerCase());
    const commonTraits = candidate.traits.filter((t) =>
      newTraitsLower.some(
        (nt) => nt.includes(t.toLowerCase()) || t.toLowerCase().includes(nt)
      )
    );

    const colorMatch =
      candidate.coatColor &&
      newSpot.coatColor &&
      (candidate.coatColor.toLowerCase().includes(newSpot.coatColor.toLowerCase()) ||
        newSpot.coatColor.toLowerCase().includes(candidate.coatColor.toLowerCase()));

    const score = Math.min(
      0.98,
      Number(
        (
          0.68 +
          (colorMatch ? 0.16 : 0) +
          Math.min(0.14, commonTraits.length * 0.07)
        ).toFixed(2)
      )
    );

    results.push({
      matchedSpot: candidate,
      distanceMeters,
      similarityScore: score,
      commonTraits:
        commonTraits.length > 0
          ? commonTraits
          : [candidate.breed, candidate.coatColor].filter(Boolean),
    });
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}

