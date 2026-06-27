import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUserId } from '@/lib/request-user';
import { isActiveRoleId, type RoleId } from '@/lib/product';

const activeRoleSchema = z
  .string()
  .refine(isActiveRoleId, 'Role is not active')
  .transform((value) => value as RoleId);

const createPlanSchema = z.object({
  roleId: activeRoleSchema,
  profile: z.object({
    locale: z.enum(['en', 'hi']).optional(),
    city: z.string().optional(),
    degreeName: z.string().optional(),
  }),
});

const updateTaskSchema = z.object({
  planId: z.string(),
  taskId: z.string(),
  completed: z.boolean(),
});

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return error('Missing user id', 401);
  }

  const plan = await getDB().getUserPlan(userId);
  if (!plan) {
    return error('No plan found', 404);
  }

  return success({ plan });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const locale = getRequestLocale(request);
    const body = createPlanSchema.parse(await request.json());
    const plan = await getDB().getOrCreatePlan(userId, body.roleId, {
      locale,
      ...body.profile,
    });
    await getDB().seedReminders(userId, locale, body.roleId);
    return success({ plan }, 'Plan ready', 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid plan payload', 400);
    }
    return error('Could not prepare plan', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const body = updateTaskSchema.parse(await request.json());
    const plan = await getDB().updateTask(
      userId,
      body.planId,
      body.taskId,
      body.completed
    );
    return success({ plan });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid task payload', 400);
    }
    return error('Could not update task', 500);
  }
}
