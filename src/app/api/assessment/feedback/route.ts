import { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, success } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';

const schema = z.object({
  rating: z.enum(['helpful', 'unhelpful']),
  comment: z.string().max(500).trim().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Authentication required', 401);
    }

    const locale = getRequestLocale(request);
    const body = schema.parse(await request.json());
    const feedback = await getDB().saveAssessmentFeedback(
      userId,
      body.rating,
      body.comment,
      locale
    );

    if (!feedback) {
      return error('No completed assessment found', 404);
    }

    return success({
      feedback,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid feedback payload', 400);
    }

    return error('Unable to save assessment feedback right now', 500);
  }
}
