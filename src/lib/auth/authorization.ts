import { NextRequest } from 'next/server';
import { error } from '@/lib/api-response';
import { HttpStatus } from '@/types/api';
import { logger } from '@/lib/logger';
import { resolveRequestUser } from '@/lib/request-user';

export async function verifyAdminRequest(
  request: NextRequest,
  adminResourceType: string
): Promise<
  | { authorized: true; user: Awaited<ReturnType<typeof resolveRequestUser>> & { role: 'admin' } }
  | { authorized: false; response: Response }
> {
  const user = await resolveRequestUser(request);

  if (!user) {
    logger.warn('Admin access attempted without auth', {
      resourceType: adminResourceType,
    });
    return {
      authorized: false,
      response: error(
        'Authentication required',
        HttpStatus.UNAUTHORIZED
      ) as unknown as Response,
    };
  }

  if (user.role !== 'admin') {
    logger.warn('Non-admin attempted access to admin resource', {
      userId: user.id,
      resourceType: adminResourceType,
    });
    return {
      authorized: false,
      response: error(
        'Admin access required',
        HttpStatus.FORBIDDEN
      ) as unknown as Response,
    };
  }

  return {
    authorized: true,
    user: user as Awaited<ReturnType<typeof resolveRequestUser>> & { role: 'admin' },
  };
}
