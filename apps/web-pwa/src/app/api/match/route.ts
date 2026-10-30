import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_DOM_SPOTS } from '@/lib/seed-data';
import { findDoubleMatchesWithin3Km } from '@/lib/security';
import { DomSpot } from '@/lib/types';

/**
 * API Endpoint: /api/match
 * Chạy Thuật Toán Khớp Lệnh Kép (Double-Match Algorithm) trong bán kính 3km
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const candidateSpot: DomSpot = body.spot;
    const pool: DomSpot[] = Array.isArray(body.existingSpots)
      ? body.existingSpots
      : INITIAL_DOM_SPOTS;

    const matches = findDoubleMatchesWithin3Km(candidateSpot, pool);
    return NextResponse.json({
      ok: true,
      matchCount: matches.length,
      matches,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Match error' },
      { status: 400 }
    );
  }
}

