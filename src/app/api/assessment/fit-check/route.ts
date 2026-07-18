import { after, NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import {
  ASSESSMENT_SCORING_VARIANTS,
  assignFitCheckScoringVariant,
  resolveAssessmentScoringExperiment,
} from '@/lib/assessment-experiments';
import { getDB } from '@/lib/db';
import { getClientIp, getRequestLocale, resolveRequestUserId } from '@/lib/request-user';
import {
  AssessmentValidationError,
  ROLE_ORDER,
  getLocaleValue,
  isActiveRoleId,
  scoreAssessment,
  type AssessmentProfile,
  type RoleId,
} from '@/lib/product';
import { getRateLimiter } from '@/lib/rate-limiter';
import { getEmailService } from '@/lib/email-service';
import { logger } from '@/lib/logger';

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
    educationStream: z.enum([
      'commerce',
      'management',
      'arts-humanities',
      'science',
      'healthcare',
      'law',
      'open',
    ]).optional(),
    // Objective checks must be created and verified server-side; the public
    // assessment endpoint deliberately cannot accept self-awarded scores.
    locale: z.enum(['en', 'hi']).optional(),
  }).strict(),
});

const selectedRoleSchema = z.object({
  roleId: z.enum(ROLE_ORDER as [RoleId, ...RoleId[]]),
});

function buildPersistedAssessmentResult(
  assessment: {
    responses: Record<string, string>;
    profile: AssessmentProfile;
    selectedRole?: RoleId;
    scoringVariant?: string | null;
    resultSnapshot?: ReturnType<typeof scoreAssessment>;
  },
  locale: 'en' | 'hi'
) {
  if (
    assessment.resultSnapshot?.topRoles.some((role) => !isActiveRoleId(role.roleId))
  ) {
    throw new AssessmentValidationError([
      'This assessment contains a retired role and must be retaken.',
    ]);
  }
  const result = assessment.resultSnapshot || scoreAssessment(
      assessment.responses,
      {
        ...assessment.profile,
        locale,
      },
      locale,
      // Re-score with the variant the row was originally scored under, so a
      // stored assessment never silently changes ranking on read.
      resolveAssessmentScoringExperiment(assessment.scoringVariant).scoringConfig
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

  let persisted: ReturnType<typeof buildPersistedAssessmentResult>;
  try {
    persisted = buildPersistedAssessmentResult(latest, locale);
  } catch (err) {
    if (err instanceof AssessmentValidationError) {
      return success({
        questionsAvailable: true,
        result: null,
        selectedRoleId: null,
        retakeRequired: true,
      });
    }
    throw err;
  }

  return success({
    questionsAvailable: true,
    retakeRequired: false,
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

    const clientIp = getClientIp(request);
    const limitCheck = await assessmentLimiter.check(`${userId}:${clientIp}`);
    if (limitCheck.limited) {
      const response = error(
        'Too many assessment submissions. Please wait a few minutes and try again.',
        429
      );
      response.headers.set('Retry-After', Math.ceil(limitCheck.resetTime / 1000).toString());
      return response;
    }

    // Server-authoritative experiment assignment: deterministic per user,
    // gated by the FIT_CHECK_SCORING_ROLLOUT env (default 0% = all control).
    // The client cannot influence which scoring config is used.
    const scoringVariant = assignFitCheckScoringVariant(userId);
    const scoringConfig = ASSESSMENT_SCORING_VARIANTS[scoringVariant];

    const db = getDB();
    const { result: hydrated } = await db.saveAssessment(userId, body.responses, baseProfile, {
      scoringVariant,
      scoringConfig,
    });

    if (hydrated.topRoles[0]) {
      await db.seedReminders(userId, locale, hydrated.topRoles[0].roleId);

      const topRole = hydrated.topRoles[0];
      try {
        after(async () => {
          try {
            const user = await getDB().getUser(userId);
            if (!user) return;

            const emailService = getEmailService();
            const email = await emailService.generateAssessmentEmail(
              user.name,
              user.email,
              getLocaleValue(topRole.role.name, locale),
              getLocaleValue(topRole.strengthLabel, locale)
            );
            await emailService.send(email);
          } catch (emailError) {
            logger.error('Assessment result email failed', {
              userId,
              roleId: topRole.roleId,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
            });
          }
        });
      } catch (afterError) {
        logger.warn('Deferred assessment email could not be scheduled', {
          userId,
          roleId: topRole.roleId,
          error: afterError instanceof Error ? afterError.message : 'Unknown error',
        });
      }
    }

    return success({
      result: hydrated,
      selectedRoleId: hydrated.topRoles[0]?.roleId || null,
      // Echoed so the client can emit a PostHog exposure event for attribution.
      scoringVariant,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid assessment payload', 400);
    }
    if (err instanceof AssessmentValidationError) {
      return error(err.message, 400);
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
