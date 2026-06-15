import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return error('Missing user id', 401);
  }

  const locale = getRequestLocale(request);
  const snapshot = await getDB().getDashboardSnapshot(userId, locale);
  return success({ snapshot });
}
