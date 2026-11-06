import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ContactUnlockRequest,
  DomSpot,
  MemorySnap,
  SightingItem,
  SpotStatus,
  SpotType,
  SpotVisibility,
  deterministicAccountIdFromPhone,
  normalizePhoneDigits,
} from './types';
import {
  calculateDistanceMeters,
  fuzzCoordinates,
  maskPhoneNumber,
} from './security';

export interface ServerAccountRecord {
  id: string;
  displayName: string;
  normalizedPhone: string;
  rawPhone: string;
  maskedPhone: string;
  pinHash: string;
  deviceSecretToken: string;
  coupleRoomCode: string;
  partnerName?: string;
  patrolModeActive: boolean;
  dailyPostCount: number;
  lastPostDate: string;
  spamAttempts: number;
  isShadowbanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerPostRecord {
  spot: DomSpot;
  exactLat: number;
  exactLng: number;
  rawPhone: string;
  unlockedByViewerIds: string[];
}

interface CommunityStoreData {
  accounts: Record<string, ServerAccountRecord>;
  posts: ServerPostRecord[];
  unlockRequests: ContactUnlockRequest[];
  memorySnaps: MemorySnap[];
  deletedSpotIds?: string[];
}

const STORE_FILE_PATH = path.join(
  os.tmpdir(),
  'dom_nho_community_store_v1.json'
);

declare global {
  // eslint-disable-next-line no-var
  var __domNhoCommunityStoreV1: CommunityStoreData | undefined;
}

function createEmptyStore(): CommunityStoreData {
  return {
    accounts: {},
    posts: [],
    unlockRequests: [],
    memorySnaps: [],
    deletedSpotIds: [],
  };
}

export function loadServerCommunityStore(): CommunityStoreData {
  if (globalThis.__domNhoCommunityStoreV1) {
    try {
      if (fs.existsSync(STORE_FILE_PATH)) {
        const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as CommunityStoreData;
        if (parsed && typeof parsed === 'object') {
          globalThis.__domNhoCommunityStoreV1 = {
            accounts: parsed.accounts || {},
            posts: Array.isArray(parsed.posts) ? parsed.posts : [],
            unlockRequests: Array.isArray(parsed.unlockRequests)
              ? parsed.unlockRequests
              : [],
            memorySnaps: Array.isArray(parsed.memorySnaps)
              ? parsed.memorySnaps
              : [],
            deletedSpotIds: Array.isArray(parsed.deletedSpotIds)
              ? parsed.deletedSpotIds
              : [],
          };
        }
      }
    } catch {
      // Keep in-memory state if temp file read fails
    }
    return globalThis.__domNhoCommunityStoreV1;
  }

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as CommunityStoreData;
      if (parsed && typeof parsed === 'object') {
        globalThis.__domNhoCommunityStoreV1 = {
          accounts: parsed.accounts || {},
          posts: Array.isArray(parsed.posts) ? parsed.posts : [],
          unlockRequests: Array.isArray(parsed.unlockRequests)
            ? parsed.unlockRequests
            : [],
          memorySnaps: Array.isArray(parsed.memorySnaps)
            ? parsed.memorySnaps
            : [],
          deletedSpotIds: Array.isArray(parsed.deletedSpotIds)
            ? parsed.deletedSpotIds
            : [],
        };
        return globalThis.__domNhoCommunityStoreV1;
      }
    }
  } catch {
    // Ignore file read error
  }

  globalThis.__domNhoCommunityStoreV1 = createEmptyStore();
  return globalThis.__domNhoCommunityStoreV1;
}

export function saveServerCommunityStore(store: CommunityStoreData): void {
  globalThis.__domNhoCommunityStoreV1 = store;
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(store), 'utf-8');
  } catch {
    // Never throw EROFS; keep in-memory store active
  }
}

export function computeServerPinHash(
  normalizedPhone: string,
  pinCode: string
): string {
  const payload = `domnho_auth_v1:${normalizedPhone}:${pinCode}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function deriveRoomCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let n = hash || 123456;
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `DN-${code}`;
}

export function authenticateOrRegisterInServerStore(params: {
  id?: string;
  displayName?: string;
  rawPhone: string;
  pinCode: string;
  mode?: 'login' | 'register';
}): ServerAccountRecord {
  const store = loadServerCommunityStore();
  const cleanName = (params.displayName || '').trim();
  const cleanPhone = (params.rawPhone || '').trim();
  const cleanPin = (params.pinCode || '').trim();
  const normalizedPhone = normalizePhoneDigits(cleanPhone);

  if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
    throw new Error('Vui lòng nhập số điện thoại hợp lệ (từ 9 đến 11 chữ số).');
  }
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw new Error('Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.');
  }

  const pinHash = computeServerPinHash(normalizedPhone, cleanPin);
  const existing = store.accounts[normalizedPhone];
  const today = new Date().toISOString().slice(0, 10);

  if (existing) {
    if (existing.pinHash !== pinHash) {
      throw new Error(
        'Số điện thoại này đã có tài khoản nhưng mã PIN không chính xác.'
      );
    }
    if (cleanName.length >= 2 && cleanName !== existing.displayName) {
      existing.displayName = cleanName;
    }
    if (existing.lastPostDate !== today) {
      existing.dailyPostCount = 0;
      existing.spamAttempts = 0;
      existing.lastPostDate = today;
    }
    existing.updatedAt = new Date().toISOString();
    saveServerCommunityStore(store);
    return existing;
  }

  if (params.mode === 'login' && cleanName.length < 2) {
    throw new Error(
      'Số điện thoại này chưa được đăng ký. Vui lòng chọn tab "Tạo tài khoản mới" và nhập Tên gọi của bạn.'
    );
  }
  if (cleanName.length < 2) {
    throw new Error(
      'Vui lòng nhập Tên gọi / Biệt danh (tối thiểu 2 ký tự) để tạo tài khoản.'
    );
  }

  const profileId =
    params.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.id
    )
      ? params.id
      : deterministicAccountIdFromPhone(normalizedPhone);

  const nowIso = new Date().toISOString();
  const record: ServerAccountRecord = {
    id: profileId,
    displayName: cleanName,
    normalizedPhone,
    rawPhone: cleanPhone,
    maskedPhone: maskPhoneNumber(cleanPhone),
    pinHash,
    deviceSecretToken: `dom_phone_${normalizedPhone}`,
    coupleRoomCode: deriveRoomCode(profileId),
    patrolModeActive: true,
    dailyPostCount: 0,
    lastPostDate: today,
    spamAttempts: 0,
    isShadowbanned: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  store.accounts[normalizedPhone] = record;
  saveServerCommunityStore(store);
  return record;
}

export function createSpotInServerStore(params: {
  id?: string;
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
  publicLat?: number;
  publicLng?: number;
  hasExactLocation: boolean;
  areaLabel: string;
  formattedAddress?: string;
  allowFoster: boolean;
  skipRateLimit?: boolean;
}): {
  spot: DomSpot;
  remainingToday: number;
} {
  const store = loadServerCommunityStore();
  const cleanPhone = (params.rawPhone || '').trim();
  const normalizedPhone = normalizePhoneDigits(cleanPhone);
  const today = new Date().toISOString().slice(0, 10);

  let account = store.accounts[normalizedPhone];
  if (!account) {
    const profileId =
      params.authorId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        params.authorId
      )
        ? params.authorId
        : deterministicAccountIdFromPhone(normalizedPhone);
    const nowIso = new Date().toISOString();
    account = {
      id: profileId,
      displayName: params.authorName.trim(),
      normalizedPhone,
      rawPhone: cleanPhone,
      maskedPhone: maskPhoneNumber(cleanPhone),
      pinHash: computeServerPinHash(normalizedPhone, params.pinCode || '0000'),
      deviceSecretToken: `dom_phone_${normalizedPhone}`,
      coupleRoomCode: deriveRoomCode(profileId),
      patrolModeActive: true,
      dailyPostCount: 0,
      lastPostDate: today,
      spamAttempts: 0,
      isShadowbanned: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    store.accounts[normalizedPhone] = account;
  } else if (account.lastPostDate !== today) {
    account.dailyPostCount = 0;
    account.spamAttempts = 0;
    account.lastPostDate = today;
  }

  if (!params.skipRateLimit) {
    if (account.dailyPostCount >= 3 && !account.isShadowbanned) {
      account.spamAttempts = (account.spamAttempts || 0) + 1;
      if (account.spamAttempts >= 4) {
        account.isShadowbanned = true;
      } else {
        saveServerCommunityStore(store);
        throw new Error(
          'Mỗi tài khoản được đăng tối đa 3 bài/ngày để chống tin rác. Bạn vẫn có thể Báo phát hiện mới hoặc Quan tâm bài viết không giới hạn.'
        );
      }
    }
    account.dailyPostCount += 1;
  }

  // Kiểm tra nếu bài đăng đã tồn tại (đồng bộ từ Supabase hoặc Realtime)
  if (params.id) {
    const existingRec = store.posts.find((p) => p.spot.id === params.id);
    if (existingRec) {
      return {
        spot: {
          ...existingRec.spot,
          rawPhoneSecret: existingRec.rawPhone,
          isContactUnlockedForViewer: true,
        },
        remainingToday: Math.max(0, 3 - account.dailyPostCount),
      };
    }
  }

  // Làm mờ tọa độ công khai (±150m-300m) theo đúng Business Rule bảo mật vị trí
  const fuzzed =
    params.publicLat && params.publicLng
      ? {
          publicLat: params.publicLat,
          publicLng: params.publicLng,
          fuzzRadiusMeters: 200,
        }
      : params.hasExactLocation && params.exactLat && params.exactLng
      ? fuzzCoordinates(params.exactLat, params.exactLng)
      : {
          publicLat: params.exactLat || 0,
          publicLng: params.exactLng || 0,
          fuzzRadiusMeters: 200,
        };

  const nowIso = new Date().toISOString();
  const spotId = params.id || crypto.randomUUID();
  const maskedPhone = maskPhoneNumber(cleanPhone);
  const status: SpotStatus = account.isShadowbanned ? 'SHADOWBANNED' : 'ACTIVE';

  const spot: DomSpot = {
    id: spotId,
    authorId: account.id,
    authorName: params.authorName.trim(),
    spotType: params.spotType,
    status,
    visibility: params.visibility || 'PUBLIC',
    coupleRoomCode: params.coupleRoomCode,
    title: params.title.trim(),
    story: params.story.trim(),
    species: params.species,
    breed: params.breed.trim(),
    coatColor: params.coatColor.trim(),
    traits: params.traits,
    images: params.images,
    publicLat: fuzzed.publicLat,
    publicLng: fuzzed.publicLng,
    fuzzRadiusMeters: fuzzed.fuzzRadiusMeters,
    areaLabel: params.areaLabel.trim(),
    formattedAddress: (params.formattedAddress || params.areaLabel).trim(),
    hasExactLocation: params.hasExactLocation,
    googleMapsUrl:
      fuzzed.publicLat && fuzzed.publicLng
        ? `https://www.google.com/maps/search/?api=1&query=${fuzzed.publicLat},${fuzzed.publicLng}`
        : undefined,
    googleMapsDirectionsUrl:
      fuzzed.publicLat && fuzzed.publicLng
        ? `https://www.google.com/maps/dir/?api=1&destination=${fuzzed.publicLat},${fuzzed.publicLng}`
        : undefined,
    lightPower: 120,
    boostCount: 1,
    isEmergencyBoosted: false,
    allowFoster: Boolean(params.allowFoster),
    maskedPhone,
    sourceType: 'USER_POST',
    sourcePlatform: 'USER_POST',
    isVerified: true,
    entityCategory: 'INDIVIDUAL_PET',
    publishedDate: nowIso,
    hoursAgo: 0,
    createdAt: nowIso,
    sightings: [],
  };

  store.posts.unshift({
    spot,
    exactLat: params.exactLat,
    exactLng: params.exactLng,
    rawPhone: cleanPhone,
    unlockedByViewerIds: [account.id],
  });

  saveServerCommunityStore(store);

  return {
    spot: {
      ...spot,
      rawPhoneSecret: cleanPhone,
      zaloLink: `https://zalo.me/${normalizedPhone}`,
      isContactUnlockedForViewer: true,
    },
    remainingToday: Math.max(0, 3 - account.dailyPostCount),
  };
}

export function listCommunitySpotsFromServerStore(
  viewerId?: string | null
): DomSpot[] {
  const store = loadServerCommunityStore();
  const deletedSet = new Set(store.deletedSpotIds || []);
  const now = Date.now();

  return store.posts
    .filter((rec) => !deletedSet.has(rec.spot.id))
    .map((rec) => {
      const isOwner = Boolean(viewerId && rec.spot.authorId === viewerId);
      const isUnlocked =
        isOwner ||
        Boolean(viewerId && rec.unlockedByViewerIds.includes(viewerId));
      const hoursAgo = Math.max(
        0,
        Math.round((now - Date.parse(rec.spot.createdAt)) / 3_600_000)
      );
      const digits = (rec.rawPhone || '').replace(/\D/g, '');

      return {
        ...rec.spot,
        hoursAgo,
        rawPhoneSecret: isUnlocked && rec.rawPhone ? rec.rawPhone : undefined,
        zaloLink:
          isUnlocked && digits ? `https://zalo.me/${digits}` : undefined,
        isContactUnlockedForViewer: isUnlocked,
      };
    });
}

export function boostSpotInServerStore(
  spotId: string,
  delta = 20
): { lightPower: number; boostCount: number } | null {
  const store = loadServerCommunityStore();
  const rec = store.posts.find((p) => p.spot.id === spotId);
  if (!rec) return null;

  rec.spot.lightPower = Math.min(500, (rec.spot.lightPower || 100) + delta);
  rec.spot.boostCount = (rec.spot.boostCount || 1) + 1;
  saveServerCommunityStore(store);

  return {
    lightPower: rec.spot.lightPower,
    boostCount: rec.spot.boostCount,
  };
}

export function addSightingInServerStore(params: {
  spotId: string;
  reporterName: string;
  imageUrl: string;
  note: string;
  emotionTag: string;
  lat: number;
  lng: number;
  originLat?: number;
  originLng?: number;
}): SightingItem {
  const store = loadServerCommunityStore();
  const rec = store.posts.find((p) => p.spot.id === params.spotId);

  const originLat = params.originLat || rec?.exactLat || rec?.spot.publicLat || 0;
  const originLng = params.originLng || rec?.exactLng || rec?.spot.publicLng || 0;
  const distanceMeters =
    originLat && originLng && params.lat && params.lng
      ? calculateDistanceMeters(originLat, originLng, params.lat, params.lng)
      : 0;

  const item: SightingItem = {
    id: crypto.randomUUID(),
    reporterName: params.reporterName.trim(),
    imageUrl: params.imageUrl,
    note: params.note.trim(),
    emotionTag: params.emotionTag.trim(),
    createdAt: new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }),
    distanceFromOriginMeters: distanceMeters,
    lat: params.lat,
    lng: params.lng,
    googleMapsUrl:
      params.lat && params.lng
        ? `https://www.google.com/maps/search/?api=1&query=${params.lat},${params.lng}`
        : undefined,
  };

  if (rec) {
    rec.spot.sightings = [item, ...(rec.spot.sightings || [])];
    rec.spot.lightPower = Math.min(500, (rec.spot.lightPower || 100) + 25);
    saveServerCommunityStore(store);
  }

  return item;
}

export function unlockContactInServerStore(params: {
  spotId: string;
  requesterId: string;
  requesterName: string;
  requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER';
  message: string;
  proofImageUrl?: string;
}): {
  rawPhone: string;
  maskedPhone: string;
  zaloLink: string;
} {
  const store = loadServerCommunityStore();
  const rec = store.posts.find((p) => p.spot.id === params.spotId);

  const unlockReq: ContactUnlockRequest = {
    id: crypto.randomUUID(),
    postId: params.spotId,
    requesterName: params.requesterName.trim(),
    requestType: params.requestType,
    message: params.message.trim(),
    proofImageUrl: params.proofImageUrl,
    isApproved: true,
    createdAt: new Date().toISOString(),
  };
  store.unlockRequests.unshift(unlockReq);

  let rawPhone = rec?.rawPhone || '';
  if (rec && params.requesterId) {
    if (!rec.unlockedByViewerIds.includes(params.requesterId)) {
      rec.unlockedByViewerIds.push(params.requesterId);
    }
  }

  if (!rawPhone && rec?.spot.authorId) {
    const authorAcc = Object.values(store.accounts).find(
      (a) => a.id === rec.spot.authorId
    );
    if (authorAcc) {
      rawPhone = authorAcc.rawPhone;
    }
  }

  saveServerCommunityStore(store);

  const digits = rawPhone.replace(/\D/g, '');
  return {
    rawPhone,
    maskedPhone: rec?.spot.maskedPhone || maskPhoneNumber(rawPhone),
    zaloLink: digits ? `https://zalo.me/${digits}` : '',
  };
}

export function resolveSpotToPeaceInServerStore(spotId: string): boolean {
  const store = loadServerCommunityStore();
  const rec = store.posts.find((p) => p.spot.id === spotId);
  if (!rec) return false;

  rec.spot.spotType = 'GREEN_PEACE';
  rec.spot.status = 'RESOLVED';
  rec.spot.lightPower = 200;
  saveServerCommunityStore(store);
  return true;
}

export function activateEmergencyBoostInServerStore(spotId: string): boolean {
  const store = loadServerCommunityStore();
  const rec = store.posts.find((p) => p.spot.id === spotId);
  if (!rec) return false;

  rec.spot.isEmergencyBoosted = true;
  rec.spot.lightPower = 300;
  saveServerCommunityStore(store);
  return true;
}

export function createMemorySnapInServerStore(params: {
  postId?: string;
  petName: string;
  weekNumber: number;
  imageUrl: string;
  caption: string;
  moodTag: string;
  weightKg?: number;
  rescuerName?: string;
  areaLabel?: string;
  lat?: number;
  lng?: number;
}): MemorySnap {
  const store = loadServerCommunityStore();
  const snap: MemorySnap = {
    id: crypto.randomUUID(),
    postId: params.postId || '',
    petName: params.petName.trim(),
    weekNumber: params.weekNumber,
    imageUrl: params.imageUrl,
    caption: params.caption.trim(),
    moodTag: params.moodTag.trim(),
    weightKg: params.weightKg,
    sentToRescuer: true,
    rescuerName: params.rescuerName || '',
    areaLabel: params.areaLabel || '',
    googleMapsUrl:
      params.lat && params.lng
        ? `https://www.google.com/maps/search/?api=1&query=${params.lat},${params.lng}`
        : undefined,
    createdAt: new Date().toLocaleDateString('vi-VN'),
  };
  store.memorySnaps.unshift(snap);
  saveServerCommunityStore(store);
  return snap;
}

export function listMemorySnapsFromServerStore(): MemorySnap[] {
  const store = loadServerCommunityStore();
  return store.memorySnaps;
}

export function syncIncomingPeerSpotInServerStore(spot: DomSpot): void {
  if (!spot || !spot.id || !spot.title) return;
  const store = loadServerCommunityStore();
  if (store.deletedSpotIds && store.deletedSpotIds.includes(spot.id)) {
    return;
  }
  const existingIdx = store.posts.findIndex((p) => p.spot.id === spot.id);
  if (existingIdx >= 0) {
    store.posts[existingIdx].spot = {
      ...store.posts[existingIdx].spot,
      ...spot,
      rawPhoneSecret: undefined,
    };
  } else {
    store.posts.unshift({
      spot: {
        ...spot,
        rawPhoneSecret: undefined,
      },
      exactLat: spot.publicLat,
      exactLng: spot.publicLng,
      rawPhone: spot.rawPhoneSecret || '',
      unlockedByViewerIds: spot.authorId ? [spot.authorId] : [],
    });
  }
  saveServerCommunityStore(store);
}

export function listDeletedSpotIdsFromServerStore(): string[] {
  const store = loadServerCommunityStore();
  return Array.isArray(store.deletedSpotIds) ? store.deletedSpotIds : [];
}

export function updateSpotInServerStore(params: {
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
  publicLat?: number;
  publicLng?: number;
  hasExactLocation: boolean;
  areaLabel: string;
  formattedAddress?: string;
  allowFoster: boolean;
}): DomSpot | null {
  const store = loadServerCommunityStore();
  const cleanPhone = (params.rawPhone || '').trim();
  const normalizedPhone = normalizePhoneDigits(cleanPhone);
  const idx = store.posts.findIndex((p) => p.spot.id === params.spotId);

  if (idx >= 0) {
    const rec = store.posts[idx];
    const recPhoneNorm = normalizePhoneDigits(rec.rawPhone);
    const detAuthorId = normalizedPhone
      ? deterministicAccountIdFromPhone(normalizedPhone)
      : '';
    const isOwnerById = Boolean(
      (params.authorId && rec.spot.authorId === params.authorId) ||
        (detAuthorId && rec.spot.authorId === detAuthorId)
    );
    const isOwnerByPhone = Boolean(
      normalizedPhone && recPhoneNorm && normalizedPhone === recPhoneNorm
    );
    if (!isOwnerById && !isOwnerByPhone) {
      throw new Error(
        'Bạn chỉ có quyền chỉnh sửa bài đăng do chính tài khoản của mình tạo.'
      );
    }

    const nextExactLat =
      typeof params.exactLat === 'number' && params.exactLat > 0
        ? params.exactLat
        : rec.exactLat;
    const nextExactLng =
      typeof params.exactLng === 'number' && params.exactLng > 0
        ? params.exactLng
        : rec.exactLng;
    const matchesOldExact =
      Math.abs(nextExactLat - rec.exactLat) <= 0.0001 &&
      Math.abs(nextExactLng - rec.exactLng) <= 0.0001;
    const matchesOldPublic =
      Math.abs(nextExactLat - rec.spot.publicLat) <= 0.0001 &&
      Math.abs(nextExactLng - rec.spot.publicLng) <= 0.0001;
    const coordsChanged = !matchesOldExact && !matchesOldPublic;

    const fuzzed =
      params.publicLat && params.publicLng
        ? {
            publicLat: params.publicLat,
            publicLng: params.publicLng,
            fuzzRadiusMeters: 200,
          }
        : coordsChanged && params.hasExactLocation && nextExactLat && nextExactLng
        ? fuzzCoordinates(nextExactLat, nextExactLng)
        : !params.hasExactLocation
        ? {
            publicLat: 0,
            publicLng: 0,
            fuzzRadiusMeters: 200,
          }
        : {
            publicLat: rec.spot.publicLat,
            publicLng: rec.spot.publicLng,
            fuzzRadiusMeters: rec.spot.fuzzRadiusMeters || 200,
          };

    if (coordsChanged) {
      rec.exactLat = nextExactLat;
      rec.exactLng = nextExactLng;
    }
    if (cleanPhone) {
      rec.rawPhone = cleanPhone;
    }

    rec.spot = {
      ...rec.spot,
      authorName: params.authorName.trim() || rec.spot.authorName,
      spotType: params.spotType,
      title: params.title.trim(),
      story: params.story.trim(),
      species: params.species,
      breed: params.breed.trim(),
      coatColor: params.coatColor.trim(),
      traits: params.traits,
      images: params.images,
      publicLat: fuzzed.publicLat,
      publicLng: fuzzed.publicLng,
      fuzzRadiusMeters: fuzzed.fuzzRadiusMeters,
      areaLabel: params.areaLabel.trim(),
      formattedAddress: (params.formattedAddress || params.areaLabel).trim(),
      hasExactLocation: params.hasExactLocation,
      allowFoster: Boolean(params.allowFoster),
      googleMapsUrl:
        fuzzed.publicLat && fuzzed.publicLng
          ? `https://www.google.com/maps/search/?api=1&query=${fuzzed.publicLat},${fuzzed.publicLng}`
          : rec.spot.googleMapsUrl,
      googleMapsDirectionsUrl:
        fuzzed.publicLat && fuzzed.publicLng
          ? `https://www.google.com/maps/dir/?api=1&destination=${fuzzed.publicLat},${fuzzed.publicLng}`
          : rec.spot.googleMapsDirectionsUrl,
    };

    saveServerCommunityStore(store);

    const digits = (rec.rawPhone || '').replace(/\D/g, '');
    return {
      ...rec.spot,
      rawPhoneSecret: rec.rawPhone || undefined,
      zaloLink: digits ? `https://zalo.me/${digits}` : undefined,
      isContactUnlockedForViewer: true,
    };
  }

  return null;
}

export function deleteSpotInServerStore(params: {
  spotId: string;
  authorId?: string;
  rawPhone?: string;
  skipOwnershipCheck?: boolean;
}): boolean {
  const store = loadServerCommunityStore();
  const normalizedPhone = normalizePhoneDigits(params.rawPhone);
  const idx = store.posts.findIndex((p) => p.spot.id === params.spotId);

  if (idx >= 0) {
    const rec = store.posts[idx];
    const recPhoneNorm = normalizePhoneDigits(rec.rawPhone);
    if (!params.skipOwnershipCheck) {
      const detAuthorId = normalizedPhone
        ? deterministicAccountIdFromPhone(normalizedPhone)
        : '';
      const isOwnerById = Boolean(
        (params.authorId && rec.spot.authorId === params.authorId) ||
          (detAuthorId && rec.spot.authorId === detAuthorId)
      );
      const isOwnerByPhone = Boolean(
        normalizedPhone && recPhoneNorm && normalizedPhone === recPhoneNorm
      );
      if (!isOwnerById && !isOwnerByPhone) {
        throw new Error(
          'Bạn chỉ có quyền xóa bài đăng do chính tài khoản của mình tạo.'
        );
      }
    }

    // Hoàn lại hạn mức đăng bài trong ngày (3 bài/ngày) nếu xóa bài vừa đăng hôm nay
    const today = new Date().toISOString().slice(0, 10);
    const postCreatedDate = String(rec.spot.createdAt || '').slice(0, 10);
    if (postCreatedDate === today) {
      const ownerAccount =
        (recPhoneNorm && store.accounts[recPhoneNorm]) ||
        (normalizedPhone && store.accounts[normalizedPhone]) ||
        Object.values(store.accounts).find((acc) => acc.id === rec.spot.authorId);
      if (ownerAccount && ownerAccount.lastPostDate === today) {
        ownerAccount.dailyPostCount = Math.max(
          0,
          (ownerAccount.dailyPostCount || 1) - 1
        );
      }
    }

    store.posts.splice(idx, 1);
  }

  if (!Array.isArray(store.deletedSpotIds)) {
    store.deletedSpotIds = [];
  }
  if (params.spotId && !store.deletedSpotIds.includes(params.spotId)) {
    store.deletedSpotIds.push(params.spotId);
  }

  saveServerCommunityStore(store);
  return true;
}

