import {
  DomSpot,
  MemorySnap,
  SightingItem,
  SpotType,
  SpotVisibility,
  UserSession,
  isValidVietnamesePhone,
} from './types';

export const AUTH_STORAGE_KEY = 'dom_nho_permanent_auth';
const IDB_DB_NAME = 'DomNhoPermanentVault';
const IDB_STORE_NAME = 'auth_store';
const REALTIME_CHANNEL_NAME = 'dom_nho_realtime_community_v1';

export const supabase = null;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(val: string | undefined | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

function deriveCoupleRoomCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let n = hash || 123456;
  for (let i = 0; i < 4; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `DN-${code}`;
}

function sanitizeClientSession(session: UserSession): UserSession {
  const safeSession = { ...session } as UserSession & Record<string, unknown>;
  delete safeSession.pinCode;
  delete safeSession.deviceSecretToken;
  delete safeSession.rawPhone;
  return safeSession;
}

function saveToIndexedDb(session: UserSession): void {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).put(session, AUTH_STORAGE_KEY);
    };
  } catch {
    // Fallback to localStorage + Cookie
  }
}

function removeFromIndexedDb(): void {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  try {
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) return;
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).delete(AUTH_STORAGE_KEY);
    };
  } catch {
    // Ignore
  }
}

export async function restoreFromIndexedDb(): Promise<UserSession | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const getReq = tx.objectStore(IDB_STORE_NAME).get(AUTH_STORAGE_KEY);
        getReq.onsuccess = () => {
          const result = getReq.result as UserSession | undefined;
          resolve(result ? sanitizeClientSession(result) : null);
        };
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function persistPermanentSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  const safeSession = sanitizeClientSession(session);
  const serialized = JSON.stringify(safeSession);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.localStorage.removeItem('dom_nho_device_secret_token');
  window.localStorage.removeItem('dom_nho_accounts_registry_v1');
  saveToIndexedDb(safeSession);
}

export function clearPermanentSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem('dom_nho_device_secret_token');
  window.localStorage.removeItem('dom_nho_accounts_registry_v1');
  removeFromIndexedDb();
  fetch('/api/auth', { method: 'DELETE' }).catch(() => null);
}

export async function loadPermanentSession(): Promise<UserSession | null> {
  if (typeof window === 'undefined') return null;
  let cachedSession: UserSession | null = null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      cachedSession = sanitizeClientSession(JSON.parse(raw) as UserSession);
    } else {
      const fromIdb = await restoreFromIndexedDb();
      if (fromIdb) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fromIdb));
        cachedSession = fromIdb;
      }
    }
  } catch {
    cachedSession = null;
  }

  try {
    const response = await fetch('/api/auth', {
      method: 'GET',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);
    if (response.ok && data?.ok && data.account) {
      const verified = sanitizeClientSession(data.account as UserSession);
      persistPermanentSession(verified);
      return verified;
    }
    if ((response.ok && data?.ok && !data.account) || response.status === 401) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      removeFromIndexedDb();
      return null;
    }
  } catch {
    // Offline mode can show the last safe profile, but server mutations still require the HttpOnly cookie.
  }

  if (cachedSession?.displayName && cachedSession.id) {
    persistPermanentSession(cachedSession);
    return cachedSession;
  }
  return null;
}

/**
 * Đăng nhập nhanh / Đăng ký tài khoản lưu trực tiếp vào MongoDB Atlas qua /api/auth
 */
export async function registerZeroVerificationUser(params: {
  displayName?: string;
  pinCode: string;
  rawPhone: string;
  mode?: 'login' | 'register';
}): Promise<UserSession> {
  const mode: 'login' | 'register' =
    params.mode === 'login' ? 'login' : 'register';
  const cleanName = (params.displayName || '').trim();
  const cleanPin = (params.pinCode || '').trim();
  const cleanPhone = (params.rawPhone || '').trim();
  if (!isValidVietnamesePhone(cleanPhone)) {
    throw new Error(
      'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).'
    );
  }

  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw new Error('Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.');
  }

  if (mode === 'register' && cleanName.length < 2) {
    throw new Error(
      'Vui lòng nhập Tên gọi / Biệt danh (tối thiểu 2 ký tự) để đăng ký tài khoản.'
    );
  }

  let authRes: Response;
  try {
    authRes = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: cleanName,
        rawPhone: cleanPhone,
        pinCode: cleanPin,
        mode,
      }),
    });
  } catch {
    throw new Error(
      'Không thể kết nối máy chủ xác thực. Tài khoản chưa được thay đổi.'
    );
  }
  const authData = await authRes.json().catch(() => null);
  if (!authRes.ok || !authData?.ok || !authData.account) {
    throw new Error(
      String(
        authData?.error ||
          'Không thể xác thực tài khoản. Vui lòng kiểm tra thông tin và thử lại.'
      )
    );
  }

  const session = sanitizeClientSession(authData.account as UserSession);

  persistPermanentSession(session);
  return session;
}

export async function fetchCommunitySpotsFromSupabase(
  viewerId?: string | null
): Promise<DomSpot[]> {
  if (typeof window === 'undefined') return [];
  try {
    const query = viewerId
      ? `?viewerId=${encodeURIComponent(viewerId)}`
      : '';
    const res = await fetch(`/api/spots${query}`, { cache: 'no-store' });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && Array.isArray(data.spots)) {
      return data.spots as DomSpot[];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function createSpotInSupabase(params: {
  authorId: string;
  authorName: string;
  rawPhone: string;
  pinCode?: string;
  spotType: SpotType;
  visibility?: SpotVisibility;
  coupleRoomCode?: string;
  title: string;
  story: string;
  species: 'cat' | 'dog' | 'other';
  breed: string;
  coatColor: string;
  traits: string[];
  images: string[];
  exactLat: number;
  exactLng: number;
  hasExactLocation: boolean;
  areaLabel: string;
  formattedAddress?: string;
  allowFoster: boolean;
}): Promise<{
  spot: DomSpot;
  remainingToday: number;
  dbMatches: Array<{
    matchedPostId: string;
    distanceMeters: number;
    similarityScore: number;
    commonTraits: string[];
  }>;
}> {
  const res = await fetch('/api/spots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok || !data.spot) {
    throw new Error(data?.error || 'Không thể lưu bài đăng lên MongoDB.');
  }
  return {
    spot: data.spot as DomSpot,
    remainingToday: Number(data.remainingToday ?? 2),
    dbMatches: Array.isArray(data.dbMatches) ? data.dbMatches : [],
  };
}

export async function boostSpotLightInSupabase(
  spotId: string,
  powerDelta = 20
): Promise<{ lightPower: number; boostCount: number } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/spots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'BOOST_LIGHT',
        spotId,
        delta: powerDelta,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.ok) {
      return {
        lightPower: Number(data.lightPower ?? 120),
        boostCount: Number(data.boostCount ?? 2),
      };
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function addSpotSightingInSupabase(params: {
  postId: string;
  reporterId?: string;
  reporterName: string;
  reporterPhone?: string;
  imageUrl: string;
  note: string;
  emotionTag: string;
  lat: number;
  lng: number;
  originLat?: number;
  originLng?: number;
}): Promise<SightingItem> {
  const res = await fetch('/api/spots', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ADD_SIGHTING',
      spotId: params.postId,
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      reporterPhone: params.reporterPhone,
      imageUrl: params.imageUrl,
      note: params.note,
      emotionTag: params.emotionTag,
      lat: params.lat,
      lng: params.lng,
      originLat: params.originLat || params.lat,
      originLng: params.originLng || params.lng,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.ok || !data.sighting) {
    throw new Error(data?.error || 'Không thể lưu báo cáo nhìn thấy.');
  }
  return data.sighting as SightingItem;
}

export async function unlockSpotContactInSupabase(params: {
  postId: string;
  requesterId: string;
  requesterName: string;
  requesterPhone: string;
  requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER';
  message: string;
  proofImageUrl?: string;
}): Promise<{
  rawPhone: string;
  maskedPhone: string;
  zaloLink: string;
}> {
  const res = await fetch('/api/spots', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'UNLOCK_CONTACT',
      spotId: params.postId,
      requesterId: params.requesterId,
      requesterName: params.requesterName,
      requesterPhone: params.requesterPhone,
      requestType: params.requestType,
      message: params.message,
      proofImageUrl: params.proofImageUrl,
    }),
  });
  const data = await res.json();
  return {
    rawPhone: String(data?.rawPhone || ''),
    maskedPhone: String(data?.maskedPhone || ''),
    zaloLink: String(data?.zaloLink || ''),
  };
}

export async function resolveSpotToPeaceInSupabase(
  spotId: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/spots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RESOLVE_PEACE',
        spotId,
      }),
    });
    const data = await res.json();
    return Boolean(res.ok && data?.ok);
  } catch {
    return false;
  }
}

export async function activateEmergencyBoostInSupabase(
  spotId: string
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/spots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'EMERGENCY_BOOST',
        spotId,
      }),
    });
    const data = await res.json();
    return Boolean(res.ok && data?.ok);
  } catch {
    return false;
  }
}

export async function fetchMemorySnapsFromSupabase(): Promise<MemorySnap[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/spots?includeMemories=1', {
      cache: 'no-store',
    });
    const data = await res.json();
    if (res.ok && data?.ok && Array.isArray(data.memorySnaps)) {
      return data.memorySnaps as MemorySnap[];
    }
  } catch {
    // Ignore
  }
  return [];
}

export async function createMemorySnapInSupabase(params: {
  postId?: string;
  authorId?: string;
  authorName?: string;
  authorPhone?: string;
  petName: string;
  weekNumber: number;
  imageUrl: string;
  caption: string;
  moodTag: string;
  weightKg?: number;
  lat?: number;
  lng?: number;
}): Promise<MemorySnap | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/spots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_MEMORY_SNAP',
        ...params,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.ok && data.snap) {
      return data.snap as MemorySnap;
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function syncPatrolModeInSupabase(
  session: UserSession,
  patrolModeActive: boolean
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/auth', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patrolModeActive,
      }),
    });
  } catch {
    // Ignore network error
  }
}

export async function linkCouplePartnerInSupabase(
  session: UserSession,
  partnerName: string
): Promise<{ roomCode: string; roomName: string }> {
  const roomName = `${session.displayName} & ${partnerName.trim()}`;
  const roomCode = session.coupleRoomCode || deriveCoupleRoomCode(session.id);

  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: partnerName.trim(),
          coupleRoomCode: roomCode,
        }),
      });
    } catch {
      // Ignore network error
    }
  }

  return { roomCode, roomName };
}

export async function updateSpotInSupabase(params: {
  spotId: string;
  authorId: string;
  authorName: string;
  rawPhone: string;
  spotType: SpotType;
  title: string;
  story: string;
  species: 'cat' | 'dog' | 'other';
  breed: string;
  coatColor: string;
  traits: string[];
  images: string[];
  exactLat?: number;
  exactLng?: number;
  hasExactLocation: boolean;
  areaLabel: string;
  formattedAddress?: string;
  allowFoster: boolean;
}): Promise<DomSpot | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/spots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_SPOT',
        ...params,
      }),
    });
    const data = await res.json();
    if (res.ok && data?.ok && data.spot) {
      return data.spot as DomSpot;
    }
  } catch {
    // Ignore
  }
  return null;
}

export async function deleteSpotInSupabase(spotId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/spots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotId }),
    });
    const data = await res.json();
    return Boolean(res.ok && data?.ok);
  } catch {
    return false;
  }
}

export async function broadcastCommunitySpotRealtime(
  spot: DomSpot
): Promise<void> {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return;
  }
  try {
    const safePublicSpot: DomSpot = {
      ...spot,
      rawPhoneSecret: undefined,
      zaloLink: undefined,
      isContactUnlockedForViewer: false,
    };
    const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
    bc.postMessage({ type: 'SPOT_UPSERT', spot: safePublicSpot });
    bc.close();
  } catch {
    // Ignore broadcast error
  }
}

export async function broadcastDeleteSpotRealtime(
  spotId: string
): Promise<void> {
  if (
    !spotId ||
    typeof window === 'undefined' ||
    typeof BroadcastChannel === 'undefined'
  ) {
    return;
  }
  try {
    const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
    bc.postMessage({ type: 'SPOT_DELETE', spotId });
    bc.close();
  } catch {
    // Ignore broadcast error
  }
}

export function subscribeToRealtimeCommunityFeed(
  onFeedChanged: (incomingSpot?: DomSpot, deletedSpotId?: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        const data = ev?.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'SPOT_UPSERT' && data.spot) {
          onFeedChanged(data.spot as DomSpot);
        } else if (data.type === 'SPOT_DELETE' && data.spotId) {
          onFeedChanged(undefined, String(data.spotId));
        } else {
          onFeedChanged();
        }
      };
    } catch {
      bc = null;
    }
  }

  const pollTimer = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      onFeedChanged();
    }
  }, 20000);

  return () => {
    if (bc) {
      try {
        bc.close();
      } catch {
        // Ignore
      }
    }
    window.clearInterval(pollTimer);
  };
}
