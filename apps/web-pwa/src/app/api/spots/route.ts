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
  activateEmergencyBoostInSupabase,
  addSpotSightingInSupabase,
  boostSpotLightInSupabase,
  createMemorySnapInSupabase,
  createSpotInSupabase,
  deleteSpotInSupabase,
  fetchCommunitySpotsFromSupabase,
  fetchMemorySnapsFromSupabase,
  resolveSpotToPeaceInSupabase,
  unlockSpotContactInSupabase,
  updateSpotInSupabase,
} from '@/lib/supabase';
import {
  DomSpot,
  MemorySnap,
  SpotMatchResult,
  SpotType,
  isSpotDeletedOrHidden,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/spots
 * Trả về danh sách bài đăng cộng đồng thời gian thực từ Supabase + Server Community Store kết hợp với bài viết đã xác thực.
 * Bảo mật: Không bao giờ trả về rawPhone cho người lạ khi chưa mở khóa liên hệ.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat') || 0);
  const lng = Number(searchParams.get('lng') || 0);
  const radiusMeters = Number(searchParams.get('radius') || 0);
  const filterType = (searchParams.get('type') || 'ALL') as SpotType | 'ALL';
  const viewerId = searchParams.get('viewerId') || null;
  const coupleCode = searchParams.get('coupleCode') || '';
  const includeMemories = searchParams.get('includeMemories') === '1';

  const [dbSpots, dbMemories] = await Promise.all([
    fetchCommunitySpotsFromSupabase(viewerId).catch(() => [] as DomSpot[]),
    includeMemories
      ? fetchMemorySnapsFromSupabase().catch(() => [] as MemorySnap[])
      : Promise.resolve([] as MemorySnap[]),
  ]);

  const serverSpots = listCommunitySpotsFromServerStore(viewerId);
  const deletedSpotIds = listDeletedSpotIdsFromServerStore();
  const deletedSet = new Set(deletedSpotIds);
  const serverMemories = includeMemories
    ? listMemorySnapsFromServerStore()
    : [];

  const spotMap = new Map<string, DomSpot>();
  for (const sp of [...serverSpots, ...dbSpots, ...INITIAL_DOM_SPOTS]) {
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
  for (const m of [...dbMemories, ...serverMemories]) {
    if (!m || seenMemIds.has(m.id)) continue;
    seenMemIds.add(m.id);
    memorySnaps.push(m);
  }

  const visibleSpots = combinedSpots.filter((spot) => {
    if (spot.lightPower <= 0 || spot.status === 'FADED') return false;
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
    communityCount: visibleSpots.filter((s) => s.sourceType === 'USER_POST').length,
    deletedSpotIds,
    memorySnaps,
    vetStations: VET_EMERGENCY_STATIONS,
  });
}

/**
 * POST /api/spots
 * Tạo bài đăng mới lưu trực tiếp lên Supabase (public.dom_nho_posts) và Server Community Store
 * để mọi người dùng trên mọi thiết bị đều thấy ngay lập tức.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authorId = String(body.authorId || '').trim();
    const authorName = String(body.authorName || '').trim();
    const rawPhone = String(body.rawPhone || '').trim();
    const pinCode = String(body.pinCode || '').trim();
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
    let dbMatches: any[] = [];

    try {
      const createdDb = await createSpotInSupabase({
        authorId,
        authorName,
        rawPhone,
        pinCode,
        spotType,
        visibility,
        coupleRoomCode: body.coupleRoomCode || undefined,
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

      finalSpot = createdDb.spot;
      remainingToday = createdDb.remainingToday;
      dbMatches = createdDb.dbMatches;

      // Đồng bộ bản sao vào Server Store để truy xuất tốc độ cao
      createSpotInServerStore({
        id: finalSpot.id,
        authorId: finalSpot.authorId,
        authorName,
        rawPhone,
        pinCode,
        spotType,
        visibility,
        coupleRoomCode: body.coupleRoomCode || undefined,
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
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '');
      if (msg.includes('3 bài/ngày')) {
        return NextResponse.json({ ok: false, error: msg }, { status: 429 });
      }

      // Lưu vào Server Community Store (áp dụng đúng Rate-Limit 3 bài/ngày, Fuzzing ±150m-300m, Masking SĐT)
      const createdServer = createSpotInServerStore({
        authorId,
        authorName,
        rawPhone,
        pinCode,
        spotType,
        visibility,
        coupleRoomCode: body.coupleRoomCode || undefined,
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

    const deletedSet = new Set(listDeletedSpotIdsFromServerStore());
    const [dbAll, serverAll] = await Promise.all([
      fetchCommunitySpotsFromSupabase(finalSpot.authorId).catch(
        () => [] as DomSpot[]
      ),
      Promise.resolve(listCommunitySpotsFromServerStore(finalSpot.authorId)),
    ]);

    const seenCandidateIds = new Set<string>([finalSpot.id]);
    const candidatePool: DomSpot[] = [];
    for (const sp of [...dbAll, ...serverAll, ...INITIAL_DOM_SPOTS]) {
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
      dbMatches,
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
 * Thực thi các nghiệp vụ cộng đồng trực tiếp trên Supabase & Server Store:
 * - BOOST_LIGHT: Truyền lửa (+light_power, +boost_count)
 * - ADD_SIGHTING: Báo phát hiện mới (lưu vào spot_sightings)
 * - UNLOCK_CONTACT: Gửi lời nhắn & Mở khóa SĐT (lưu vào contact_unlock_requests & trả về SĐT thật)
 * - RESOLVE_PEACE: Đóng ca / Đã đoàn tụ (chuyển sang GREEN_PEACE & RESOLVED)
 * - EMERGENCY_BOOST: Kích hoạt khẩn cấp (ưu tiên hiển thị 48h)
 * - ADD_MEMORY_SNAP: Lưu ảnh Nhật ký hàng tuần (lưu vào memory_snaps)
 * - SYNC_SPOT: Đồng bộ bài đăng cộng đồng nhận từ kênh Realtime WebSocket
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || '');

    if (action === 'SYNC_SPOT') {
      if (body.spot && typeof body.spot === 'object') {
        syncIncomingPeerSpotInServerStore(body.spot as DomSpot);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'SYNC_DELETE_SPOT') {
      const spotId = String(body.spotId || '').trim();
      if (spotId) {
        deleteSpotInServerStore({ spotId, skipOwnershipCheck: true });
      }
      return NextResponse.json({ ok: true, spotId });
    }

    if (action === 'UPDATE_SPOT') {
      const spotId = String(body.spotId || '').trim();
      const authorId = String(body.authorId || '').trim();
      const authorName = String(body.authorName || '').trim();
      const rawPhone = String(body.rawPhone || '').trim();
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
            error: 'Bài đăng cần có ít nhất 1 bức ảnh thực tế của thú cưng.',
          },
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

      const srvUpdated = updateSpotInServerStore({
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
      });

      const dbUpdated = await updateSpotInSupabase({
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
      }).catch(() => null);

      const finalUpdated = srvUpdated || dbUpdated;
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
      const authorId = String(body.authorId || '').trim();
      const rawPhone = String(body.rawPhone || '').trim();

      if (!spotId) {
        return NextResponse.json(
          { ok: false, error: 'Thiếu mã bài đăng cần xóa.' },
          { status: 400 }
        );
      }

      deleteSpotInServerStore({
        spotId,
        authorId,
        rawPhone,
      });

      await deleteSpotInSupabase(spotId).catch(() => false);

      return NextResponse.json({
        ok: true,
        spotId,
      });
    }

    if (action === 'BOOST_LIGHT') {
      const spotId = String(body.spotId || '');
      const delta = Number(body.delta || 20);
      const [dbRes, srvRes] = await Promise.all([
        boostSpotLightInSupabase(spotId, delta).catch(() => null),
        Promise.resolve(boostSpotInServerStore(spotId, delta)),
      ]);
      const result = dbRes || srvRes;
      return NextResponse.json({
        ok: true,
        spotId,
        lightPower: result?.lightPower ?? null,
        boostCount: result?.boostCount ?? null,
      });
    }

    if (action === 'ADD_SIGHTING') {
      const spotId = String(body.spotId || '');
      const srvSighting = addSightingInServerStore({
        spotId,
        reporterName: String(body.reporterName || '').trim(),
        imageUrl: String(body.imageUrl || ''),
        note: String(body.note || '').trim(),
        emotionTag: String(body.emotionTag || '').trim(),
        lat: Number(body.lat || 0),
        lng: Number(body.lng || 0),
        originLat: Number(body.originLat || 0),
        originLng: Number(body.originLng || 0),
      });

      const dbSighting = await addSpotSightingInSupabase({
        postId: spotId,
        reporterId: body.reporterId ? String(body.reporterId) : undefined,
        reporterName: String(body.reporterName || '').trim(),
        reporterPhone: body.reporterPhone
          ? String(body.reporterPhone)
          : undefined,
        imageUrl: String(body.imageUrl || ''),
        note: String(body.note || '').trim(),
        emotionTag: String(body.emotionTag || '').trim(),
        lat: Number(body.lat || 0),
        lng: Number(body.lng || 0),
        originLat: Number(body.originLat || 0),
        originLng: Number(body.originLng || 0),
      }).catch(() => null);

      return NextResponse.json({
        ok: true,
        sighting: dbSighting || srvSighting,
      });
    }

    if (action === 'UNLOCK_CONTACT') {
      const spotId = String(body.spotId || '');
      const reqType =
        body.requestType === 'ADOPT_REQUEST' ||
        body.requestType === 'FOSTER_OFFER'
          ? body.requestType
          : 'SIGHTING_REPORT';

      const srvUnlocked = unlockContactInServerStore({
        spotId,
        requesterId: String(body.requesterId || ''),
        requesterName: String(body.requesterName || '').trim(),
        requestType: reqType,
        message: String(body.message || '').trim(),
        proofImageUrl: body.proofImageUrl
          ? String(body.proofImageUrl)
          : undefined,
      });

      const dbUnlocked = await unlockSpotContactInSupabase({
        postId: spotId,
        requesterId: String(body.requesterId || ''),
        requesterName: String(body.requesterName || '').trim(),
        requesterPhone: String(body.requesterPhone || '').trim(),
        requestType: reqType,
        message: String(body.message || '').trim(),
        proofImageUrl: body.proofImageUrl
          ? String(body.proofImageUrl)
          : undefined,
      }).catch(() => null);

      const rawPhone = dbUnlocked?.rawPhone || srvUnlocked.rawPhone || '';
      const maskedPhone =
        dbUnlocked?.maskedPhone || srvUnlocked.maskedPhone || '';
      const zaloLink = dbUnlocked?.zaloLink || srvUnlocked.zaloLink || '';

      return NextResponse.json({
        ok: true,
        rawPhone,
        maskedPhone,
        zaloLink,
      });
    }

    if (action === 'RESOLVE_PEACE') {
      const spotId = String(body.spotId || '');
      const srvOk = resolveSpotToPeaceInServerStore(spotId);
      const dbOk = await resolveSpotToPeaceInSupabase(spotId).catch(
        () => false
      );
      return NextResponse.json({
        ok: dbOk || srvOk,
        spotId,
      });
    }

    if (action === 'EMERGENCY_BOOST') {
      const spotId = String(body.spotId || '');
      const srvOk = activateEmergencyBoostInServerStore(spotId);
      const dbOk = await activateEmergencyBoostInSupabase(spotId).catch(
        () => false
      );
      return NextResponse.json({
        ok: dbOk || srvOk,
        spotId,
      });
    }

    if (action === 'ADD_MEMORY_SNAP') {
      const srvSnap = createMemorySnapInServerStore({
        postId: body.postId ? String(body.postId) : undefined,
        petName: String(body.petName || '').trim(),
        weekNumber: Number(body.weekNumber || 1),
        imageUrl: String(body.imageUrl || ''),
        caption: String(body.caption || '').trim(),
        moodTag: String(body.moodTag || '').trim(),
        weightKg: body.weightKg ? Number(body.weightKg) : undefined,
        rescuerName: body.authorName ? String(body.authorName) : undefined,
        lat: body.lat ? Number(body.lat) : undefined,
        lng: body.lng ? Number(body.lng) : undefined,
      });

      const dbSnap = await createMemorySnapInSupabase({
        postId: body.postId ? String(body.postId) : undefined,
        authorId: body.authorId ? String(body.authorId) : undefined,
        authorName: body.authorName ? String(body.authorName) : undefined,
        authorPhone: body.authorPhone ? String(body.authorPhone) : undefined,
        petName: String(body.petName || '').trim(),
        weekNumber: Number(body.weekNumber || 1),
        imageUrl: String(body.imageUrl || ''),
        caption: String(body.caption || '').trim(),
        moodTag: String(body.moodTag || '').trim(),
        weightKg: body.weightKg ? Number(body.weightKg) : undefined,
        lat: body.lat ? Number(body.lat) : undefined,
        lng: body.lng ? Number(body.lng) : undefined,
      }).catch(() => null);

      return NextResponse.json({
        ok: true,
        snap: dbSnap || srvSnap,
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
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const spotId = String(
      body.spotId || searchParams.get('spotId') || ''
    ).trim();
    const authorId = String(
      body.authorId || searchParams.get('authorId') || ''
    ).trim();
    const rawPhone = String(
      body.rawPhone || searchParams.get('rawPhone') || ''
    ).trim();

    if (!spotId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu mã bài đăng cần xóa.' },
        { status: 400 }
      );
    }

    deleteSpotInServerStore({
      spotId,
      authorId,
      rawPhone,
    });
    await deleteSpotInSupabase(spotId).catch(() => false);

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
