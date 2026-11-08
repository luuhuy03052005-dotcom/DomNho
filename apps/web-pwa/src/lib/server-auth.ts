import { NextRequest, NextResponse } from 'next/server';
import {
  findAccountBySessionTokenInMongo,
  isMongoEnabled,
} from '@/lib/mongodb';
import {
  ServerAccountRecord,
  findAccountBySessionTokenInServerStore,
} from '@/lib/server-community-store';
import { UserSession } from '@/lib/types';

export const AUTH_SESSION_COOKIE = 'dom_nho_session_v1';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function resolveAuthenticatedAccount(
  request: NextRequest
): Promise<ServerAccountRecord | null> {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value || '';
  if (!token || token.length < 32) return null;

  if (isMongoEnabled()) {
    try {
      const mongoAccount = await findAccountBySessionTokenInMongo(token);
      if (mongoAccount) return mongoAccount;
    } catch {
      // Local development can continue through its durable file store.
    }
  }

  return findAccountBySessionTokenInServerStore(token);
}

export function accountToUserSession(
  account: ServerAccountRecord
): UserSession {
  return {
    id: account.id,
    displayName: account.displayName,
    maskedPhone: account.maskedPhone,
    coupleRoomCode: account.coupleRoomCode,
    partnerName: account.partnerName,
    patrolModeActive: account.patrolModeActive,
    dailyPostCount: account.dailyPostCount,
    lastPostDate: account.lastPostDate,
    isShadowbanned: account.isShadowbanned,
    createdAt: account.createdAt,
  };
}

export function attachAuthSessionCookie(
  response: NextResponse,
  sessionToken: string
): NextResponse {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearAuthSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(process.env.VERCEL),
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function unauthorizedResponse(message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.') {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

export function rejectUntrustedOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const allowedHosts = new Set(
      [request.nextUrl.host, forwardedHost].filter(Boolean).map((host) => host!.toLowerCase())
    );
    if (allowedHosts.has(originHost)) return null;
  } catch {
    // Invalid Origin is rejected below.
  }
  return NextResponse.json(
    { ok: false, error: 'Nguồn yêu cầu không hợp lệ.' },
    { status: 403 }
  );
}

export function productionRequiresMongo(): boolean {
  return Boolean(process.env.VERCEL) && !isMongoEnabled();
}
