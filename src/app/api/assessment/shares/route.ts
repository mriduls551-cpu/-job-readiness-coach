import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { error, success } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { getRequestLocale, resolveRequestUser } from '@/lib/request-user';
import { type RoleId } from '@/lib/product';
import { getFirstName } from '@/lib/presentation';

const schema = z.object({
  selectedRoleId: z.string().min(1),
});

function buildPublicShareUrl(publicId: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/r/${publicId}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return error('Authentication required', 401);
    }

    const locale = getRequestLocale(request);
    const body = schema.parse(await request.json());
    const db = getDB();
    const assessment = await db.getLatestAssessment(user.id);
    if (!assessment?.resultSnapshot) {
      return error('No completed assessment found', 404);
    }

    const selectedMatch =
      assessment.resultSnapshot.topRoles.find((role) => role.roleId === body.selectedRoleId) ||
      assessment.resultSnapshot.topRoles[0];

    if (!selectedMatch) {
      return error('No shareable match found', 400);
    }

    const roleId = selectedMatch.roleId as RoleId;
    const publicId = randomUUID();
    const share = await db.savePublicShare(user.id, {
      assessmentId: assessment.id,
      publicId,
      firstName: getFirstName(user.name, locale === 'en' ? 'there' : 'दोस्त'),
      locale,
      roleId,
      roleName: selectedMatch.role.name,
      roleSummary: selectedMatch.role.summary,
      dimensionSnapshot: assessment.resultSnapshot.dimensionSnapshot,
      confidenceBand: assessment.resultSnapshot.confidenceBand,
    });

    if (!share) {
      return error('Unable to create public share', 500);
    }

    const publicUrl = buildPublicShareUrl(share.publicId);
    return success({
      share: {
        publicId: share.publicId,
        publicUrl,
        firstName: share.firstName,
        locale: share.locale,
        roleId: share.roleId,
        roleName: share.roleName,
        roleSummary: share.roleSummary,
        dimensionSnapshot: share.dimensionSnapshot,
        confidenceBand: share.confidenceBand,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid share payload', 400);
    }

    return error('Unable to create share right now', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const publicId = request.nextUrl.searchParams.get('publicId');
    if (!publicId) {
      return error('Missing publicId', 400);
    }

    const share = await getDB().getPublicShare(publicId);
    if (!share) {
      return error('Share not found', 404);
    }

    return success({
      share: {
        publicId: share.publicId,
        firstName: share.firstName,
        locale: share.locale,
        roleId: share.roleId,
        roleName: share.roleName,
        roleSummary: share.roleSummary,
        dimensionSnapshot: share.dimensionSnapshot,
        confidenceBand: share.confidenceBand,
        visitCount: share.visitCount,
        lastVisitedAt: share.lastVisitedAt,
      },
    });
  } catch {
    return error('Unable to load share', 500);
  }
}
