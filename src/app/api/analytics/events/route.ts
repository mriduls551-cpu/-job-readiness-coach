import { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, success } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';

const schema = z.object({
  eventName: z.string().min(1).max(100),
  properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Authentication required', 401);
    }

    const body = schema.parse(await request.json());
    const locale = body.properties.locale === 'hi' ? 'hi' : getRequestLocale(request);
    const event = await getDB().saveFunnelEvent(userId, body.eventName, body.properties, locale);

    if (!event) {
      return error('Unable to save event', 500);
    }

    return success({ event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid event payload', 400);
    }

    return error('Unable to save analytics event right now', 500);
  }
}
