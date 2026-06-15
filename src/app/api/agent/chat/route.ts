import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { OpenRouterService } from '@/lib/openrouter';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';
import type { RoleId } from '@/lib/product';
import { getRateLimiter } from '@/lib/rate-limiter';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  roleId: z.custom<RoleId>().optional(),
  profile: z
    .object({
      locale: z.enum(['en', 'hi']).optional(),
      fullName: z.string().max(120).optional(),
      city: z.string().max(120).optional(),
      degreeName: z.string().max(160).optional(),
      speakingConfidence: z.string().max(60).optional(),
      numbersConfidence: z.string().max(60).optional(),
      dataConfidence: z.string().max(60).optional(),
      workStylePreference: z.string().max(60).optional(),
      biggestProblem: z.string().max(400).optional(),
      weeklyAvailability: z.string().max(60).optional(),
    })
    .optional(),
});

const chatLimiter = getRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
});

export async function POST(request: NextRequest) {
  try {
    const locale = getRequestLocale(request);
    const body = chatSchema.parse(await request.json());
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Authentication required', 401);
    }

    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const limitCheck = await chatLimiter.check(`${userId}:${clientIp}`);
    if (limitCheck.limited) {
      const response = error(
        'Too many coach messages right now. Please wait a moment and try again.',
        429
      );
      response.headers.set('Retry-After', Math.ceil(limitCheck.resetTime / 1000).toString());
      return response;
    }

    const db = getDB();
    const history = await db.getConversation(userId);

    await db.appendConversation(userId, {
      agentType: 'coach',
      role: 'user',
      content: body.message,
      locale,
    });

    const reply = await OpenRouterService.chat(body.message, locale, {
      roleId: body.roleId,
      profile: body.profile
        ? {
            locale,
            ...body.profile,
          }
        : undefined,
      history: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    await db.appendConversation(userId, {
      agentType: 'coach',
      role: 'assistant',
      content: reply,
      locale,
    });

    return success({
      reply,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid coach message', 400);
    }
    return error('Coach reply failed', 500);
  }
}
