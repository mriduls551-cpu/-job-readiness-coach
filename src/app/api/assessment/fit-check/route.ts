import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { OpenRouterService } from '@/lib/openrouter';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';
import { scoreAssessment, type AssessmentProfile, type RoleId } from '@/lib/product';
import { getRateLimiter } from '@/lib/rate-limiter';

const assessmentLimiter = getRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 12,
});

const schema = z.object({
  // Cap both the number of answers and each answer's length so a bloated
  // payload can't be serialized into an LLM prompt.
  responses: z
    .record(z.string().max(500))
    .refine((obj) => Object.keys(obj).length <= 50, {
      message: 'Too many assessment responses',
    }),
  profile: z.object({
    fullName: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    degreeName: z.string().max(160).optional(),
    locale: z.enum(['en', 'hi']).optional(),
  }),
});

const selectedRoleSchema = z.object({
  roleId: z.string().min(1),
});

function buildPersistedAssessmentResult(
  assessment: {
    responses: Record<string, string>;
    profile: AssessmentProfile;
    selectedRole?: RoleId;
  },
  locale: 'en' | 'hi'
) {
  const result = scoreAssessment(
    assessment.responses,
    {
      ...assessment.profile,
      locale,
    },
    locale
  );

  return {
    result,
    selectedRoleId: assessment.selectedRole || result.topRoles[0]?.roleId || null,
  };
}

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return error('Authentication required', 401);
  }

  const locale = getRequestLocale(request);
  const latest = await getDB().getLatestAssessment(userId);

  if (!latest) {
    return success({
      questionsAvailable: true,
      result: null,
      selectedRoleId: null,
    });
  }

  const persisted = buildPersistedAssessmentResult(latest, locale);

  return success({
    questionsAvailable: true,
    ...persisted,
  });
}

export async function POST(request: NextRequest) {
  try {
    const locale = getRequestLocale(request);
    const body = schema.parse(await request.json());
    const baseProfile = {
      ...body.profile,
      locale,
    };
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Authentication required', 401);
    }

    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const limitCheck = await assessmentLimiter.check(`${userId}:${clientIp}`);
    if (limitCheck.limited) {
      const response = error(
        'Too many assessment submissions. Please wait a few minutes and try again.',
        429
      );
      response.headers.set('Retry-After', Math.ceil(limitCheck.resetTime / 1000).toString());
      return response;
    }

    const db = getDB();
    const { result } = await db.saveAssessment(userId, body.responses, baseProfile);
    const aiRationales = await OpenRouterService.generateRoleExplanations(
      result.topRoles,
      result.profile,
      locale
    );

    const hydrated = {
      ...result,
      topRoles: result.topRoles.map((match) => ({
        ...match,
        rationale:
          aiRationales.find((item) => item.roleId === match.roleId)?.rationale ||
          match.rationale,
      })),
    };

    if (hydrated.topRoles[0]) {
      await db.seedReminders(userId, locale, hydrated.topRoles[0].roleId);
    }

    return success({
      result: hydrated,
      selectedRoleId: hydrated.topRoles[0]?.roleId || null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid assessment payload', 400);
    }
    return error('Unable to score assessment right now', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Authentication required', 401);
    }

    const locale = getRequestLocale(request);
    const body = selectedRoleSchema.parse(await request.json());
    const assessment = await getDB().saveSelectedRole(userId, body.roleId as RoleId);

    if (!assessment) {
      return error('No saved assessment found', 404);
    }

    await getDB().seedReminders(userId, locale, body.roleId as RoleId);

    const persisted = buildPersistedAssessmentResult(assessment, locale);

    return success({
      ...persisted,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid role selection', 400);
    }

    return error('Unable to save selected role right now', 500);
  }
}
