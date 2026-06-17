import { NextRequest } from 'next/server';
import { z } from 'zod';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { generateCoachFallbackReply, ROLE_DEFINITIONS } from '@/lib/product';
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

    // No API key — return static fallback as plain text
    if (!process.env.OPENROUTER_API_KEY) {
      const fallback = generateCoachFallbackReply(body.message, locale, body.roleId);
      return new Response(fallback, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const db = getDB();
    const history = await db.getConversation(userId);

    await db.appendConversation(userId, {
      agentType: 'coach',
      role: 'user',
      content: body.message,
      locale,
    });

    const role = body.roleId ? ROLE_DEFINITIONS[body.roleId] : null;

    const openrouter = createOpenAI({
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Job Readiness Coach',
      },
    });

    const model = process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini';

    const result = streamText({
      model: openrouter(model),
      maxOutputTokens: 600,
      temperature: 0.5,
      system:
        locale === 'en'
          ? 'You are Job Readiness Coach, a practical and supportive AI coach for entry-level white-collar job seekers in India. Keep replies short, helpful, and realistic. Do not fabricate job openings or legal advice.'
          : 'आप भारत में शुरुआती कार्यालयी नौकरी खोजने वाले युवाओं के लिए सहायक करियर मार्गदर्शक हैं। उत्तर छोटे, उपयोगी और वास्तविक हिंदी में रखें।',
      messages: [
        ...(body.profile || role
          ? [
              {
                role: 'system' as const,
                content: JSON.stringify({
                  locale,
                  profile: body.profile ? { locale, ...body.profile } : undefined,
                  selectedRole: role?.name[locale],
                }),
              },
            ]
          : []),
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: body.message },
      ],
      onFinish: async ({ text }) => {
        await db.appendConversation(userId, {
          agentType: 'coach',
          role: 'assistant',
          content: text,
          locale,
        });
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid coach message', 400);
    }
    return error('Coach reply failed', 500);
  }
}
