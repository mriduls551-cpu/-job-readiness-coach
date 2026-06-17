import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { resolveRequestUserId } from '@/lib/request-user';
import type { ResumeDraft, RoleId } from '@/lib/product';
import {
  isValidIndianPhoneNumberOrEmpty,
  normalizeIndianPhoneNumber,
} from '@/lib/phone';

const resumeSchema = z.object({
  title: z.string(),
  summary: z.string(),
  email: z.string(),
  phone: z
    .string()
    .refine(isValidIndianPhoneNumberOrEmpty, 'Enter a valid Indian phone number')
    .transform(normalizeIndianPhoneNumber),
  location: z.string(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string(),
      description: z.string(),
    })
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      field: z.string(),
      year: z.string(),
    })
  ),
  certifications: z.array(z.string()),
});

const initSchema = z.object({
  roleId: z.custom<RoleId>(),
  profile: z.object({
    fullName: z.string().optional(),
    city: z.string().optional(),
    degreeName: z.string().optional(),
    locale: z.enum(['en', 'hi']),
  }),
  user: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return error('Missing user id', 401);
  }

  const resume = await getDB().getUserResume(userId);
  return success({ resume });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const body = initSchema.parse(await request.json());
    const resume = await getDB().getOrCreateResume(
      userId,
      body.roleId,
      body.profile,
      body.user
    );
    return success({ resume }, 'Resume initialized', 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid resume init payload', 400);
    }
    return error('Could not initialize resume', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const body = resumeSchema.parse((await request.json()) as ResumeDraft);
    const resume = await getDB().updateResume(userId, body);
    return success({ resume });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid resume payload', 400);
    }
    return error('Could not save resume', 500);
  }
}
