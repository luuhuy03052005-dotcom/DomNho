import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateOrRegisterInMongo,
  updateAccountPreferencesInMongo,
} from '@/lib/mongodb';
import { authenticateOrRegisterInServerStore } from '@/lib/server-community-store';
import { isValidVietnamesePhone } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawPhone = String(body.rawPhone || '').trim();
    const pinCode = String(body.pinCode || '').trim();
    const mode: 'login' | 'register' =
      body.mode === 'login' ? 'login' : 'register';
    const allowSyncExisting = Boolean(body.allowSyncExisting);

    if (!isValidVietnamesePhone(rawPhone)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).',
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(pinCode)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.',
        },
        { status: 400 }
      );
    }

    const displayName = body.displayName ? String(body.displayName).trim() : '';

    let record;
    try {
      record = await authenticateOrRegisterInMongo({
        id: body.id ? String(body.id) : undefined,
        displayName,
        rawPhone,
        pinCode,
        mode,
        allowSyncExisting,
      });

      // Đồng bộ bản sao về bộ nhớ đệm Server Store
      try {
        authenticateOrRegisterInServerStore({
          id: record.id,
          displayName: record.displayName,
          rawPhone: record.rawPhone,
          pinCode,
          mode: 'register',
          allowSyncExisting: true,
        });
      } catch {
        // Bỏ qua nếu bộ nhớ đệm tạm thời không ghi được
      }
    } catch (mongoErr: any) {
      const errMsg = String(mongoErr?.message || '');
      if (
        errMsg.includes('đã được đăng ký') ||
        errMsg.includes('chưa được đăng ký') ||
        errMsg.includes('mã PIN không chính xác') ||
        errMsg.includes('Tên gọi') ||
        errMsg.includes('Số điện thoại')
      ) {
        return NextResponse.json(
          { ok: false, error: errMsg },
          { status: 400 }
        );
      }

      // Fallback sang Server Store nếu mạng kết nối tới MongoDB tạm thời gián đoạn
      record = authenticateOrRegisterInServerStore({
        id: body.id ? String(body.id) : undefined,
        displayName,
        rawPhone,
        pinCode,
        mode,
        allowSyncExisting,
      });
    }

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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ok = await updateAccountPreferencesInMongo({
      userId: body.userId ? String(body.userId) : undefined,
      rawPhone: body.rawPhone ? String(body.rawPhone) : undefined,
      patrolModeActive:
        typeof body.patrolModeActive === 'boolean'
          ? body.patrolModeActive
          : undefined,
      partnerName:
        typeof body.partnerName === 'string' ? body.partnerName : undefined,
      coupleRoomCode:
        typeof body.coupleRoomCode === 'string'
          ? body.coupleRoomCode
          : undefined,
    });
    return NextResponse.json({ ok });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Không thể cập nhật tài khoản.' },
      { status: 400 }
    );
  }
}
