import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { maskPhoneNumber } from './security';
import { UserSession } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const AUTH_STORAGE_KEY = 'dom_nho_permanent_auth';
export const DEVICE_TOKEN_KEY = 'dom_nho_device_secret_token';
const IDB_DB_NAME = 'DomNhoPermanentVault';
const IDB_STORE_NAME = 'auth_store';

/**
 * Khởi tạo Supabase Client theo đúng đặc tả SYSTEM_LOGIC_AND_SECURITY.md:
 * - persistSession: true
 * - autoRefreshToken: true
 * - detectSessionInUrl: true
 * - storageKey: 'dom_nho_permanent_auth'
 */
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

/**
 * Lưu trữ kép (localStorage + IndexedDB + Cookie 10 năm maxAge: 315360000)
 * đảm bảo không bao giờ bắt người dùng đăng nhập lại
 */
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
  // Lưu Cookie dài hạn 10 năm (max-age=315360000)
  document.cookie = `${DEVICE_TOKEN_KEY}=${encodeURIComponent(
    session.deviceSecretToken
  )}; path=/; max-age=315360000; SameSite=Lax`;
  saveToIndexedDb(session);
}

export async function loadPermanentSession(): Promise<UserSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as UserSession;
    }
    const fromIdb = await restoreFromIndexedDb();
    if (fromIdb) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(fromIdb));
      return fromIdb;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Đăng ký / Đăng nhập 3 giây không cần xác thực OTP/Email (Zero-Verification Auth)
 */
export async function registerZeroVerificationUser(params: {
  displayName: string;
  pinCode: string;
  rawPhone: string;
}): Promise<UserSession> {
  const cleanName = params.displayName.trim() || 'Người Bạn Đốm Nhỏ';
  const cleanPin = params.pinCode.trim() || '1234';
  const cleanPhone = params.rawPhone.trim() || '0908123456';

  const deviceSecretToken = `dom_dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  const coupleRoomCode = `DN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const session: UserSession = {
    id: `usr_${Date.now().toString(36)}`,
    displayName: cleanName,
    pinCode: cleanPin,
    rawPhone: cleanPhone,
    maskedPhone: maskPhoneNumber(cleanPhone),
    deviceSecretToken,
    coupleRoomCode,
    patrolModeActive: true,
    dailyPostCount: 0,
    lastPostDate: new Date().toISOString().slice(0, 10),
    isShadowbanned: false,
    createdAt: new Date().toISOString(),
  };

  // Nếu có kết nối Supabase thực tế, tự động tạo tài khoản ngầm không cần OTP
  if (supabase) {
    try {
      const pseudoEmail = `${cleanPhone.replace(/\D/g, '') || 'guest'}@domnho.local`;
      await supabase.auth.signUp({
        email: pseudoEmail,
        password: `DomNho#${cleanPin}#2026`,
        options: {
          data: {
            display_name: cleanName,
            device_secret_token: deviceSecretToken,
          },
        },
      });
    } catch {
      // Bỏ qua lỗi mạng, ưu tiên trải nghiệm 0.5 giây không gián đoạn
    }
  }

  persistPermanentSession(session);
  return session;
}

