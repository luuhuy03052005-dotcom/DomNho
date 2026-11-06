import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateOrRegisterInServerStore,
  computeServerPinHash,
} from '@/lib/server-community-store';
import { supabase } from '@/lib/supabase';
import { isValidVietnamesePhone, normalizePhoneDigits } from '@/lib/types';

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

    const normalizedPhone = normalizePhoneDigits(rawPhone);
    const pinHash = computeServerPinHash(normalizedPhone, pinCode);
    const accountDeviceToken = `dom_phone_${normalizedPhone}`;

    let remoteId: string | undefined = body.id ? String(body.id) : undefined;
    let remoteDisplayName: string | undefined = body.displayName
      ? String(body.displayName)
      : undefined;
    let verifiedRemoteExisting = false;

    if (supabase) {
      try {
        const { data: existingRemote, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('device_secret_token', accountDeviceToken)
          .maybeSingle();

        if (!fetchError && existingRemote) {
          if (mode === 'register' && !allowSyncExisting) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  'Số điện thoại này đã được đăng ký tài khoản. Vui lòng chuyển sang tab "Đăng nhập" và nhập mã PIN của bạn.',
              },
              { status: 400 }
            );
          }

          if (existingRemote.pin_hash !== pinHash) {
            return NextResponse.json(
              {
                ok: false,
                error:
                  'Số điện thoại này đã có tài khoản nhưng mã PIN không chính xác.',
              },
              { status: 400 }
            );
          }

          remoteId = String(existingRemote.id);
          remoteDisplayName =
            String(existingRemote.display_name || '').trim() ||
            remoteDisplayName;
          verifiedRemoteExisting = true;
        }
      } catch {
        // Fallback to server store check if Supabase network is unavailable
      }
    }

    const record = authenticateOrRegisterInServerStore({
      id: remoteId,
      displayName: remoteDisplayName,
      rawPhone,
      pinCode,
      mode: verifiedRemoteExisting ? 'register' : mode,
      allowSyncExisting: allowSyncExisting || verifiedRemoteExisting,
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

