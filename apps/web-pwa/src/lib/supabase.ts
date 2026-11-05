import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { calculateDistanceMeters, maskPhoneNumber } from './security';
import {
  DomSpot,
  MemorySnap,
  SightingItem,
  SpotStatus,
  SpotType,
  SpotVisibility,
  UserSession,
} from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const AUTH_STORAGE_KEY = 'dom_nho_permanent_auth';
export const DEVICE_TOKEN_KEY = 'dom_nho_device_secret_token';
const ACCOUNTS_REGISTRY_KEY = 'dom_nho_accounts_registry_v1';
const IDB_DB_NAME = 'DomNhoPermanentVault';
const IDB_STORE_NAME = 'auth_store';

interface StoredAccountRecord {
  id: string;
  displayName: string;
  normalizedPhone: string;
  rawPhone: string;
  maskedPhone: string;
  pinHash: string;
  deviceSecretToken: string;
  coupleRoomCode: string;
  patrolModeActive: boolean;
  createdAt: string;
}

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project-id')
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY,
        },
      })
    : null;

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function computePinHash(
  normalizedPhone: string,
  pinCode: string
): Promise<string> {
  const payload = `domnho_auth_v1:${normalizedPhone}:${pinCode}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(payload);
    const digest = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
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

function loadLocalAccountsRegistry(): Record<string, StoredAccountRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalAccountRecord(record: StoredAccountRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const registry = loadLocalAccountsRegistry();
    registry[record.normalizedPhone] = record;
    window.localStorage.setItem(ACCOUNTS_REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Ignore storage quota errors
  }
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
    // Fallback sang localStorage + Cookie
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
        getReq.onsuccess = () => resolve((getReq.result as UserSession) || null);
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
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  window.localStorage.setItem(DEVICE_TOKEN_KEY, session.deviceSecretToken);
  document.cookie = `${DEVICE_TOKEN_KEY}=${encodeURIComponent(
    session.deviceSecretToken
  )}; path=/; max-age=315360000; SameSite=Lax`;
  saveToIndexedDb(session);
}

export function clearPermanentSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(DEVICE_TOKEN_KEY);
  document.cookie = `${DEVICE_TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  removeFromIndexedDb();
}

export async function loadPermanentSession(): Promise<UserSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    let session: UserSession | null = null;
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      session = JSON.parse(raw) as UserSession;
    } else {
      const fromIdb = await restoreFromIndexedDb();
      if (fromIdb) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fromIdb));
        session = fromIdb;
      }
    }

    if (!session || !session.displayName || !session.rawPhone) {
      return null;
    }

    // Đồng bộ ngầm từ bảng profiles của Supabase nếu có kết nối
    if (supabase && session.deviceSecretToken) {
      try {
        const { data: remoteProfile } = await supabase
          .from('profiles')
          .select('id, display_name, patrol_mode_active, is_shadowbanned, created_at')
          .eq('device_secret_token', session.deviceSecretToken)
          .maybeSingle();

        if (remoteProfile) {
          session = {
            ...session,
            id: remoteProfile.id,
            displayName: remoteProfile.display_name || session.displayName,
            patrolModeActive:
              typeof remoteProfile.patrol_mode_active === 'boolean'
                ? remoteProfile.patrol_mode_active
                : session.patrolModeActive,
            isShadowbanned: Boolean(remoteProfile.is_shadowbanned),
          };
          persistPermanentSession(session);
        }
      } catch {
        // Giữ phiên hiện tại nếu mạng gián đoạn
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Đăng nhập nhanh / Tạo tài khoản thực tế (không hardcode, đối chiếu mã PIN & lưu vào Supabase profiles)
 */
export async function registerZeroVerificationUser(params: {
  displayName?: string;
  pinCode: string;
  rawPhone: string;
  mode?: 'login' | 'register';
}): Promise<UserSession> {
  const cleanName = (params.displayName || '').trim();
  const cleanPin = (params.pinCode || '').trim();
  const cleanPhone = (params.rawPhone || '').trim();
  const normalizedPhone = cleanPhone.replace(/\D/g, '');

  if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
    throw new Error('Vui lòng nhập số điện thoại hợp lệ (từ 9 đến 11 chữ số).');
  }

  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw new Error('Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.');
  }

  const pinHash = await computePinHash(normalizedPhone, cleanPin);
  const accountDeviceToken = `dom_phone_${normalizedPhone}`;
  const maskedPhone = maskPhoneNumber(cleanPhone);
  const registry = loadLocalAccountsRegistry();
  const localExisting = registry[normalizedPhone];

  let profileId = localExisting?.id || generateUuidV4();
  let finalDisplayName = cleanName || localExisting?.displayName || '';
  let patrolModeActive = localExisting?.patrolModeActive ?? true;
  let isShadowbanned = false;
  let createdAt = localExisting?.createdAt || new Date().toISOString();
  let verifiedFromRemote = false;

  // 1. Kiểm tra & đồng bộ trực tiếp trên bảng public.profiles của Supabase
  if (supabase) {
    const { data: existingRemote, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('device_secret_token', accountDeviceToken)
      .maybeSingle();

    if (!fetchError && existingRemote) {
      if (existingRemote.pin_hash !== pinHash) {
        throw new Error(
          'Số điện thoại này đã có tài khoản nhưng mã PIN không chính xác.'
        );
      }

      verifiedFromRemote = true;
      profileId = existingRemote.id;
      finalDisplayName = cleanName.length >= 2 ? cleanName : existingRemote.display_name;
      patrolModeActive =
        typeof existingRemote.patrol_mode_active === 'boolean'
          ? existingRemote.patrol_mode_active
          : true;
      isShadowbanned = Boolean(existingRemote.is_shadowbanned);
      createdAt = existingRemote.created_at || createdAt;

      if (cleanName.length >= 2 && cleanName !== existingRemote.display_name) {
        await supabase
          .from('profiles')
          .update({
            display_name: cleanName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRemote.id);
      }
    } else if (!fetchError && !existingRemote) {
      // Tài khoản chưa tồn tại trên Supabase
      if (params.mode === 'login' && !localExisting && cleanName.length < 2) {
        throw new Error(
          'Số điện thoại này chưa được đăng ký. Vui lòng chuyển sang tab "Tạo tài khoản mới" và nhập Tên gọi của bạn.'
        );
      }

      const nameToRegister = cleanName || localExisting?.displayName || '';
      if (nameToRegister.length < 2) {
        throw new Error(
          'Vui lòng nhập Tên gọi / Biệt danh (tối thiểu 2 ký tự) để tạo tài khoản.'
        );
      }

      const { data: insertedRemote, error: insertError } = await supabase
        .from('profiles')
        .insert({
          display_name: nameToRegister,
          pin_hash: pinHash,
          device_secret_token: accountDeviceToken,
          patrol_mode_active: true,
        })
        .select('*')
        .single();

      if (!insertError && insertedRemote) {
        verifiedFromRemote = true;
        profileId = insertedRemote.id;
        finalDisplayName = insertedRemote.display_name;
        patrolModeActive = Boolean(insertedRemote.patrol_mode_active);
        isShadowbanned = Boolean(insertedRemote.is_shadowbanned);
        createdAt = insertedRemote.created_at || createdAt;
      }
    }
  }

  // 2. Đồng bộ qua /api/auth của máy chủ để đảm bảo đăng nhập trên mọi thiết bị
  if (!verifiedFromRemote && typeof window !== 'undefined') {
    try {
      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profileId,
          displayName: cleanName,
          rawPhone: cleanPhone,
          pinCode: cleanPin,
          mode: params.mode || 'register',
        }),
      });
      const authData = await authRes.json().catch(() => null);
      if (!authRes.ok || !authData?.ok) {
        if (authData?.error) {
          throw new Error(authData.error);
        }
      } else if (authData.account) {
        verifiedFromRemote = true;
        profileId = authData.account.id;
        finalDisplayName = authData.account.displayName;
        patrolModeActive = Boolean(authData.account.patrolModeActive);
        isShadowbanned = Boolean(authData.account.isShadowbanned);
        createdAt = authData.account.createdAt || createdAt;
      }
    } catch (err: any) {
      if (
        err?.message &&
        (err.message.includes('PIN') || err.message.includes('chưa được đăng ký'))
      ) {
        throw err;
      }
    }
  }

  // 3. Nếu đang ngoại tuyến, kiểm tra bộ nhớ tài khoản trên thiết bị
  if (!verifiedFromRemote) {
    if (localExisting) {
      if (localExisting.pinHash !== pinHash) {
        throw new Error(
          'Số điện thoại này đã có tài khoản nhưng mã PIN không chính xác.'
        );
      }
      finalDisplayName = cleanName.length >= 2 ? cleanName : localExisting.displayName;
      profileId = localExisting.id;
    } else {
      if (params.mode === 'login' && cleanName.length < 2) {
        throw new Error(
          'Không tìm thấy tài khoản với số điện thoại này. Vui lòng chọn "Tạo tài khoản mới" và nhập Tên gọi của bạn.'
        );
      }
      if (cleanName.length < 2) {
        throw new Error(
          'Vui lòng nhập Tên gọi / Biệt danh (tối thiểu 2 ký tự) để đăng ký.'
        );
      }
      finalDisplayName = cleanName;
    }
  }

  const coupleRoomCode =
    localExisting?.coupleRoomCode || deriveCoupleRoomCode(profileId);

  saveLocalAccountRecord({
    id: profileId,
    displayName: finalDisplayName,
    normalizedPhone,
    rawPhone: cleanPhone,
    maskedPhone,
    pinHash,
    deviceSecretToken: accountDeviceToken,
    coupleRoomCode,
    patrolModeActive,
    createdAt,
  });

  const session: UserSession = {
    id: profileId,
    displayName: finalDisplayName,
    pinCode: cleanPin,
    rawPhone: cleanPhone,
    maskedPhone,
    deviceSecretToken: accountDeviceToken,
    coupleRoomCode,
    patrolModeActive,
    dailyPostCount: 0,
    lastPostDate: new Date().toISOString().slice(0, 10),
    isShadowbanned,
    createdAt,
  };

  persistPermanentSession(session);
  return session;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(val: string | undefined | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

interface PostMetaPayload {
  maskedPhone?: string;
  formattedAddress?: string;
  hasExactLocation?: boolean;
  coupleRoomCode?: string;
}

function encodePostMeta(meta: PostMetaPayload): string {
  return JSON.stringify(meta);
}

function decodePostMeta(raw?: string | null): PostMetaPayload {
  if (!raw || !raw.startsWith('{')) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function extractPhoneFromDeviceToken(
  token?: string | null
): string | null {
  if (!token) return null;
  if (token.startsWith('dom_phone_')) {
    const digits = token.replace('dom_phone_', '').replace(/\D/g, '');
    return digits.length >= 7 ? digits : null;
  }
  return null;
}

/**
 * Đảm bảo hồ sơ người dùng tồn tại thực tế trên bảng public.profiles của Supabase
 * trước khi thực hiện các thao tác có khóa ngoại (author_id, requester_id, reporter_id).
 */
export async function ensureProfileInSupabase(
  session: Pick<
    UserSession,
    'id' | 'displayName' | 'rawPhone' | 'pinCode' | 'patrolModeActive'
  >
): Promise<{
  profileId: string;
  isShadowbanned: boolean;
  dailyPostCount: number;
  lastPostDate: string;
}> {
  const normalizedPhone = (session.rawPhone || '').replace(/\D/g, '');
  const deviceToken = normalizedPhone
    ? `dom_phone_${normalizedPhone}`
    : `dom_uid_${session.id}`;
  const today = new Date().toISOString().slice(0, 10);

  if (!supabase) {
    return {
      profileId: isValidUuid(session.id) ? session.id : generateUuidV4(),
      isShadowbanned: false,
      dailyPostCount: 0,
      lastPostDate: today,
    };
  }

  // 1. Tìm theo id hoặc device_secret_token
  const { data: byToken } = await supabase
    .from('profiles')
    .select(
      'id, display_name, is_shadowbanned, daily_post_count, last_post_date'
    )
    .eq('device_secret_token', deviceToken)
    .maybeSingle();

  if (byToken) {
    return {
      profileId: byToken.id,
      isShadowbanned: Boolean(byToken.is_shadowbanned),
      dailyPostCount:
        byToken.last_post_date === today
          ? Number(byToken.daily_post_count || 0)
          : 0,
      lastPostDate: String(byToken.last_post_date || today),
    };
  }

  if (isValidUuid(session.id)) {
    const { data: byId } = await supabase
      .from('profiles')
      .select(
        'id, display_name, is_shadowbanned, daily_post_count, last_post_date'
      )
      .eq('id', session.id)
      .maybeSingle();

    if (byId) {
      return {
        profileId: byId.id,
        isShadowbanned: Boolean(byId.is_shadowbanned),
        dailyPostCount:
          byId.last_post_date === today
            ? Number(byId.daily_post_count || 0)
            : 0,
        lastPostDate: String(byId.last_post_date || today),
      };
    }
  }

  // 2. Chưa có -> tạo mới trên public.profiles
  const pinHash = await computePinHash(
    normalizedPhone || session.id,
    session.pinCode || '0000'
  );
  const candidateId = isValidUuid(session.id) ? session.id : generateUuidV4();

  const { data: inserted, error } = await supabase
    .from('profiles')
    .insert({
      id: candidateId,
      display_name: session.displayName.trim(),
      pin_hash: pinHash,
      device_secret_token: deviceToken,
      patrol_mode_active: session.patrolModeActive ?? true,
    })
    .select('id, is_shadowbanned, daily_post_count, last_post_date')
    .single();

  if (!error && inserted) {
    return {
      profileId: inserted.id,
      isShadowbanned: Boolean(inserted.is_shadowbanned),
      dailyPostCount: 0,
      lastPostDate: today,
    };
  }

  return {
    profileId: candidateId,
    isShadowbanned: false,
    dailyPostCount: 0,
    lastPostDate: today,
  };
}

export function mapDbSightingRowToItem(row: any): SightingItem {
  const lat = Number(row.public_lat || 0);
  const lng = Number(row.public_lng || 0);
  return {
    id: String(row.id),
    reporterName: String(row.reporter_name || ''),
    imageUrl: String(row.image_url || ''),
    note: String(row.note || ''),
    emotionTag: String(row.emotion_tag || ''),
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })
      : '',
    distanceFromOriginMeters: Number(row.distance_from_origin_m || 0),
    lat,
    lng,
    googleMapsUrl:
      lat && lng
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : undefined,
  };
}

export function mapDbPostRowToDomSpot(
  row: any,
  options?: {
    sightings?: SightingItem[];
    viewerId?: string | null;
    unlockedPostIds?: Set<string>;
    authorRawPhone?: string | null;
  }
): DomSpot {
  const meta = decodePostMeta(row.content_simhash);
  const createdIso = row.created_at
    ? new Date(row.created_at).toISOString()
    : new Date().toISOString();
  const hoursAgo = Math.max(
    0,
    Math.round((Date.now() - Date.parse(createdIso)) / 3_600_000)
  );

  const publicLat = Number(row.public_lat || 0);
  const publicLng = Number(row.public_lng || 0);
  const hasCoords = Math.abs(publicLat) > 0.1 && Math.abs(publicLng) > 0.1;
  const hasExactLocation =
    typeof meta.hasExactLocation === 'boolean'
      ? meta.hasExactLocation && hasCoords
      : hasCoords;

  const rawPhoneFromAuthor = options?.authorRawPhone || '';
  const maskedPhone =
    meta.maskedPhone ||
    (rawPhoneFromAuthor
      ? maskPhoneNumber(rawPhoneFromAuthor)
      : 'Chưa cung cấp SĐT');

  const isOwner = Boolean(
    options?.viewerId && row.author_id && options.viewerId === row.author_id
  );
  const isUnlocked =
    isOwner || Boolean(options?.unlockedPostIds?.has(String(row.id)));

  const areaLabel = String(row.area_label || '');
  const formattedAddress = meta.formattedAddress || areaLabel;

  return {
    id: String(row.id),
    authorId: String(row.author_id || ''),
    authorName: String(row.author_name || ''),
    spotType: (row.spot_type as SpotType) || 'RED_SOS',
    status: (row.status as SpotStatus) || 'ACTIVE',
    visibility: (row.visibility as SpotVisibility) || 'PUBLIC',
    coupleRoomCode: meta.coupleRoomCode,
    title: String(row.title || ''),
    story: String(row.story || ''),
    species:
      row.species === 'dog' || row.species === 'other' ? row.species : 'cat',
    breed: String(row.breed || ''),
    coatColor: String(row.coat_color || ''),
    traits: Array.isArray(row.traits) ? row.traits.map(String) : [],
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    publicLat,
    publicLng,
    fuzzRadiusMeters: Number(row.fuzz_radius_meters || 200),
    areaLabel,
    formattedAddress,
    hasExactLocation,
    googleMapsUrl: hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${publicLat},${publicLng}`
      : undefined,
    googleMapsDirectionsUrl: hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${publicLat},${publicLng}`
      : undefined,
    lightPower: Number(row.light_power ?? 100),
    boostCount: Number(row.boost_count ?? 1),
    isEmergencyBoosted: Boolean(row.is_emergency_boosted),
    allowFoster: Boolean(row.allow_foster),
    maskedPhone,
    rawPhoneSecret:
      isUnlocked && rawPhoneFromAuthor ? rawPhoneFromAuthor : undefined,
    zaloLink:
      isUnlocked && rawPhoneFromAuthor
        ? `https://zalo.me/${rawPhoneFromAuthor.replace(/\D/g, '')}`
        : undefined,
    isContactUnlockedForViewer: isUnlocked,
    sourceType: row.source_type === 'FB_CRAWLER' ? 'FB_CRAWLER' : 'USER_POST',
    sourcePlatform:
      row.source_type === 'FB_CRAWLER' ? 'SOCIAL_MEDIA' : 'USER_POST',
    sourceUrl: row.source_url || undefined,
    isVerified: true,
    entityCategory: 'INDIVIDUAL_PET',
    publishedDate: createdIso,
    hoursAgo,
    createdAt: createdIso,
    sightings: options?.sightings || [],
  };
}

/**
 * Tải toàn bộ danh sách bài đăng cộng đồng từ Supabase (public.dom_nho_posts + spot_sightings)
 */
export async function fetchCommunitySpotsFromSupabase(
  viewerId?: string | null
): Promise<DomSpot[]> {
  if (!supabase) return [];

  const { data: postRows, error: postError } = await supabase
    .from('dom_nho_posts')
    .select('*')
    .gt('light_power', 0)
    .in('status', ['ACTIVE', 'MATCHED', 'RESOLVED'])
    .order('is_emergency_boosted', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (postError || !Array.isArray(postRows) || postRows.length === 0) {
    return [];
  }

  const postIds = postRows.map((r) => String(r.id));
  const authorIds = Array.from(
    new Set(
      postRows
        .map((r) => (r.author_id ? String(r.author_id) : ''))
        .filter((id) => isValidUuid(id))
    )
  );

  // Tải song song: sightings, profiles (để lấy SĐT che/mở khóa), và unlock_requests của viewer
  const [sightingsRes, profilesRes, unlockRes] = await Promise.all([
    supabase
      .from('spot_sightings')
      .select('*')
      .in('post_id', postIds)
      .order('created_at', { ascending: false }),
    authorIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, device_secret_token')
          .in('id', authorIds)
      : Promise.resolve({ data: [] as any[] }),
    viewerId && isValidUuid(viewerId)
      ? supabase
          .from('contact_unlock_requests')
          .select('post_id')
          .eq('requester_id', viewerId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const sightingsByPost = new Map<string, SightingItem[]>();
  for (const sRow of sightingsRes.data || []) {
    const pid = String(sRow.post_id);
    const list = sightingsByPost.get(pid) || [];
    list.push(mapDbSightingRowToItem(sRow));
    sightingsByPost.set(pid, list);
  }

  const phoneByAuthor = new Map<string, string>();
  for (const pRow of profilesRes.data || []) {
    const phone = extractPhoneFromDeviceToken(pRow.device_secret_token);
    if (phone) {
      phoneByAuthor.set(String(pRow.id), phone);
    }
  }

  const unlockedPostIds = new Set<string>(
    (unlockRes.data || []).map((u: any) => String(u.post_id))
  );

  return postRows.map((row) =>
    mapDbPostRowToDomSpot(row, {
      sightings: sightingsByPost.get(String(row.id)) || [],
      viewerId,
      unlockedPostIds,
      authorRawPhone: row.author_id
        ? phoneByAuthor.get(String(row.author_id)) || null
        : null,
    })
  );
}

/**
 * Tạo bài đăng mới trực tiếp vào bảng public.dom_nho_posts của Supabase
 * Tuân thủ đầy đủ Business Rules:
 * - Giới hạn tối đa 3 bài/ngày/tài khoản, vượt ngưỡng nhiều lần -> SHADOWBANNED
 * - Lưu exact_location và tự động làm mờ public_lat/public_lng (±150m-300m) qua Trigger PostGIS
 * - Ẩn số điện thoại thô (Contact Masking)
 * - Quét thuật toán Khớp Lệnh Kép 3km (find_matching_spots_within_3km RPC)
 */
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
  if (!supabase) {
    throw new Error('Chưa kết nối được cơ sở dữ liệu Supabase.');
  }

  const cleanAuthorName = (params.authorName || '').trim();
  const cleanPhone = (params.rawPhone || '').trim();
  const normalizedPhone = cleanPhone.replace(/\D/g, '');

  if (cleanAuthorName.length < 2) {
    throw new Error('Vui lòng nhập tên người đăng hợp lệ.');
  }
  if (normalizedPhone.length < 9) {
    throw new Error('Vui lòng cung cấp số điện thoại liên hệ hợp lệ.');
  }
  if (!Array.isArray(params.images) || params.images.length === 0) {
    throw new Error('Vui lòng tải lên ít nhất 1 bức ảnh thực tế.');
  }

  // 1. Đảm bảo hồ sơ tác giả tồn tại trên public.profiles & kiểm tra Rate Limit 3 bài/ngày
  const profileInfo = await ensureProfileInSupabase({
    id: params.authorId,
    displayName: cleanAuthorName,
    rawPhone: cleanPhone,
    pinCode: params.pinCode || '0000',
    patrolModeActive: true,
  });

  const today = new Date().toISOString().slice(0, 10);
  const nextPostCount = profileInfo.dailyPostCount + 1;
  let shouldShadowban = profileInfo.isShadowbanned;

  if (profileInfo.dailyPostCount >= 3 && !shouldShadowban) {
    if (profileInfo.dailyPostCount >= 6) {
      shouldShadowban = true;
      await supabase
        .from('profiles')
        .update({
          is_shadowbanned: true,
          daily_post_count: nextPostCount,
          last_post_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileInfo.profileId);
    } else {
      await supabase
        .from('profiles')
        .update({
          daily_post_count: nextPostCount,
          last_post_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileInfo.profileId);
      throw new Error(
        'Mỗi tài khoản chỉ được đăng tối đa 3 bài/ngày để chống tin rác. Bạn vẫn có thể Báo phát hiện mới hoặc Quan tâm bài viết không giới hạn.'
      );
    }
  } else {
    await supabase
      .from('profiles')
      .update({
        daily_post_count: nextPostCount,
        last_post_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileInfo.profileId);
  }

  const maskedPhone = maskPhoneNumber(cleanPhone);
  const metaString = encodePostMeta({
    maskedPhone,
    formattedAddress: params.formattedAddress || params.areaLabel,
    hasExactLocation: params.hasExactLocation,
    coupleRoomCode: params.coupleRoomCode,
  });

  const statusToInsert: SpotStatus = shouldShadowban
    ? 'SHADOWBANNED'
    : 'ACTIVE';

  const { data: insertedRow, error: insertError } = await supabase
    .from('dom_nho_posts')
    .insert({
      author_id: profileInfo.profileId,
      author_name: cleanAuthorName,
      spot_type: params.spotType,
      status: statusToInsert,
      visibility: params.visibility || 'PUBLIC',
      title: params.title.trim(),
      story: params.story.trim(),
      species: params.species,
      breed: params.breed.trim(),
      coat_color: params.coatColor.trim(),
      traits: params.traits,
      images: params.images,
      public_lat: params.exactLat,
      public_lng: params.exactLng,
      public_location: `POINT(${params.exactLng} ${params.exactLat})`,
      fuzz_radius_meters: 200,
      area_label: params.areaLabel.trim(),
      light_power: 120,
      boost_count: 1,
      allow_foster: Boolean(params.allowFoster),
      source_type: 'USER_POST',
      content_simhash: metaString,
    })
    .select('*')
    .single();

  if (insertError || !insertedRow) {
    throw new Error(
      insertError?.message || 'Không thể lưu bài đăng lên máy chủ lúc này.'
    );
  }

  // Thử lưu thêm vào bảng private_contacts nếu chính sách RLS cho phép
  try {
    await supabase.from('private_contacts').insert({
      post_id: insertedRow.id,
      owner_id: profileInfo.profileId,
      masked_phone: maskedPhone,
      raw_phone: cleanPhone,
      zalo_link: `https://zalo.me/${normalizedPhone}`,
      exact_address_note: params.formattedAddress || params.areaLabel,
    });
  } catch {
    // Bỏ qua nếu RLS chặn insert trực tiếp, server vẫn giải mã qua bảng profiles
  }

  // 2. Chạy RPC thuật toán Khớp lệnh kép trong bán kính 3km trên PostGIS
  const dbMatches: Array<{
    matchedPostId: string;
    distanceMeters: number;
    similarityScore: number;
    commonTraits: string[];
  }> = [];

  try {
    const { data: rpcMatches } = await supabase.rpc(
      'find_matching_spots_within_3km',
      { target_post_id: insertedRow.id }
    );
    if (Array.isArray(rpcMatches)) {
      for (const m of rpcMatches) {
        dbMatches.push({
          matchedPostId: String(m.matched_post_id),
          distanceMeters: Number(m.distance_meters || 0),
          similarityScore: Number(m.similarity_score || 0.85),
          commonTraits: Array.isArray(m.common_traits)
            ? m.common_traits.map(String)
            : [],
        });
      }
    }
  } catch {
    // Fallback khớp lệnh phía client nếu RPC chưa khả dụng
  }

  const createdSpot = mapDbPostRowToDomSpot(insertedRow, {
    sightings: [],
    viewerId: profileInfo.profileId,
    authorRawPhone: cleanPhone,
  });

  return {
    spot: createdSpot,
    remainingToday: Math.max(0, 3 - nextPostCount),
    dbMatches,
  };
}

/**
 * Truyền Lửa (Boost Light Power) trên Supabase
 */
export async function boostSpotLightInSupabase(
  spotId: string,
  powerDelta = 20
): Promise<{ lightPower: number; boostCount: number } | null> {
  if (!supabase || !isValidUuid(spotId)) return null;

  try {
    const { data: rpcPower, error: rpcErr } = await supabase.rpc(
      'boost_dom_light',
      {
        target_post_id: spotId,
        power_delta: powerDelta,
      }
    );

    if (!rpcErr && typeof rpcPower === 'number' && rpcPower > 0) {
      const { data: updated } = await supabase
        .from('dom_nho_posts')
        .select('light_power, boost_count')
        .eq('id', spotId)
        .maybeSingle();

      return {
        lightPower: Number(updated?.light_power ?? rpcPower),
        boostCount: Number(updated?.boost_count ?? 1),
      };
    }
  } catch {
    // Fallback sang UPDATE trực tiếp
  }

  const { data: current } = await supabase
    .from('dom_nho_posts')
    .select('light_power, boost_count')
    .eq('id', spotId)
    .maybeSingle();

  if (!current) return null;

  const nextPower = Math.min(500, Number(current.light_power || 100) + powerDelta);
  const nextCount = Number(current.boost_count || 1) + 1;

  const { data: updatedRow } = await supabase
    .from('dom_nho_posts')
    .update({
      light_power: nextPower,
      boost_count: nextCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', spotId)
    .select('light_power, boost_count')
    .maybeSingle();

  return updatedRow
    ? {
        lightPower: Number(updatedRow.light_power),
        boostCount: Number(updatedRow.boost_count),
      }
    : null;
}

/**
 * Báo phát hiện mới (Sightings Timeline) lưu vào bảng public.spot_sightings
 */
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
  if (!supabase || !isValidUuid(params.postId)) {
    throw new Error('Mã bài viết không hợp lệ để lưu dấu vết trên máy chủ.');
  }

  let validReporterId: string | null = null;
  if (params.reporterId && params.reporterPhone) {
    const prof = await ensureProfileInSupabase({
      id: params.reporterId,
      displayName: params.reporterName,
      rawPhone: params.reporterPhone,
      pinCode: '0000',
      patrolModeActive: true,
    });
    validReporterId = prof.profileId;
  }

  const distanceMeters =
    params.originLat && params.originLng
      ? calculateDistanceMeters(
          params.originLat,
          params.originLng,
          params.lat,
          params.lng
        )
      : 0;

  const { data: inserted, error } = await supabase
    .from('spot_sightings')
    .insert({
      post_id: params.postId,
      reporter_id: validReporterId,
      reporter_name: params.reporterName.trim(),
      image_url: params.imageUrl,
      note: params.note.trim(),
      emotion_tag: params.emotionTag.trim(),
      public_lat: params.lat,
      public_lng: params.lng,
      distance_from_origin_m: distanceMeters,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message || 'Không thể lưu báo cáo phát hiện mới.');
  }

  // Tăng độ sáng cho bài viết khi có dấu vết mới
  await boostSpotLightInSupabase(params.postId, 25).catch(() => null);

  return mapDbSightingRowToItem(inserted);
}

/**
 * Yêu cầu mở khóa liên hệ (Contact Unlock Workflow) lưu vào public.contact_unlock_requests
 * và trả về số điện thoại thực của chủ bài đăng
 */
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
  if (!supabase || !isValidUuid(params.postId)) {
    throw new Error('Bài viết không hợp lệ.');
  }

  const requesterProfile = await ensureProfileInSupabase({
    id: params.requesterId,
    displayName: params.requesterName,
    rawPhone: params.requesterPhone,
    pinCode: '0000',
    patrolModeActive: true,
  });

  // 1. Lưu yêu cầu mở khóa vào bảng contact_unlock_requests
  await supabase.from('contact_unlock_requests').insert({
    post_id: params.postId,
    requester_id: requesterProfile.profileId,
    requester_name: params.requesterName.trim(),
    request_type: params.requestType,
    message: params.message.trim(),
    proof_image_url: params.proofImageUrl || null,
    is_approved: true,
    approved_at: new Date().toISOString(),
  });

  // 2. Truy xuất author_id của bài đăng để lấy SĐT liên hệ thực
  const { data: postRow } = await supabase
    .from('dom_nho_posts')
    .select('author_id, content_simhash')
    .eq('id', params.postId)
    .maybeSingle();

  let rawPhone = '';
  if (postRow?.author_id) {
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('device_secret_token')
      .eq('id', postRow.author_id)
      .maybeSingle();

    rawPhone =
      extractPhoneFromDeviceToken(authorProfile?.device_secret_token) || '';
  }

  if (!rawPhone) {
    const { data: privRow } = await supabase
      .from('private_contacts')
      .select('raw_phone')
      .eq('post_id', params.postId)
      .maybeSingle();
    if (privRow?.raw_phone) {
      rawPhone = String(privRow.raw_phone);
    }
  }

  const meta = decodePostMeta(postRow?.content_simhash);
  const maskedPhone =
    meta.maskedPhone ||
    (rawPhone ? maskPhoneNumber(rawPhone) : 'Chưa cung cấp SĐT');

  return {
    rawPhone,
    maskedPhone,
    zaloLink: rawPhone
      ? `https://zalo.me/${rawPhone.replace(/\D/g, '')}`
      : '',
  };
}

/**
 * Đóng ca / Đã đoàn tụ -> Chuyển sang Đốm Xanh Lá (GREEN_PEACE / RESOLVED) trên Supabase
 */
export async function resolveSpotToPeaceInSupabase(
  spotId: string
): Promise<boolean> {
  if (!supabase || !isValidUuid(spotId)) return false;

  const { error } = await supabase
    .from('dom_nho_posts')
    .update({
      spot_type: 'GREEN_PEACE',
      status: 'RESOLVED',
      light_power: 200,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', spotId);

  return !error;
}

/**
 * Kích hoạt Khẩn cấp (Emergency Boost) trên Supabase
 */
export async function activateEmergencyBoostInSupabase(
  spotId: string
): Promise<boolean> {
  if (!supabase || !isValidUuid(spotId)) return false;

  const boostUntil = new Date(Date.now() + 48 * 3_600_000).toISOString();
  const { error } = await supabase
    .from('dom_nho_posts')
    .update({
      is_emergency_boosted: true,
      light_power: 300,
      emergency_boost_until: boostUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('id', spotId);

  return !error;
}

/**
 * Tải danh sách Kỷ niệm hàng tuần (public.memory_snaps) từ Supabase
 */
export async function fetchMemorySnapsFromSupabase(): Promise<MemorySnap[]> {
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from('memory_snaps')
    .select('*, dom_nho_posts(title, author_name, area_label)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !Array.isArray(rows)) return [];

  return rows.map((r: any) => {
    const postInfo = r.dom_nho_posts || {};
    const moodParts = String(r.mood_tag || '').split('•');
    const petNameFromTag = moodParts.length > 1 ? moodParts[0].trim() : '';
    const cleanMood =
      moodParts.length > 1 ? moodParts.slice(1).join('•').trim() : r.mood_tag;

    return {
      id: String(r.id),
      postId: String(r.post_id || ''),
      petName: petNameFromTag || String(postInfo.title || 'Thú cưng'),
      weekNumber: Number(r.week_number || 1),
      imageUrl: String(r.image_url || ''),
      caption: String(r.caption || ''),
      moodTag: String(cleanMood || ''),
      weightKg: r.weight_kg ? Number(r.weight_kg) : undefined,
      sentToRescuer: Boolean(r.sent_to_rescuer),
      rescuerName: String(postInfo.author_name || ''),
      areaLabel: String(postInfo.area_label || ''),
      googleMapsUrl:
        r.lat && r.lng
          ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
          : undefined,
      createdAt: r.created_at
        ? new Date(r.created_at).toLocaleDateString('vi-VN')
        : '',
    };
  });
}

/**
 * Lưu Kỷ niệm hàng tuần (Weekly Memory Snap) vào bảng public.memory_snaps của Supabase
 */
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
  if (!supabase) return null;

  let validAuthorId: string | null = null;
  if (params.authorId && params.authorName && params.authorPhone) {
    const prof = await ensureProfileInSupabase({
      id: params.authorId,
      displayName: params.authorName,
      rawPhone: params.authorPhone,
      pinCode: '0000',
      patrolModeActive: true,
    });
    validAuthorId = prof.profileId;
  }

  let targetPostId =
    params.postId && isValidUuid(params.postId) ? params.postId : '';

  if (!targetPostId) {
    const { data: latestPost } = await supabase
      .from('dom_nho_posts')
      .select('id, author_name, area_label')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPost?.id) {
      targetPostId = String(latestPost.id);
    }
  }

  if (!targetPostId) return null;

  const combinedMood = params.moodTag
    ? `${params.petName.trim()} • ${params.moodTag.trim()}`
    : params.petName.trim();

  const { data: inserted, error } = await supabase
    .from('memory_snaps')
    .insert({
      post_id: targetPostId,
      author_id: validAuthorId,
      week_number: params.weekNumber,
      image_url: params.imageUrl,
      caption: params.caption.trim(),
      weight_kg: params.weightKg ?? null,
      mood_tag: combinedMood,
      lat: params.lat ?? null,
      lng: params.lng ?? null,
      sent_to_rescuer: true,
    })
    .select('*, dom_nho_posts(title, author_name, area_label)')
    .single();

  if (error || !inserted) return null;

  const postInfo = (inserted as any).dom_nho_posts || {};
  return {
    id: String(inserted.id),
    postId: String(inserted.post_id),
    petName: params.petName.trim(),
    weekNumber: Number(inserted.week_number || params.weekNumber),
    imageUrl: String(inserted.image_url),
    caption: String(inserted.caption),
    moodTag: params.moodTag.trim(),
    weightKg: inserted.weight_kg ? Number(inserted.weight_kg) : undefined,
    sentToRescuer: true,
    rescuerName: String(postInfo.author_name || ''),
    areaLabel: String(postInfo.area_label || ''),
    createdAt: new Date(inserted.created_at).toLocaleDateString('vi-VN'),
  };
}

/**
 * Đồng bộ chế độ Đi dạo (Patrol Mode) và Ghép đôi Cặp đôi (public.couple_rooms) lên Supabase
 */
export async function syncPatrolModeInSupabase(
  session: UserSession,
  patrolModeActive: boolean
): Promise<void> {
  if (!supabase) return;
  try {
    const prof = await ensureProfileInSupabase(session);
    await supabase
      .from('profiles')
      .update({
        patrol_mode_active: patrolModeActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prof.profileId);
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

  if (!supabase) {
    return { roomCode, roomName };
  }

  try {
    const prof = await ensureProfileInSupabase(session);
    const { data: existingRoom } = await supabase
      .from('couple_rooms')
      .select('id, invite_code, room_name')
      .eq('invite_code', roomCode)
      .maybeSingle();

    let roomId = existingRoom?.id;
    if (!existingRoom) {
      const { data: createdRoom } = await supabase
        .from('couple_rooms')
        .insert({
          invite_code: roomCode,
          member_one_id: prof.profileId,
          room_name: roomName,
        })
        .select('id')
        .single();
      roomId = createdRoom?.id;
    } else {
      await supabase
        .from('couple_rooms')
        .update({ room_name: roomName })
        .eq('id', existingRoom.id);
    }

    if (roomId) {
      await supabase
        .from('profiles')
        .update({
          couple_room_id: roomId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prof.profileId);
    }
  } catch {
    // Fallback local
  }

  return { roomCode, roomName };
}

let activeRealtimeChannel: ReturnType<SupabaseClient['channel']> | null = null;

/**
 * Phát sóng bài đăng mới / cập nhật qua Supabase Realtime Broadcast
 * để mọi thiết bị đang mở web nhận được ngay lập tức (kể cả khi khác máy chủ vùng).
 */
export async function broadcastCommunitySpotRealtime(
  spot: DomSpot
): Promise<void> {
  if (!activeRealtimeChannel) return;
  try {
    const safePublicSpot: DomSpot = {
      ...spot,
      rawPhoneSecret: undefined,
      zaloLink: undefined,
      isContactUnlockedForViewer: false,
    };
    await activeRealtimeChannel.send({
      type: 'broadcast',
      event: 'community_spot_broadcast',
      payload: { spot: safePublicSpot },
    });
  } catch {
    // Ignore broadcast error
  }
}

/**
 * Đăng ký kênh Realtime (Supabase Postgres Changes + Broadcast) để mọi người dùng trên mọi thiết bị
 * thấy bài đăng mới, lượt truyền lửa, dấu vết phát hiện mới và cập nhật trạng thái ngay lập tức.
 */
export function subscribeToRealtimeCommunityFeed(
  onFeedChanged: (incomingSpot?: DomSpot) => void
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('dom_nho_realtime_community_v1', {
      config: {
        broadcast: { self: false },
      },
    })
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'dom_nho_posts' },
      () => {
        onFeedChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'spot_sightings' },
      () => {
        onFeedChanged();
      }
    )
    .on(
      'broadcast',
      { event: 'community_spot_broadcast' },
      (msg: { payload?: { spot?: DomSpot } }) => {
        if (msg?.payload?.spot) {
          onFeedChanged(msg.payload.spot);
        } else {
          onFeedChanged();
        }
      }
    )
    .subscribe();

  activeRealtimeChannel = channel;

  return () => {
    if (activeRealtimeChannel === channel) {
      activeRealtimeChannel = null;
    }
    supabase.removeChannel(channel);
  };
}
