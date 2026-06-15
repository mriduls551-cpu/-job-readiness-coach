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
