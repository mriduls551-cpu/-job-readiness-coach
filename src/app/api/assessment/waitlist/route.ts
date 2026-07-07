import { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, success } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUser } from '@/lib/request-user';
import { ROLE_ORDER, type RoleId } from '@/lib/product';

const schema = z.object({
  selectedRoleId: z.enum(ROLE_ORDER as [RoleId, ...RoleId[]]),
  contactConsent: z.literal(true),
  note: z.string().max(500).trim().optional().default(''),
});

export async function POST(request: NextRequest) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return error('Authentication required', 401);
    }

    const locale = getRequestLocale(request);
    const body = schema.parse(await request.json());
    const waitlist = await getDB().saveD1Waitlist(
      user.id,
      body.selectedRoleId,
      body.contactConsent,
      body.note,
      locale
    );

    if (!waitlist) {
      return error('No completed assessment found', 404);
    }

    return success({
      waitlist,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid waitlist payload', 400);
    }

    return error('Unable to save waitlist right now', 500);
  }
}
