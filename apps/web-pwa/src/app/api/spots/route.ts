import { NextRequest, NextResponse } from 'next/server';
import {
  INITIAL_DOM_SPOTS,
  VET_EMERGENCY_STATIONS,
} from '@/lib/seed-data';
import {
  calculateDistanceMeters,
  findDoubleMatchesWithin3Km,
} from '@/lib/security';
import {
  activateEmergencyBoostInMongo,
  addSpotSightingInMongo,
  boostSpotLightInMongo,
  createMemorySnapInMongo,
  createSpotInMongo,
  deleteSpotInMongo,
  fetchCommunitySpotsFromMongo,
  fetchMemorySnapsFromMongo,
  listDeletedSpotIdsFromMongo,
  resolveSpotToPeaceInMongo,
  unlockSpotContactInMongo,
  updateSpotInMongo,
} from '@/lib/mongodb';
import {
  productionRequiresMongo,
  rejectUntrustedOrigin,
  resolveAuthenticatedAccount,
  unauthorizedResponse,
} from '@/lib/server-auth';
import {
  activateEmergencyBoostInServerStore,
  addSightingInServerStore,
  boostSpotInServerStore,
  createMemorySnapInServerStore,
  createSpotInServerStore,
  deleteSpotInServerStore,
  listCommunitySpotsFromServerStore,
  listDeletedSpotIdsFromServerStore,
  listMemorySnapsFromServerStore,
  resolveSpotToPeaceInServerStore,
  syncIncomingPeerSpotInServerStore,
  unlockContactInServerStore,
  updateSpotInServerStore,
} from '@/lib/server-community-store';
import {
  DomSpot,
  MemorySnap,
  SpotMatchResult,
  SpotType,
  isSpotDeletedOrHidden,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

async function ownsSpot(spotId: string, accountId: string): Promise<boolean> {
  if (!spotId || !accountId) return false;
  const [mongoSpots, serverSpots] = await Promise.all([
    fetchCommunitySpotsFromMongo(accountId).catch(() => [] as DomSpot[]),
    Promise.resolve(listCommunitySpotsFromServerStore(accountId)),
  ]);
  const spot = [...mongoSpots, ...serverSpots].find((item) => item.id === spotId);
  return Boolean(spot && spot.authorId === accountId);
}

/**
 * GET /api/spots
 * Trả về danh sách bài đăng cộng đồng thời gian thực từ MongoDB Atlas + Server Community Store kết hợp với bài viết đã xác thực.
 * Bảo mật: Không bao giờ trả về rawPhone cho người lạ khi chưa mở khóa liên hệ.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const account = await resolveAuthenticatedAccount(request);
  const lat = Number(searchParams.get('lat') || 0);
  const lng = Number(searchParams.get('lng') || 0);
  const radiusMeters = Number(searchParams.get('radius') || 0);
  const filterType = (searchParams.get('type') || 'ALL') as SpotType | 'ALL';
  const viewerId = account?.id || null;
  const coupleCode = account?.coupleRoomCode || '';
  const includeMemories = searchParams.get('includeMemories') === '1';

  const [mongoSpots, mongoDeletedIds, mongoMemories] = await Promise.all([
    fetchCommunitySpotsFromMongo(viewerId).catch(() => [] as DomSpot[]),
    listDeletedSpotIdsFromMongo().catch(() => [] as string[]),
    includeMemories
      ? fetchMemorySnapsFromMongo().catch(() => [] as MemorySnap[])
      : Promise.resolve([] as MemorySnap[]),
  ]);

  const serverSpots = listCommunitySpotsFromServerStore(viewerId);
  const serverDeletedIds = listDeletedSpotIdsFromServerStore();
  const deletedSet = new Set<string>([...mongoDeletedIds, ...serverDeletedIds]);
  const deletedSpotIds = Array.from(deletedSet);

  const serverMemories = includeMemories
    ? listMemorySnapsFromServerStore()
    : [];

  const spotMap = new Map<string, DomSpot>();
  for (const sp of [...mongoSpots, ...serverSpots, ...INITIAL_DOM_SPOTS]) {
    if (isSpotDeletedOrHidden(sp, deletedSet)) continue;
    const prev = spotMap.get(sp.id);
    if (!prev) {
      spotMap.set(sp.id, sp);
      continue;
    }
    const seenSightingIds = new Set<string>();
    const mergedSightings = [
      ...(prev.sightings || []),
      ...(sp.sightings || []),
    ].filter((st) => {
      if (!st?.id || seenSightingIds.has(st.id)) return false;
      seenSightingIds.add(st.id);
      return true;
    });
    const isResolved =
      prev.status === 'RESOLVED' ||
      sp.status === 'RESOLVED' ||
      prev.spotType === 'GREEN_PEACE' ||
      sp.spotType === 'GREEN_PEACE';

    spotMap.set(sp.id, {
      ...sp,
      ...prev,
      spotType: isResolved ? 'GREEN_PEACE' : prev.spotType,
      status: isResolved ? 'RESOLVED' : prev.status,
      lightPower: Math.max(prev.lightPower || 0, sp.lightPower || 0),
      boostCount: Math.max(prev.boostCount || 0, sp.boostCount || 0),
      isEmergencyBoosted: Boolean(
        prev.isEmergencyBoosted || sp.isEmergencyBoosted
      ),
      isContactUnlockedForViewer: Boolean(
        prev.isContactUnlockedForViewer || sp.isContactUnlockedForViewer
      ),
      rawPhoneSecret: prev.rawPhoneSecret || sp.rawPhoneSecret,
      zaloLink: prev.zaloLink || sp.zaloLink,
      sightings: mergedSightings,
    });
  }

  const combinedSpots: DomSpot[] = Array.from(spotMap.values());

  const seenMemIds = new Set<string>();
  const memorySnaps: MemorySnap[] = [];
  for (const m of [...mongoMemories, ...serverMemories]) {
    if (!m || seenMemIds.has(m.id)) continue;
    seenMemIds.add(m.id);
    memorySnaps.push(m);
  }

  const visibleSpots = combinedSpots.filter((spot) => {
    if (isSpotDeletedOrHidden(spot, deletedSet)) return false;
    if (
      spot.status === 'SHADOWBANNED' &&
      (!viewerId || spot.authorId !== viewerId)
    ) {
      return false;
    }
    if (
      spot.visibility === 'PRIVATE_COUPLE' &&
      spot.coupleRoomCode &&
      spot.coupleRoomCode !== coupleCode
    ) {
      return false;
    }
    if (filterType !== 'ALL' && spot.spotType !== filterType) {
      return false;
    }
    if (radiusMeters > 0 && lat && lng && spot.publicLat && spot.publicLng) {
      const dist = calculateDistanceMeters(
        lat,
        lng,
        spot.publicLat,
        spot.publicLng
      );
      if (dist > radiusMeters) return false;
    }
    return true;
  });

  return NextResponse.json({
    ok: true,
    count: visibleSpots.length,
    spots: visibleSpots,
    communityCount: visibleSpots.filter((s) => s.sourceType === 'USER_POST')
      .length,
    deletedSpotIds,
    memorySnaps,
    vetStations: VET_EMERGENCY_STATIONS,
  });
}

/**
 * POST /api/spots
 * Tạo bài đăng mới lưu trực tiếp lên MongoDB Atlas (collection `posts`) và Server Community Store
 * để mọi người dùng trên mọi thiết bị đều thấy ngay lập tức.
 */
export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const account = await resolveAuthenticatedAccount(request);
    if (!account) return unauthorizedResponse();
    if (productionRequiresMongo()) {
      return NextResponse.json(
        { ok: false, error: 'Kho dữ liệu tài khoản chưa sẵn sàng.' },
        { status: 503 }
      );
    }
    const body = await request.json();

    const authorId = account.id;
    const authorName = account.displayName;
    const rawPhone = account.rawPhone;
    const title = String(body.title || '').trim();
    const story = String(body.story || '').trim();
    const breed = String(body.breed || '').trim();
    const coatColor = String(body.coatColor || '').trim();
    const areaLabel = String(
      body.areaLabel || body.customAddress || ''
    ).trim();
    const formattedAddress = String(
      body.formattedAddress || body.customAddress || areaLabel
    ).trim();
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter(
          (img: unknown) => typeof img === 'string' && img.length > 0
        )
      : [];

    if (!authorName || authorName.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng cung cấp tên người đăng (tối thiểu 2 ký tự).',
        },
        { status: 400 }
      );
    }

    if (rawPhone.replace(/\D/g, '').length < 9) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng cung cấp số điện thoại liên hệ hợp lệ.',
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: 'Tiêu đề bài đăng không được để trống.' },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng tải lên ít nhất 1 bức ảnh thực tế của thú cưng.',
        },
        { status: 400 }
      );
    }

    const exactLat = Number(body.exactLat ?? body.pinnedLat ?? 0);
    const exactLng = Number(body.exactLng ?? body.pinnedLng ?? 0);
    const spotType = (body.spotType as SpotType) || 'RED_SOS';
    const visibility =
      body.visibility === 'PRIVATE_COUPLE' ? 'PRIVATE_COUPLE' : 'PUBLIC';
    const species =
      body.species === 'dog' || body.species === 'other'
        ? body.species
        : 'cat';
    const traits = Array.isArray(body.traits) ? body.traits.map(String) : [];
    const hasExactLocation = Boolean(body.hasExactLocation ?? true);
    const allowFoster = Boolean(body.allowFoster);

    let finalSpot: DomSpot;
    let remainingToday = 2;

    try {
      const createdMongo = await createSpotInMongo({
        authorId,
        authorName,
        rawPhone,
        spotType,
        visibility,
        coupleRoomCode: account.coupleRoomCode || undefined,
        title,
        story,
        species,
        breed,
        coatColor,
        traits,
        images,
        exactLat,
        exactLng,
        hasExactLocation,
        areaLabel,
        formattedAddress,
        allowFoster,
      });

      finalSpot = createdMongo.spot;
      remainingToday = createdMongo.remainingToday;

      // Đồng bộ bản sao vào Server Store để truy xuất tốc độ cao
      if (!process.env.VERCEL) try {
        createSpotInServerStore({
          id: finalSpot.id,
          authorId: finalSpot.authorId,
          authorName,
          rawPhone,
          spotType,
          visibility,
          coupleRoomCode: account.coupleRoomCode || undefined,
          title,
          story,
          species,
          breed,
          coatColor,
          traits,
          images,
          exactLat,
          exactLng,
          publicLat: finalSpot.publicLat,
          publicLng: finalSpot.publicLng,
          hasExactLocation,
          areaLabel,
          formattedAddress,
          allowFoster,
          skipRateLimit: true,
        });
      } catch {
        // Ignore local cache write error
      }
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      if (msg.includes('3 bài/ngày')) {
        return NextResponse.json({ ok: false, error: msg }, { status: 429 });
      }
      if (process.env.VERCEL) throw dbErr;

      const createdServer = createSpotInServerStore({
        authorId,
        authorName,
        rawPhone,
        spotType,
        visibility,
        coupleRoomCode: account.coupleRoomCode || undefined,
        title,
        story,
        species,
        breed,
        coatColor,
        traits,
        images,
        exactLat,
        exactLng,
        hasExactLocation,
        areaLabel,
        formattedAddress,
        allowFoster,
      });

      finalSpot = createdServer.spot;
      remainingToday = createdServer.remainingToday;
    }

    const [mongoDeletedIds, mongoAll] = await Promise.all([
      listDeletedSpotIdsFromMongo().catch(() => [] as string[]),
      fetchCommunitySpotsFromMongo(finalSpot.authorId).catch(
        () => [] as DomSpot[]
      ),
    ]);
    const deletedSet = new Set<string>([
      ...mongoDeletedIds,
      ...listDeletedSpotIdsFromServerStore(),
    ]);
    const serverAll = listCommunitySpotsFromServerStore(finalSpot.authorId);

    const seenCandidateIds = new Set<string>([finalSpot.id]);
    const candidatePool: DomSpot[] = [];
    for (const sp of [...mongoAll, ...serverAll, ...INITIAL_DOM_SPOTS]) {
      if (!sp || !sp.id || seenCandidateIds.has(sp.id)) continue;
      if (isSpotDeletedOrHidden(sp, deletedSet)) continue;
      seenCandidateIds.add(sp.id);
      candidatePool.push(sp);
    }

    const matches: SpotMatchResult[] = findDoubleMatchesWithin3Km(
      finalSpot,
      candidatePool
    );

    return NextResponse.json({
      ok: true,
      spot: finalSpot,
      remainingToday,
      matches,
      dbMatches: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          'Không thể tạo bài đăng lúc này. Vui lòng kiểm tra thông tin và thử lại.',
      },
      { status: 400 }
    );
  }
}

/**
 * PATCH /api/spots
 * Thực thi các nghiệp vụ cộng đồng trực tiếp trên MongoDB Atlas & Server Store:
 * - UPDATE_SPOT: Chỉnh sửa bài đăng
 * - DELETE_SPOT: Xóa bài đăng
 * - BOOST_LIGHT: Truyền lửa (+light_power, +boost_count)
 * - ADD_SIGHTING: Báo phát hiện mới (lưu vào sightings)
 * - UNLOCK_CONTACT: Gửi lời nhắn & Mở khóa SĐT (lưu vào contact_unlocks & trả về SĐT thật)
 * - RESOLVE_PEACE: Đóng ca / Đã đoàn tụ (chuyển sang GREEN_PEACE & RESOLVED)
 * - EMERGENCY_BOOST: Kích hoạt khẩn cấp (ưu tiên hiển thị 48h)
 * - ADD_MEMORY_SNAP: Lưu ảnh Nhật ký hàng tuần (lưu vào memories)
 */
export async function PATCH(request: NextRequest) {
  try {
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'SYNC_SPOT' || action === 'SYNC_DELETE_SPOT') {
      return NextResponse.json(
        { ok: false, error: 'Kênh đồng bộ cũ đã bị vô hiệu hóa để bảo vệ dữ liệu.' },
        { status: 410 }
      );
    }

    const account =
      action === 'BOOST_LIGHT'
        ? null
        : await resolveAuthenticatedAccount(request);
    if (action !== 'BOOST_LIGHT' && !account) return unauthorizedResponse();
    if (action !== 'BOOST_LIGHT' && productionRequiresMongo()) {
      return NextResponse.json(
        { ok: false, error: 'Kho dữ liệu tài khoản chưa sẵn sàng.' },
        { status: 503 }
      );
    }

    if (action === 'UPDATE_SPOT') {
      const spotId = String(body.spotId || '').trim();
      const authorId = account!.id;
      const authorName = account!.displayName;
      const rawPhone = account!.rawPhone;
      const title = String(body.title || '').trim();
      const story = String(body.story || '').trim();
      const breed = String(body.breed || '').trim();
      const coatColor = String(body.coatColor || '').trim();
      const areaLabel = String(
        body.areaLabel || body.customAddress || ''
      ).trim();
      const formattedAddress = String(
        body.formattedAddress || body.customAddress || areaLabel
      ).trim();
      const images: string[] = Array.isArray(body.images)
        ? body.images.filter(
            (img: unknown) => typeof img === 'string' && img.length > 0
          )
        : [];

      if (!spotId) {
        return NextResponse.json(
          { ok: false, error: 'Thiếu mã bài đăng cần chỉnh sửa.' },
          { status: 400 }
        );
      }
      if (!(await ownsSpot(spotId, authorId))) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền chỉnh sửa bài đăng này.' },
          { status: 403 }
        );
      }
      if (!title) {
        return NextResponse.json(
          { ok: false, error: 'Tiêu đề bài đăng không được để trống.' },
          { status: 400 }
        );
      }

      const spotType = (body.spotType as SpotType) || 'RED_SOS';
      const species =
        body.species === 'dog' || body.species === 'other'
          ? body.species
          : 'cat';
      const traits = Array.isArray(body.traits) ? body.traits.map(String) : [];
      const exactLat = Number(body.exactLat ?? body.pinnedLat ?? 0);
      const exactLng = Number(body.exactLng ?? body.pinnedLng ?? 0);
      const hasExactLocation = Boolean(body.hasExactLocation ?? true);
      const allowFoster = Boolean(body.allowFoster);

      const [mongoUpdated, srvUpdated] = await Promise.all([
        updateSpotInMongo({
          spotId,
          authorId,
          authorName,
          rawPhone,
          spotType,
          title,
          story,
          species,
          breed,
          coatColor,
          traits,
          images,
          exactLat: exactLat > 0 ? exactLat : undefined,
          exactLng: exactLng > 0 ? exactLng : undefined,
          hasExactLocation,
          areaLabel,
          formattedAddress,
          allowFoster,
        }).catch((error) => {
          if (process.env.VERCEL) throw error;
          return null;
        }),
        process.env.VERCEL ? Promise.resolve(null) : Promise.resolve(
          updateSpotInServerStore({
            spotId,
            authorId,
            authorName,
            rawPhone,
            spotType,
            title,
            story,
            species,
            breed,
            coatColor,
            traits,
            images,
            exactLat: exactLat > 0 ? exactLat : undefined,
            exactLng: exactLng > 0 ? exactLng : undefined,
            hasExactLocation,
            areaLabel,
            formattedAddress,
            allowFoster,
          })
        ).catch(() => null),
      ]);

      const finalUpdated = mongoUpdated || srvUpdated;
      if (!finalUpdated) {
        return NextResponse.json(
          { ok: false, error: 'Không tìm thấy bài đăng để cập nhật.' },
          { status: 404 }
        );
      }
      if (finalUpdated) {
        syncIncomingPeerSpotInServerStore(finalUpdated);
      }

      return NextResponse.json({
        ok: true,
        spot: finalUpdated,
      });
    }

    if (action === 'DELETE_SPOT') {
      const spotId = String(body.spotId || '').trim();
      const authorId = account!.id;
      const rawPhone = account!.rawPhone;

      if (!spotId) {
        return NextResponse.json(
          { ok: false, error: 'Thiếu mã bài đăng cần xóa.' },
          { status: 400 }
        );
      }
      if (!(await ownsSpot(spotId, authorId))) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền xóa bài đăng này.' },
          { status: 403 }
        );
      }

      if (!process.env.VERCEL) {
        deleteSpotInServerStore({
          spotId,
          authorId,
          rawPhone,
        });
      }

      await deleteSpotInMongo({
        spotId,
        authorId,
        rawPhone,
      }).catch((error) => {
        if (process.env.VERCEL) throw error;
        return false;
      });

      return NextResponse.json({
        ok: true,
        spotId,
      });
    }

    if (action === 'BOOST_LIGHT') {
      const spotId = String(body.spotId || '');
      const delta = Number(body.delta || 20);
      const [mongoRes, srvRes] = await Promise.all([
        boostSpotLightInMongo(spotId, delta).catch((error) => {
          if (process.env.VERCEL) throw error;
          return null;
        }),
        process.env.VERCEL
          ? Promise.resolve(null)
          : Promise.resolve(boostSpotInServerStore(spotId, delta)),
      ]);
      const result = mongoRes || srvRes;
      return NextResponse.json({
        ok: true,
        spotId,
        lightPower: result?.lightPower ?? null,
        boostCount: result?.boostCount ?? null,
      });
    }

    if (action === 'ADD_SIGHTING') {
      const spotId = String(body.spotId || '');
      const note = String(body.note || '').trim();
      const imageUrl = String(body.imageUrl || '');
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!spotId || note.length < 3 || !imageUrl) {
        return NextResponse.json(
          { ok: false, error: 'Báo cáo cần có bài đăng, ảnh và mô tả hợp lệ.' },
          { status: 400 }
        );
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { ok: false, error: 'Tọa độ báo cáo không hợp lệ.' },
          { status: 400 }
        );
      }
      const srvSighting = process.env.VERCEL
        ? null
        : addSightingInServerStore({
            spotId,
            reporterName: account!.displayName,
            imageUrl,
            note,
            emotionTag: String(body.emotionTag || '').trim(),
            lat,
            lng,
            originLat: Number(body.originLat || 0),
            originLng: Number(body.originLng || 0),
          });

      const mongoSighting = await addSpotSightingInMongo({
        spotId,
        reporterId: account!.id,
        reporterName: account!.displayName,
        reporterPhone: account!.rawPhone,
        imageUrl,
        note,
        emotionTag: String(body.emotionTag || '').trim(),
        lat,
        lng,
        originLat: Number(body.originLat || 0),
        originLng: Number(body.originLng || 0),
      }).catch((error) => {
        if (process.env.VERCEL) throw error;
        return null;
      });

      return NextResponse.json({
        ok: true,
        sighting: mongoSighting || srvSighting,
      });
    }

    if (action === 'UNLOCK_CONTACT') {
      const spotId = String(body.spotId || '');
      const message = String(body.message || '').trim();
      if (!spotId || message.length < 5 || message.length > 1000) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng gửi lời nhắn hợp lệ trước khi xem liên hệ.' },
          { status: 400 }
        );
      }
      const reqType =
        body.requestType === 'ADOPT_REQUEST' ||
        body.requestType === 'FOSTER_OFFER'
          ? body.requestType
          : 'SIGHTING_REPORT';

      const [mongoUnlocked, srvUnlocked] = await Promise.all([
        unlockSpotContactInMongo({
          spotId,
          requesterId: account!.id,
          requesterName: account!.displayName,
          requesterPhone: account!.rawPhone,
          requestType: reqType,
          message,
          proofImageUrl: body.proofImageUrl
            ? String(body.proofImageUrl)
            : undefined,
        }).catch((error) => {
          if (process.env.VERCEL) throw error;
          return null;
        }),
        process.env.VERCEL ? Promise.resolve(null) : Promise.resolve(
          unlockContactInServerStore({
            spotId,
            requesterId: account!.id,
            requesterName: account!.displayName,
            requestType: reqType,
            message,
            proofImageUrl: body.proofImageUrl
              ? String(body.proofImageUrl)
              : undefined,
          })
        ),
      ]);

      const rawPhone =
        mongoUnlocked?.rawPhone || srvUnlocked?.rawPhone || '';
      const maskedPhone =
        mongoUnlocked?.maskedPhone || srvUnlocked?.maskedPhone || '';
      const zaloLink =
        mongoUnlocked?.zaloLink || srvUnlocked?.zaloLink || '';

      if (!rawPhone) {
        return NextResponse.json(
          { ok: false, error: 'Không tìm thấy thông tin liên hệ của bài đăng.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        rawPhone,
        maskedPhone,
        zaloLink,
      });
    }

    if (action === 'RESOLVE_PEACE') {
      const spotId = String(body.spotId || '');
      if (!(await ownsSpot(spotId, account!.id))) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền đóng bài đăng này.' },
          { status: 403 }
        );
      }
      const srvOk = process.env.VERCEL
        ? false
        : resolveSpotToPeaceInServerStore(spotId);
      const mongoOk = await resolveSpotToPeaceInMongo(spotId).catch((error) => {
        if (process.env.VERCEL) throw error;
        return false;
      });
      return NextResponse.json({
        ok: mongoOk || srvOk,
        spotId,
      });
    }

    if (action === 'EMERGENCY_BOOST') {
      const spotId = String(body.spotId || '');
      if (!(await ownsSpot(spotId, account!.id))) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền kích hoạt bài đăng này.' },
          { status: 403 }
        );
      }
      const srvOk = process.env.VERCEL
        ? false
        : activateEmergencyBoostInServerStore(spotId);
      const mongoOk = await activateEmergencyBoostInMongo(spotId).catch((error) => {
        if (process.env.VERCEL) throw error;
        return false;
      });
      return NextResponse.json({
        ok: mongoOk || srvOk,
        spotId,
      });
    }

    if (action === 'ADD_MEMORY_SNAP') {
      const postId = body.postId ? String(body.postId) : undefined;
      if (postId && !(await ownsSpot(postId, account!.id))) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền thêm nhật ký cho bài đăng này.' },
          { status: 403 }
        );
      }
      const srvSnap = process.env.VERCEL
        ? null
        : createMemorySnapInServerStore({
            postId,
            petName: String(body.petName || '').trim(),
            weekNumber: Number(body.weekNumber || 1),
            imageUrl: String(body.imageUrl || ''),
            caption: String(body.caption || '').trim(),
            moodTag: String(body.moodTag || '').trim(),
            weightKg: body.weightKg ? Number(body.weightKg) : undefined,
            rescuerName: account!.displayName,
            lat: body.lat ? Number(body.lat) : undefined,
            lng: body.lng ? Number(body.lng) : undefined,
          });

      const mongoSnap = await createMemorySnapInMongo({
        postId,
        authorId: account!.id,
        authorName: account!.displayName,
        authorPhone: account!.rawPhone,
        petName: String(body.petName || '').trim(),
        weekNumber: Number(body.weekNumber || 1),
        imageUrl: String(body.imageUrl || ''),
        caption: String(body.caption || '').trim(),
        moodTag: String(body.moodTag || '').trim(),
        weightKg: body.weightKg ? Number(body.weightKg) : undefined,
        lat: body.lat ? Number(body.lat) : undefined,
        lng: body.lng ? Number(body.lng) : undefined,
      }).catch((error) => {
        if (process.env.VERCEL) throw error;
        return null;
      });

      return NextResponse.json({
        ok: true,
        snap: mongoSnap || srvSnap,
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Hành động không hợp lệ.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Không thể xử lý yêu cầu lúc này.',
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const account = await resolveAuthenticatedAccount(request);
    if (!account) return unauthorizedResponse();
    if (productionRequiresMongo()) {
      return NextResponse.json(
        { ok: false, error: 'Kho dữ liệu tài khoản chưa sẵn sàng.' },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const spotId = String(
      body.spotId || searchParams.get('spotId') || ''
    ).trim();
    const authorId = account.id;
    const rawPhone = account.rawPhone;

    if (!spotId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu mã bài đăng cần xóa.' },
        { status: 400 }
      );
    }
    if (!(await ownsSpot(spotId, authorId))) {
      return NextResponse.json(
        { ok: false, error: 'Bạn không có quyền xóa bài đăng này.' },
        { status: 403 }
      );
    }

    if (!process.env.VERCEL) {
      deleteSpotInServerStore({
        spotId,
        authorId,
        rawPhone,
      });
    }
    await deleteSpotInMongo({
      spotId,
      authorId,
      rawPhone,
    }).catch((error) => {
      if (process.env.VERCEL) throw error;
      return false;
    });

    return NextResponse.json({
      ok: true,
      spotId,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Không thể xóa bài đăng lúc này.',
      },
      { status: 400 }
    );
  }
}
