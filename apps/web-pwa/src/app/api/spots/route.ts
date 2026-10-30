import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_DOM_SPOTS } from '@/lib/seed-data';
import {
  calculateDistanceMeters,
  fuzzCoordinates,
  maskPhoneNumber,
} from '@/lib/security';
import { DomSpot } from '@/lib/types';

/**
 * API Endpoint: /api/spots
 * - GET: Truy vấn các Đốm sáng trong bán kính (mặc định 5000m) với tọa độ đã làm mờ ±200m
 * - POST: Tạo Đốm sáng mới (Áp dụng Coordinate Fuzzing + Contact Masking tự động)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '10.7935');
  const lng = parseFloat(searchParams.get('lng') || '106.7045');
  const radius = parseFloat(searchParams.get('radius') || '5000');

  const nearby = INITIAL_DOM_SPOTS.map((spot) => ({
    ...spot,
    rawPhoneSecret: undefined, // Không bao giờ trả số thật qua API công khai
    distanceMeters: calculateDistanceMeters(
      lat,
      lng,
      spot.publicLat,
      spot.publicLng
    ),
  })).filter((spot) => spot.distanceMeters <= radius);

  return NextResponse.json({
    ok: true,
    count: nearby.length,
    spots: nearby,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const exactLat = Number(body.lat || 10.7935);
    const exactLng = Number(body.lng || 106.7045);
    const fuzzed = fuzzCoordinates(exactLat, exactLng);

    const createdSpot: DomSpot = {
      id: `dom-${Date.now().toString(36)}`,
      authorId: body.authorId || 'usr_guest',
      authorName: body.authorName || 'Người Bạn Đốm Nhỏ',
      spotType: body.spotType || 'ORANGE_SIGHT',
      status: 'ACTIVE',
      visibility: body.visibility || 'PUBLIC',
      title: body.title || 'Tín hiệu đốm sáng mới',
      story: body.story || '',
      species: body.species || 'cat',
      breed: body.breed || 'Mèo ta',
      coatColor: body.coatColor || 'Vàng ấm',
      traits: Array.isArray(body.traits) ? body.traits : ['Thân thiện'],
      images: Array.isArray(body.images) ? body.images : [],
      publicLat: fuzzed.publicLat,
      publicLng: fuzzed.publicLng,
      fuzzRadiusMeters: fuzzed.fuzzRadiusMeters,
      areaLabel: body.areaLabel || 'TP. Hồ Chí Minh',
      lightPower: 100,
      boostCount: 1,
      allowFoster: Boolean(body.allowFoster),
      maskedPhone: maskPhoneNumber(body.rawPhone || '0908123456'),
      sourceType: 'USER_POST',
      hoursAgo: 0,
      createdAt: new Date().toISOString(),
      sightings: [],
    };

    return NextResponse.json({
      ok: true,
      spot: createdSpot,
      securityNote: 'Coordinate fuzzed ±200m and phone number masked.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Invalid request' },
      { status: 400 }
    );
  }
}

