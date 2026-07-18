import type { NextRequest } from 'next/server';
import type { Locale } from '@/lib/product';
import { resolveAuthenticatedUser } from '@/lib/server-auth';

export async function resolveRequestUser(request: NextRequest) {
  return resolveAuthenticatedUser(request);
}

export async function resolveRequestUserId(request: NextRequest) {
  const user = await resolveRequestUser(request);
  return user?.id || null;
}

export function getRequestLocale(request: NextRequest): Locale {
  const locale =
    request.headers.get('x-user-locale') ||
    request.nextUrl.searchParams.get('locale') ||
    'en';
  return locale === 'hi' ? 'hi' : 'en';
}

/**
 * Extract the client IP from a NextRequest.
 *
 * Takes the FIRST entry of x-forwarded-for (comma-separated proxy chain),
 * trimmed; falls back to x-real-ip; then to the literal 'unknown'.
 *
 * This is intentionally stricter than the previous copy-pasted call sites
 * that used the whole x-forwarded-for header — using only the first IP
 * prevents rate-limit key collisions when multiple proxies append entries.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  return 'unknown';
}
