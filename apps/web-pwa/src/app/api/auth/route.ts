import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrRegisterInServerStore } from '@/lib/server-community-store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record = authenticateOrRegisterInServerStore({
      id: body.id ? String(body.id) : undefined,
      displayName: body.displayName ? String(body.displayName) : undefined,
      rawPhone: String(body.rawPhone || ''),
      pinCode: String(body.pinCode || ''),
      mode: body.mode === 'login' ? 'login' : 'register',
    });

    return NextResponse.json({
      ok: true,
      account: {
        id: record.id,
        displayName: record.displayName,
        rawPhone: record.rawPhone,
        maskedPhone: record.maskedPhone,
        deviceSecretToken: record.deviceSecretToken,
        coupleRoomCode: record.coupleRoomCode,
        partnerName: record.partnerName,
        patrolModeActive: record.patrolModeActive,
        dailyPostCount: record.dailyPostCount,
        lastPostDate: record.lastPostDate,
        isShadowbanned: record.isShadowbanned,
        createdAt: record.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Không thể xác thực tài khoản lúc này.',
      },
      { status: 400 }
    );
  }
}

