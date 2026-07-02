import { after, NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';
import {
  ASSESSMENT_SCORING_VARIANTS,
  assignFitCheckScoringVariant,
  resolveAssessmentScoringExperiment,
} from '@/lib/assessment-experiments';
import {
  ASSESSMENT_FEEDBACK_VALUES,
  AssessmentValidationError,
  ROLE_ORDER,
  getLocaleValue,
  isActiveRoleId,
  scoreAssessment,
  type AssessmentFeedback,
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
  // The client may pass the PostHog-resolved flag variant for attribution, but
  // the server still canonicalizes it to a known experiment config.
  scoringVariant: z.union([z.string(), z.boolean()]).optional(),
  scoringConfig: z.object({
    finalistWeight: z.number().positive().max(12),
    streamBoostFactor: z.number().min(1).max(1.25),
  }).strict().optional(),
}).strict();

const assessmentPatchSchema = z
  .object({
    roleId: z.enum(ROLE_ORDER as [RoleId, ...RoleId[]]).optional(),
    feedback: z.enum(ASSESSMENT_FEEDBACK_VALUES).optional(),
  })
  .refine((value) => Boolean(value.roleId || value.feedback), {
    message: 'Provide a role selection or feedback update',
  });

function buildPersistedAssessmentResult(
  assessment: {
    responses: Record<string, string>;
    profile: AssessmentProfile;
    selectedRole?: RoleId;
    feedback?: AssessmentFeedback | null;
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
      resolveAssessmentScoringExperiment(assessment.scoringVariant).scoringConfig
    );

  return {
    result,
    selectedRoleId: assessment.selectedRole || result.topRoles[0]?.roleId || null,
    feedback: assessment.feedback ?? null,
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
      feedback: null,
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
        feedback: null,
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

    const requestedExperiment =
      body.scoringVariant == null
        ? null
        : resolveAssessmentScoringExperiment(body.scoringVariant);
    const fallbackVariant = assignFitCheckScoringVariant(userId);
    const fallbackConfig = ASSESSMENT_SCORING_VARIANTS[fallbackVariant];
    const scoringVariant = requestedExperiment?.scoringVariant ?? fallbackVariant;
    const scoringConfig = requestedExperiment?.scoringConfig ?? fallbackConfig;

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
    const { result: hydrated } = await db.saveAssessment(userId, body.responses, baseProfile, {
      scoringVariant,
      scoringConfig,
    });

    if (hydrated.topRoles[0]) {
      await db.seedReminders(userId, locale, hydrated.topRoles[0].roleId);

      const topRole = hydrated.topRoles[0];
      const queueAssessmentEmail = async () => {
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
      };

      try {
        after(queueAssessmentEmail);
      } catch {
        void queueAssessmentEmail();
      }
    }

    return success({
      result: hydrated,
      selectedRoleId: hydrated.topRoles[0]?.roleId || null,
      feedback: null,
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
    const body = assessmentPatchSchema.parse(await request.json());
    const db = getDB();
    let assessment = body.roleId
      ? await db.saveSelectedRole(userId, body.roleId as RoleId)
      : await db.getLatestAssessment(userId);

    if (!assessment) {
      return error('No saved assessment found', 404);
    }

    if (body.feedback) {
      assessment = await db.recordFeedback(userId, body.feedback);
    }

    if (!assessment) {
      return error('No saved assessment found', 404);
    }

    if (body.roleId) {
      await db.seedReminders(userId, locale, body.roleId as RoleId);
    }

    const persisted = buildPersistedAssessmentResult(assessment, locale);

    return success({
      ...persisted,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid assessment update', 400);
    }

    return error('Unable to save assessment updates right now', 500);
  }
}
