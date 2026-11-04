import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { maskPhoneNumber } from './security';
import { UserSession } from './types';

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

  // 2. Nếu chưa xác thực qua Supabase (ví dụ đang ngoại tuyến), kiểm tra bộ nhớ tài khoản trên thiết bị
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
