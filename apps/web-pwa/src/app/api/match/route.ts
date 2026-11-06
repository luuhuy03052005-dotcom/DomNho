import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_DOM_SPOTS } from '@/lib/seed-data';
import { findDoubleMatchesWithin3Km } from '@/lib/security';
import {
  fetchCommunitySpotsFromMongo,
  listDeletedSpotIdsFromMongo,
} from '@/lib/mongodb';
import {
  listCommunitySpotsFromServerStore,
  listDeletedSpotIdsFromServerStore,
} from '@/lib/server-community-store';
import { DomSpot, isSpotDeletedOrHidden } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/match
 * Quét thuật toán Khớp Lệnh Kép (Double-Match) trong bán kính 3.000m (3km)
 * đối chiếu với toàn bộ bài đăng thực tế từ MongoDB Atlas, kho lưu trữ cộng đồng và dữ liệu xác thực.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const targetLat = Number(body.publicLat ?? body.lat ?? 0);
    const targetLng = Number(body.publicLng ?? body.lng ?? 0);

    const [mongoDeleted, mongoSpots] = await Promise.all([
      listDeletedSpotIdsFromMongo().catch(() => [] as string[]),
      fetchCommunitySpotsFromMongo().catch(() => [] as DomSpot[]),
    ]);
    const deletedIds = new Set<string>([
      ...mongoDeleted,
      ...listDeletedSpotIdsFromServerStore(),
    ]);
    const serverSpots = listCommunitySpotsFromServerStore();
    const seenIds = new Set<string>();
    const pool: DomSpot[] = [];
    for (const sp of [...mongoSpots, ...serverSpots, ...INITIAL_DOM_SPOTS]) {
      if (!sp?.id || seenIds.has(sp.id)) continue;
      if (isSpotDeletedOrHidden(sp, deletedIds)) continue;
      seenIds.add(sp.id);
      pool.push(sp);
    }

    const targetSpot: DomSpot = {
      id: String(body.id || ''),
      authorId: String(body.authorId || ''),
      authorName: String(body.authorName || ''),
      spotType: body.spotType === 'RED_SOS' ? 'RED_SOS' : 'ORANGE_SIGHT',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      title: String(body.title || ''),
      story: String(body.story || ''),
      species:
        body.species === 'dog' || body.species === 'other'
          ? body.species
          : 'cat',
      breed: String(body.breed || ''),
      coatColor: String(body.coatColor || ''),
      traits: Array.isArray(body.traits) ? body.traits.map(String) : [],
      images: Array.isArray(body.images) ? body.images.map(String) : [],
      publicLat: targetLat,
      publicLng: targetLng,
      fuzzRadiusMeters: 200,
      areaLabel: String(body.areaLabel || ''),
      lightPower: 100,
      boostCount: 1,
      allowFoster: false,
      maskedPhone: String(body.maskedPhone || 'Chưa cung cấp SĐT'),
      sourceType: 'USER_POST',
      hoursAgo: 0,
      createdAt: new Date().toISOString(),
      sightings: [],
    };

    const matches = findDoubleMatchesWithin3Km(targetSpot, pool);

    return NextResponse.json({
      ok: true,
      radiusMeters: 3000,
      matchCount: matches.length,
      matches,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Không thể đối chiếu dữ liệu khớp lệnh.',
      },
      { status: 400 }
    );
  }
}
