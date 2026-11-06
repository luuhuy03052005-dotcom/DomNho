import { MongoClient, Db } from 'mongodb';
import crypto from 'node:crypto';
import {
  calculateDistanceMeters,
  fuzzCoordinates,
  maskPhoneNumber,
} from '@/lib/security';
import {
  ServerAccountRecord,
  computeServerPinHash,
} from '@/lib/server-community-store';
import {
  DomSpot,
  MemorySnap,
  SightingItem,
  SpotType,
  SpotVisibility,
  deterministicAccountIdFromPhone,
  isSpotDeletedOrHidden,
  isValidVietnamesePhone,
  normalizePhoneDigits,
} from '@/lib/types';

const DEFAULT_MONGODB_URI =
  'mongodb+srv://luuhuy05032005h_db_user:33772626asd@cluster0.htkjrkb.mongodb.net/dom_nho?retryWrites=true&w=majority';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'dom_nho';

declare global {
  // eslint-disable-next-line no-var
  var __domNhoMongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __domNhoMongoIndexesReady: boolean | undefined;
  // eslint-disable-next-line no-var
  var __domNhoMongoCooldownUntil: number | undefined;
}

function getMongoClientPromise(): Promise<MongoClient> {
  if (
    global.__domNhoMongoCooldownUntil &&
    Date.now() < global.__domNhoMongoCooldownUntil
  ) {
    return Promise.reject(new Error('MongoDB connection cooldown active'));
  }

  if (!global.__domNhoMongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 2500,
      serverSelectionTimeoutMS: 2500,
      maxPoolSize: 10,
    });
    global.__domNhoMongoClientPromise = client.connect().catch((err) => {
      global.__domNhoMongoClientPromise = undefined;
      global.__domNhoMongoCooldownUntil = Date.now() + 60_000;
      throw err;
    });
  }
  return global.__domNhoMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  const db = client.db(MONGODB_DB_NAME);

  if (!global.__domNhoMongoIndexesReady) {
    global.__domNhoMongoIndexesReady = true;
    Promise.all([
      db
        .collection('accounts')
        .createIndex({ normalizedPhone: 1 }, { unique: true })
        .catch(() => null),
      db
        .collection('accounts')
        .createIndex({ id: 1 })
        .catch(() => null),
      db
        .collection('posts')
        .createIndex({ id: 1 }, { unique: true })
        .catch(() => null),
      db
        .collection('posts')
        .createIndex({ isDeleted: 1, createdAt: -1 })
        .catch(() => null),
      db
        .collection('deleted_posts')
        .createIndex({ spotId: 1 }, { unique: true })
        .catch(() => null),
      db
        .collection('memories')
        .createIndex({ id: 1 }, { unique: true })
        .catch(() => null),
    ]).catch(() => null);
  }

  return db;
}

function deriveRoomCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let code = '';
  let n = hash;
  for (let i = 0; i < 4; i++) {
    code += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `DN-${code}`;
}

export interface MongoStoredPostDoc {
  id: string;
  spot: DomSpot;
  authorId: string;
  authorName: string;
  rawPhone: string;
  normalizedPhone: string;
  exactLat: number;
  exactLng: number;
  hasExactLocation: boolean;
  unlockedViewerIds: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Xác thực Đăng nhập hoặc Đăng ký tài khoản trực tiếp trên MongoDB Atlas.
 * Tách biệt rõ ràng mode 'register' và 'login'.
 */
export async function authenticateOrRegisterInMongo(params: {
  id?: string;
  displayName?: string;
  rawPhone: string;
  pinCode: string;
  mode?: 'login' | 'register';
  allowSyncExisting?: boolean;
}): Promise<ServerAccountRecord> {
  const cleanName = (params.displayName || '').trim();
  const cleanPhone = (params.rawPhone || '').trim();
  const cleanPin = (params.pinCode || '').trim();
  const normalizedPhone = normalizePhoneDigits(cleanPhone);

  if (!isValidVietnamesePhone(cleanPhone)) {
    throw new Error(
      'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).'
    );
  }
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw new Error('Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.');
  }

  const pinHash = computeServerPinHash(normalizedPhone, cleanPin);
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const db = await getMongoDb();
  const accountsCol = db.collection<ServerAccountRecord>('accounts');

  const existing = await accountsCol.findOne({ normalizedPhone });

  if (existing) {
    if (params.mode === 'register' && !params.allowSyncExisting) {
      throw new Error(
        'Số điện thoại này đã được đăng ký tài khoản. Vui lòng chuyển sang tab "Đăng nhập" và nhập mã PIN của bạn.'
      );
    }

    if (existing.pinHash !== pinHash) {
      throw new Error(
        'Số điện thoại này đã có tài khoản nhưng mã PIN không chính xác.'
      );
    }

    const updatedDisplayName =
      params.allowSyncExisting && cleanName.length >= 2
        ? cleanName
        : existing.displayName;
    const dailyPostCount =
      existing.lastPostDate !== today ? 0 : existing.dailyPostCount || 0;
    const spamAttempts =
      existing.lastPostDate !== today ? 0 : existing.spamAttempts || 0;

    await accountsCol.updateOne(
      { normalizedPhone },
      {
        $set: {
          displayName: updatedDisplayName,
          dailyPostCount,
          spamAttempts,
          lastPostDate: today,
          updatedAt: nowIso,
        },
      }
    );

    return {
      ...existing,
      displayName: updatedDisplayName,
      dailyPostCount,
      spamAttempts,
      lastPostDate: today,
      updatedAt: nowIso,
    };
  }

  if (params.mode === 'login') {
    throw new Error(
      'Số điện thoại này chưa được đăng ký tài khoản. Vui lòng chọn tab "Đăng ký mới" và nhập Tên gọi của bạn.'
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

  const newRecord: ServerAccountRecord = {
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

  await accountsCol.updateOne(
    { normalizedPhone },
    { $set: newRecord },
    { upsert: true }
  );

  return newRecord;
}

export async function updateAccountPreferencesInMongo(params: {
  userId?: string;
  rawPhone?: string;
  patrolModeActive?: boolean;
  partnerName?: string;
  coupleRoomCode?: string;
}): Promise<boolean> {
  const db = await getMongoDb();
  const accountsCol = db.collection<ServerAccountRecord>('accounts');
  const normalizedPhone = params.rawPhone
    ? normalizePhoneDigits(params.rawPhone)
    : '';

  const filter = normalizedPhone
    ? { normalizedPhone }
    : params.userId
    ? { id: params.userId }
    : null;
  if (!filter) return false;

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof params.patrolModeActive === 'boolean') {
    updates.patrolModeActive = params.patrolModeActive;
  }
  if (typeof params.partnerName === 'string') {
    updates.partnerName = params.partnerName.trim();
  }
  if (typeof params.coupleRoomCode === 'string' && params.coupleRoomCode.trim()) {
    updates.coupleRoomCode = params.coupleRoomCode.trim();
  }

  await accountsCol.updateOne(filter, { $set: updates });
  return true;
}

export async function listDeletedSpotIdsFromMongo(): Promise<string[]> {
  const db = await getMongoDb();
  const [deletedDocs, deletedPosts] = await Promise.all([
    db
      .collection<{ spotId: string }>('deleted_posts')
      .find({})
      .project<{ spotId: string }>({ spotId: 1 })
      .toArray(),
    db
      .collection<MongoStoredPostDoc>('posts')
      .find({ isDeleted: true })
      .project<{ id: string }>({ id: 1 })
      .toArray(),
  ]);

  const set = new Set<string>();
  for (const d of deletedDocs) {
    if (d?.spotId) set.add(String(d.spotId));
  }
  for (const p of deletedPosts) {
    if (p?.id) set.add(String(p.id));
  }
  return Array.from(set);
}

export async function fetchCommunitySpotsFromMongo(
  viewerId?: string | null
): Promise<DomSpot[]> {
  const db = await getMongoDb();
  const deletedIds = await listDeletedSpotIdsFromMongo();
  const deletedSet = new Set(deletedIds);

  const docs = await db
    .collection<MongoStoredPostDoc>('posts')
    .find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const results: DomSpot[] = [];

  for (const rec of docs) {
    if (!rec || !rec.spot || rec.isDeleted) continue;
    if (isSpotDeletedOrHidden(rec.spot, deletedSet)) continue;

    const isOwner = Boolean(viewerId && rec.authorId === viewerId);
    const isUnlocked =
      isOwner ||
      Boolean(viewerId && (rec.unlockedViewerIds || []).includes(viewerId));

    const createdMs = Date.parse(rec.createdAt || rec.spot.createdAt);
    const elapsedHours = Number.isNaN(createdMs)
      ? 0
      : Math.max(0, Math.floor((Date.now() - createdMs) / 3600000));

    const cleanPhone = (rec.rawPhone || '').replace(/\D/g, '');

    results.push({
      ...rec.spot,
      hoursAgo: elapsedHours,
      isContactUnlockedForViewer: isUnlocked,
      rawPhoneSecret: isUnlocked ? rec.rawPhone : undefined,
      zaloLink:
        isUnlocked && cleanPhone ? `https://zalo.me/${cleanPhone}` : undefined,
    });
  }

  return results;
}

export async function createSpotInMongo(params: {
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
}): Promise<{
  spot: DomSpot;
  remainingToday: number;
}> {
  const db = await getMongoDb();
  const accountsCol = db.collection<ServerAccountRecord>('accounts');
  const postsCol = db.collection<MongoStoredPostDoc>('posts');
  const deletedCol = db.collection<{ spotId: string; deletedAt: string }>(
    'deleted_posts'
  );

  const cleanPhone = (params.rawPhone || '').trim();
  const normalizedPhone = normalizePhoneDigits(cleanPhone);
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const existingAccount = await accountsCol.findOne({ normalizedPhone });
  let account: ServerAccountRecord;
  if (!existingAccount) {
    const profileId =
      params.authorId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        params.authorId
      )
        ? params.authorId
        : deterministicAccountIdFromPhone(normalizedPhone);

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
    await accountsCol.updateOne(
      { normalizedPhone },
      { $set: account },
      { upsert: true }
    );
  } else {
    account = {
      id: existingAccount.id,
      displayName: existingAccount.displayName,
      normalizedPhone: existingAccount.normalizedPhone,
      rawPhone: existingAccount.rawPhone,
      maskedPhone: existingAccount.maskedPhone,
      pinHash: existingAccount.pinHash,
      deviceSecretToken: existingAccount.deviceSecretToken,
      coupleRoomCode: existingAccount.coupleRoomCode,
      partnerName: existingAccount.partnerName,
      patrolModeActive: existingAccount.patrolModeActive,
      dailyPostCount:
        existingAccount.lastPostDate !== today
          ? 0
          : existingAccount.dailyPostCount || 0,
      lastPostDate: today,
      spamAttempts:
        existingAccount.lastPostDate !== today
          ? 0
          : existingAccount.spamAttempts || 0,
      isShadowbanned: Boolean(existingAccount.isShadowbanned),
      createdAt: existingAccount.createdAt,
      updatedAt: existingAccount.updatedAt,
    };
  }

  if (!params.skipRateLimit) {
    if (account.dailyPostCount >= 3 && !account.isShadowbanned) {
      account.spamAttempts = (account.spamAttempts || 0) + 1;
      if (account.spamAttempts >= 4) {
        account.isShadowbanned = true;
        await accountsCol.updateOne(
          { normalizedPhone },
          {
            $set: {
              spamAttempts: account.spamAttempts,
              isShadowbanned: true,
              updatedAt: nowIso,
            },
          }
        );
      } else {
        await accountsCol.updateOne(
          { normalizedPhone },
          {
            $set: {
              spamAttempts: account.spamAttempts,
              updatedAt: nowIso,
            },
          }
        );
        throw new Error(
          'Mỗi tài khoản được đăng tối đa 3 bài/ngày để chống tin rác. Bạn vẫn có thể Báo phát hiện mới hoặc Quan tâm bài viết không giới hạn.'
        );
      }
    }
    account.dailyPostCount += 1;
    await accountsCol.updateOne(
      { normalizedPhone },
      {
        $set: {
          dailyPostCount: account.dailyPostCount,
          lastPostDate: today,
          updatedAt: nowIso,
        },
      }
    );
  }

  if (params.id) {
    const existing = await postsCol.findOne({
      id: params.id,
      isDeleted: { $ne: true },
    });
    if (existing) {
      return {
        spot: {
          ...existing.spot,
          rawPhoneSecret: existing.rawPhone,
          isContactUnlockedForViewer: true,
        },
        remainingToday: Math.max(0, 3 - account.dailyPostCount),
      };
    }
  }

  const fuzzed = params.hasExactLocation
    ? params.publicLat && params.publicLng
      ? {
          publicLat: params.publicLat,
          publicLng: params.publicLng,
          fuzzRadiusMeters: 200,
        }
      : fuzzCoordinates(params.exactLat, params.exactLng)
    : { publicLat: 0, publicLng: 0, fuzzRadiusMeters: 0 };

  const spotId = params.id || crypto.randomUUID();
  const maskedPhone = maskPhoneNumber(cleanPhone);

  const newSpot: DomSpot = {
    id: spotId,
    authorId: account.id,
    authorName: params.authorName.trim(),
    spotType: params.spotType,
    status: account.isShadowbanned ? 'SHADOWBANNED' : 'ACTIVE',
    visibility: params.visibility || 'PUBLIC',
    coupleRoomCode:
      params.visibility === 'PRIVATE_COUPLE'
        ? params.coupleRoomCode
        : undefined,
    title: params.title.trim(),
    story: params.story.trim() || 'Cần cộng đồng quanh khu vực hỗ trợ.',
    species: params.species,
    breed: params.breed.trim() || 'Chưa rõ giống',
    coatColor: params.coatColor.trim() || 'Chưa rõ màu lông',
    traits: params.traits.length > 0 ? params.traits : ['Cần hỗ trợ'],
    images: params.images,
    publicLat: fuzzed.publicLat,
    publicLng: fuzzed.publicLng,
    fuzzRadiusMeters: fuzzed.fuzzRadiusMeters,
    areaLabel: params.areaLabel.trim() || 'Chưa rõ khu vực',
    formattedAddress: params.formattedAddress || params.areaLabel.trim(),
    hasExactLocation: params.hasExactLocation,
    lightPower: 100,
    boostCount: 1,
    allowFoster: params.allowFoster,
    maskedPhone,
    isContactUnlockedForViewer: true,
    rawPhoneSecret: cleanPhone,
    zaloLink: `https://zalo.me/${cleanPhone.replace(/\D/g, '')}`,
    sourceType: 'USER_POST',
    sourcePlatform: 'USER_POST',
    publishedDate: nowIso.slice(0, 10),
    hoursAgo: 0,
    createdAt: nowIso,
    sightings: [],
  };

  const storedPublicSpot: DomSpot = {
    ...newSpot,
    isContactUnlockedForViewer: false,
    rawPhoneSecret: undefined,
    zaloLink: undefined,
  };

  const doc: MongoStoredPostDoc = {
    id: spotId,
    spot: storedPublicSpot,
    authorId: account.id,
    authorName: params.authorName.trim(),
    rawPhone: cleanPhone,
    normalizedPhone,
    exactLat: params.exactLat,
    exactLng: params.exactLng,
    hasExactLocation: params.hasExactLocation,
    unlockedViewerIds: [account.id],
    isDeleted: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await Promise.all([
    postsCol.updateOne({ id: spotId }, { $set: doc }, { upsert: true }),
    deletedCol.deleteOne({ spotId }),
  ]);

  return {
    spot: newSpot,
    remainingToday: Math.max(0, 3 - account.dailyPostCount),
  };
}

export async function updateSpotInMongo(params: {
  spotId: string;
  authorId?: string;
  authorName?: string;
  rawPhone?: string;
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
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');

  const rec = await postsCol.findOne({
    id: params.spotId,
    isDeleted: { $ne: true },
  });
  if (!rec) return null;

  const reqPhoneNorm = normalizePhoneDigits(params.rawPhone);
  const recPhoneNorm =
    rec.normalizedPhone || normalizePhoneDigits(rec.rawPhone);
  const derivedAuthorFromPhone = reqPhoneNorm
    ? deterministicAccountIdFromPhone(reqPhoneNorm)
    : '';

  const isOwner =
    (Boolean(params.authorId) && rec.authorId === params.authorId) ||
    (Boolean(derivedAuthorFromPhone) &&
      rec.authorId === derivedAuthorFromPhone) ||
    (Boolean(reqPhoneNorm) &&
      Boolean(recPhoneNorm) &&
      reqPhoneNorm === recPhoneNorm);

  if (!isOwner) {
    throw new Error('Bạn chỉ có thể chỉnh sửa bài viết do chính bạn đăng.');
  }

  let publicLat = rec.spot.publicLat;
  let publicLng = rec.spot.publicLng;
  let fuzzRadiusMeters = rec.spot.fuzzRadiusMeters;

  if (!params.hasExactLocation) {
    publicLat = 0;
    publicLng = 0;
    fuzzRadiusMeters = 0;
  } else if (
    typeof params.exactLat === 'number' &&
    typeof params.exactLng === 'number' &&
    params.exactLat > 0 &&
    params.exactLng > 0
  ) {
    const moved = calculateDistanceMeters(
      rec.exactLat || rec.spot.publicLat,
      rec.exactLng || rec.spot.publicLng,
      params.exactLat,
      params.exactLng
    );
    if (moved > 30 || !rec.spot.publicLat || !rec.spot.publicLng) {
      const fuzzed = fuzzCoordinates(params.exactLat, params.exactLng);
      publicLat = fuzzed.publicLat;
      publicLng = fuzzed.publicLng;
      fuzzRadiusMeters = fuzzed.fuzzRadiusMeters;
    }
  }

  const updatedPublicSpot: DomSpot = {
    ...rec.spot,
    authorName: params.authorName?.trim() || rec.spot.authorName,
    spotType: params.spotType,
    title: params.title.trim(),
    story: params.story.trim() || rec.spot.story,
    species: params.species,
    breed: params.breed.trim() || 'Chưa rõ giống',
    coatColor: params.coatColor.trim() || 'Chưa rõ màu lông',
    traits: params.traits.length > 0 ? params.traits : ['Cần hỗ trợ'],
    images: params.images.length > 0 ? params.images : rec.spot.images,
    publicLat,
    publicLng,
    fuzzRadiusMeters,
    areaLabel: params.areaLabel.trim() || rec.spot.areaLabel,
    formattedAddress:
      params.formattedAddress?.trim() ||
      params.areaLabel.trim() ||
      rec.spot.formattedAddress,
    hasExactLocation: params.hasExactLocation,
    allowFoster: params.allowFoster,
    isContactUnlockedForViewer: false,
    rawPhoneSecret: undefined,
    zaloLink: undefined,
  };

  const nowIso = new Date().toISOString();
  await postsCol.updateOne(
    { id: params.spotId },
    {
      $set: {
        spot: updatedPublicSpot,
        exactLat:
          typeof params.exactLat === 'number' && params.exactLat > 0
            ? params.exactLat
            : rec.exactLat,
        exactLng:
          typeof params.exactLng === 'number' && params.exactLng > 0
            ? params.exactLng
            : rec.exactLng,
        hasExactLocation: params.hasExactLocation,
        updatedAt: nowIso,
      },
    }
  );

  const cleanPhone = (rec.rawPhone || '').replace(/\D/g, '');
  return {
    ...updatedPublicSpot,
    isContactUnlockedForViewer: true,
    rawPhoneSecret: rec.rawPhone,
    zaloLink: cleanPhone ? `https://zalo.me/${cleanPhone}` : undefined,
  };
}

export async function deleteSpotInMongo(params: {
  spotId: string;
  authorId?: string;
  rawPhone?: string;
  skipOwnershipCheck?: boolean;
}): Promise<boolean> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');
  const deletedCol = db.collection<{ spotId: string; deletedAt: string }>(
    'deleted_posts'
  );

  const rec = await postsCol.findOne({ id: params.spotId });
  if (rec && !params.skipOwnershipCheck) {
    const reqPhoneNorm = normalizePhoneDigits(params.rawPhone);
    const recPhoneNorm =
      rec.normalizedPhone || normalizePhoneDigits(rec.rawPhone);
    const derivedAuthorFromPhone = reqPhoneNorm
      ? deterministicAccountIdFromPhone(reqPhoneNorm)
      : '';

    const isOwner =
      (Boolean(params.authorId) && rec.authorId === params.authorId) ||
      (Boolean(derivedAuthorFromPhone) &&
        rec.authorId === derivedAuthorFromPhone) ||
      (Boolean(reqPhoneNorm) &&
        Boolean(recPhoneNorm) &&
        reqPhoneNorm === recPhoneNorm);

    if (!isOwner) {
      throw new Error('Bạn chỉ có thể xóa bài viết do chính bạn đăng.');
    }
  }

  const nowIso = new Date().toISOString();
  await Promise.all([
    deletedCol.updateOne(
      { spotId: params.spotId },
      { $set: { spotId: params.spotId, deletedAt: nowIso } },
      { upsert: true }
    ),
    postsCol.deleteOne({ id: params.spotId }),
  ]);

  return true;
}

export async function boostSpotLightInMongo(
  spotId: string,
  delta = 20
): Promise<{ lightPower: number; boostCount: number } | null> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');

  const rec = await postsCol.findOne({
    id: spotId,
    isDeleted: { $ne: true },
  });
  if (!rec) return null;

  const nextPower = Math.min(300, (rec.spot.lightPower || 100) + delta);
  const nextBoost = (rec.spot.boostCount || 1) + 1;

  await postsCol.updateOne(
    { id: spotId },
    {
      $set: {
        'spot.lightPower': nextPower,
        'spot.boostCount': nextBoost,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return { lightPower: nextPower, boostCount: nextBoost };
}

export async function addSpotSightingInMongo(params: {
  spotId: string;
  reporterId?: string;
  reporterName: string;
  reporterPhone?: string;
  imageUrl?: string;
  note: string;
  emotionTag: string;
  lat: number;
  lng: number;
  originLat: number;
  originLng: number;
}): Promise<SightingItem> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');
  const sightingsCol = db.collection<SightingItem & { spotId: string }>(
    'sightings'
  );

  const dist = calculateDistanceMeters(
    params.originLat,
    params.originLng,
    params.lat,
    params.lng
  );

  const item: SightingItem = {
    id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reporterName: params.reporterName.trim() || 'Người đi đường tốt bụng',
    createdAt: 'Vừa xong',
    imageUrl: params.imageUrl || '',
    note: params.note.trim(),
    emotionTag: params.emotionTag.trim() || 'Đang di chuyển',
    distanceFromOriginMeters: dist,
    lat: params.lat,
    lng: params.lng,
  };

  await sightingsCol.insertOne({ ...item, spotId: params.spotId });

  const rec = await postsCol.findOne({
    id: params.spotId,
    isDeleted: { $ne: true },
  });
  if (rec) {
    const updatedSightings = [item, ...(rec.spot.sightings || [])];
    const nextPower = Math.min(200, (rec.spot.lightPower || 100) + 25);
    const nextBoost = (rec.spot.boostCount || 1) + 1;
    await postsCol.updateOne(
      { id: params.spotId },
      {
        $set: {
          'spot.sightings': updatedSightings,
          'spot.lightPower': nextPower,
          'spot.boostCount': nextBoost,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  return item;
}

export async function unlockSpotContactInMongo(params: {
  spotId: string;
  requesterId: string;
  requesterName: string;
  requesterPhone?: string;
  requestType: 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER';
  message: string;
  proofImageUrl?: string;
}): Promise<{
  rawPhone: string | null;
  maskedPhone: string | null;
  zaloLink: string | null;
}> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');
  const unlocksCol = db.collection('contact_unlocks');

  await unlocksCol.insertOne({
    id: `unlock-${Date.now()}`,
    spotId: params.spotId,
    requesterId: params.requesterId,
    requesterName: params.requesterName,
    requesterPhone: params.requesterPhone || '',
    requestType: params.requestType,
    message: params.message,
    proofImageUrl: params.proofImageUrl,
    createdAt: new Date().toISOString(),
  });

  const rec = await postsCol.findOne({
    id: params.spotId,
    isDeleted: { $ne: true },
  });
  if (!rec) {
    return { rawPhone: null, maskedPhone: null, zaloLink: null };
  }

  if (
    params.requesterId &&
    !(rec.unlockedViewerIds || []).includes(params.requesterId)
  ) {
    await postsCol.updateOne(
      { id: params.spotId },
      {
        $addToSet: { unlockedViewerIds: params.requesterId },
        $set: { updatedAt: new Date().toISOString() },
      }
    );
  }

  const cleanPhone = (rec.rawPhone || '').replace(/\D/g, '');
  return {
    rawPhone: rec.rawPhone || null,
    maskedPhone: rec.spot.maskedPhone || null,
    zaloLink: cleanPhone ? `https://zalo.me/${cleanPhone}` : null,
  };
}

export async function resolveSpotToPeaceInMongo(
  spotId: string
): Promise<boolean> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');

  const res = await postsCol.updateOne(
    { id: spotId },
    {
      $set: {
        'spot.spotType': 'GREEN_PEACE',
        'spot.status': 'RESOLVED',
        'spot.lightPower': 180,
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return res.matchedCount > 0;
}

export async function activateEmergencyBoostInMongo(
  spotId: string
): Promise<boolean> {
  const db = await getMongoDb();
  const postsCol = db.collection<MongoStoredPostDoc>('posts');

  const res = await postsCol.updateOne(
    { id: spotId },
    {
      $set: {
        'spot.lightPower': 300,
        'spot.isEmergencyBoosted': true,
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return res.matchedCount > 0;
}

export async function createMemorySnapInMongo(params: {
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
}): Promise<MemorySnap> {
  const db = await getMongoDb();
  const memoriesCol = db.collection<MemorySnap & { authorId?: string }>(
    'memories'
  );

  const lat = params.lat || 10.7782;
  const lng = params.lng || 106.6982;

  const snap: MemorySnap = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    postId: params.postId || `spot-${Date.now()}`,
    petName: params.petName.trim(),
    weekNumber: params.weekNumber,
    imageUrl: params.imageUrl,
    caption: params.caption.trim(),
    moodTag: params.moodTag.trim() || 'Bình an & khỏe mạnh',
    weightKg: params.weightKg,
    sentToRescuer: true,
    rescuerName: params.authorName?.trim() || 'Cộng đồng Đốm Nhỏ',
    areaLabel: 'TP.HCM',
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  await memoriesCol.insertOne({
    ...snap,
    authorId: params.authorId,
  });

  return snap;
}

export async function fetchMemorySnapsFromMongo(): Promise<MemorySnap[]> {
  const db = await getMongoDb();
  const docs = await db
    .collection<MemorySnap>('memories')
    .find({})
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  return docs.map((d) => ({
    id: d.id,
    postId: d.postId || '',
    petName: d.petName,
    weekNumber: d.weekNumber,
    imageUrl: d.imageUrl,
    caption: d.caption,
    moodTag: d.moodTag,
    weightKg: d.weightKg,
    sentToRescuer: d.sentToRescuer ?? true,
    rescuerName: d.rescuerName || 'Cộng đồng Đốm Nhỏ',
    areaLabel: d.areaLabel || 'TP.HCM',
    googleMapsUrl: d.googleMapsUrl,
    createdAt: d.createdAt,
  }));
}
