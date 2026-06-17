import { after, NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { resolveRequestUserId } from '@/lib/request-user';
import { getEmailService } from '@/lib/email-service';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  companyName: z.string().min(2),
  roleTitle: z.string().min(2),
  notes: z.string().optional().default(''),
});

const updateSchema = z.object({
  applicationId: z.string(),
  status: z.enum(['applied', 'interview', 'offered', 'rejected']),
});

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return error('Missing user id', 401);
  }

  const applications = await getDB().getUserApplications(userId);
  return success({ applications });
}

export async function POST(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const body = createSchema.parse(await request.json());
    const application = await getDB().createApplication(userId, {
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      notes: body.notes,
    });

    after(async () => {
      try {
        const user = await getDB().getUser(userId);
        if (!user) return;

        const emailService = getEmailService();
        const email = await emailService.generateApplicationEmail(
          user.name,
          user.email,
          application.companyName,
          application.roleTitle
        );
        await emailService.send(email);
      } catch (emailError) {
        logger.error('Application confirmation email failed', {
          userId,
          applicationId: application.id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    });

    return success({ application }, 'Application logged', 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid application payload', 400);
    }
    return error('Could not log application', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await resolveRequestUserId(request);
    if (!userId) {
      return error('Missing user id', 401);
    }

    const body = updateSchema.parse(await request.json());
    const application = await getDB().updateApplicationStatus(
      userId,
      body.applicationId,
      body.status
    );
    return success({ application });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid application payload', 400);
    }
    return error('Could not update application', 500);
  }
}
