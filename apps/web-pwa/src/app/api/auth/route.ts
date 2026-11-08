import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateOrRegisterInMongo,
  isMongoEnabled,
  updateAccountPreferencesInMongo,
} from '@/lib/mongodb';
import {
  authenticateOrRegisterInServerStore,
  updateAccountPreferencesInServerStore,
} from '@/lib/server-community-store';
import {
  accountToUserSession,
  attachAuthSessionCookie,
  clearAuthSessionCookie,
  productionRequiresMongo,
  rejectUntrustedOrigin,
  resolveAuthenticatedAccount,
  unauthorizedResponse,
} from '@/lib/server-auth';
import { isValidVietnamesePhone, normalizePhoneDigits } from '@/lib/types';

export const dynamic = 'force-dynamic';

type AuthAttempt = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __domNhoAuthAttempts: Map<string, AuthAttempt> | undefined;
}

const authAttempts =
  globalThis.__domNhoAuthAttempts || new Map<string, AuthAttempt>();
globalThis.__domNhoAuthAttempts = authAttempts;

function attemptKey(request: NextRequest, rawPhone: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `${forwarded || 'local'}:${normalizePhoneDigits(rawPhone)}`;
}

function isRateLimited(key: string): boolean {
  const attempt = authAttempts.get(key);
  if (!attempt) return false;
  if (Date.now() >= attempt.resetAt) {
    authAttempts.delete(key);
    return false;
  }
  return attempt.count >= 5;
}

function recordFailedAttempt(key: string): void {
  const current = authAttempts.get(key);
  const now = Date.now();
  if (!current || now >= current.resetAt) {
    authAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return;
  }
  current.count += 1;
}

function isAccountValidationError(message: string): boolean {
  return [
    'đã được đăng ký',
    'chưa được đăng ký',
    'mã PIN không chính xác',
    'Tên gọi',
    'Số điện thoại',
  ].some((part) => message.includes(part));
}

export async function POST(request: NextRequest) {
  try {
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const body = await request.json();
    const rawPhone = String(body.rawPhone || '').trim();
    const pinCode = String(body.pinCode || '').trim();
    const displayName = body.displayName ? String(body.displayName).trim() : '';
    const mode: 'login' | 'register' =
      body.mode === 'login' ? 'login' : 'register';

    if (!isValidVietnamesePhone(rawPhone)) {
      return NextResponse.json(
        { ok: false, error: 'Số điện thoại Việt Nam không hợp lệ.' },
        { status: 400 }
      );
    }
    if (!/^\d{4,6}$/.test(pinCode)) {
      return NextResponse.json(
        { ok: false, error: 'Mã PIN bảo mật phải gồm từ 4 đến 6 chữ số.' },
        { status: 400 }
      );
    }
    if (mode === 'register' && displayName.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Tên gọi phải có tối thiểu 2 ký tự.' },
        { status: 400 }
      );
    }
    if (productionRequiresMongo()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Kho tài khoản bền vững chưa được cấu hình trên production.',
        },
        { status: 503 }
      );
    }

    const rateKey = attemptKey(request, rawPhone);
    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { ok: false, error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
        { status: 429 }
      );
    }

    let record;
    try {
      if (isMongoEnabled()) {
        record = await authenticateOrRegisterInMongo({
          displayName,
          rawPhone,
          pinCode,
          mode,
          allowSyncExisting: false,
        });
        if (!process.env.VERCEL) {
          authenticateOrRegisterInServerStore({
            id: record.id,
            displayName: record.displayName,
            rawPhone: record.rawPhone,
            pinCode,
            mode: 'register',
            allowSyncExisting: true,
            sessionToken: record.deviceSecretToken,
          });
        }
      } else {
        record = authenticateOrRegisterInServerStore({
          displayName,
          rawPhone,
          pinCode,
          mode,
          allowSyncExisting: false,
        });
      }
    } catch (error) {
      const message = String((error as Error)?.message || '');
      if (isAccountValidationError(message)) {
        recordFailedAttempt(rateKey);
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
      }
      if (process.env.VERCEL) throw error;
      record = authenticateOrRegisterInServerStore({
        displayName,
        rawPhone,
        pinCode,
        mode,
        allowSyncExisting: false,
      });
    }

    authAttempts.delete(rateKey);
    const response = NextResponse.json({
      ok: true,
      account: accountToUserSession(record),
    });
    return attachAuthSessionCookie(response, record.deviceSecretToken);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          (error as Error)?.message || 'Không thể xác thực tài khoản lúc này.',
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const account = await resolveAuthenticatedAccount(request);
  return NextResponse.json({
    ok: true,
    account: account ? accountToUserSession(account) : null,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const account = await resolveAuthenticatedAccount(request);
    if (!account) return unauthorizedResponse();
    const body = await request.json();
    const changes = {
      accountId: account.id,
      patrolModeActive:
        typeof body.patrolModeActive === 'boolean'
          ? body.patrolModeActive
          : undefined,
      partnerName:
        typeof body.partnerName === 'string' ? body.partnerName : undefined,
    };

    let updated = account;
    if (isMongoEnabled() && process.env.VERCEL) {
      await updateAccountPreferencesInMongo({
        userId: account.id,
        patrolModeActive: changes.patrolModeActive,
        partnerName: changes.partnerName,
      });
      updated = {
        ...account,
        ...(typeof changes.patrolModeActive === 'boolean'
          ? { patrolModeActive: changes.patrolModeActive }
          : {}),
        ...(typeof changes.partnerName === 'string'
          ? { partnerName: changes.partnerName.trim().slice(0, 80) }
          : {}),
      };
    } else {
      updated = updateAccountPreferencesInServerStore(changes) || account;
    }
    if (isMongoEnabled() && !process.env.VERCEL) {
      try {
        await updateAccountPreferencesInMongo({
          userId: account.id,
          patrolModeActive: changes.patrolModeActive,
          partnerName: changes.partnerName,
        });
      } catch (error) {
        if (process.env.VERCEL) throw error;
      }
    }
    return NextResponse.json({
      ok: true,
      account: accountToUserSession(updated),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message || 'Không thể cập nhật tài khoản.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) return originError;
  return clearAuthSessionCookie(NextResponse.json({ ok: true }));
}
