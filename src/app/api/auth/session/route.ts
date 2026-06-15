import { NextRequest } from 'next/server';
import { success } from '@/lib/api-response';
import { resolveRequestUser } from '@/lib/request-user';

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);

  return success({
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      : null,
  });
}
