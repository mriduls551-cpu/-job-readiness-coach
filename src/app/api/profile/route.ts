import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { getDB } from '@/lib/db';
import { resolveRequestUser } from '@/lib/request-user';
import { createLocalSessionToken } from '@/lib/server-auth';
import { mockAuth } from '@/lib/mock-auth';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

function shouldUseSecureCookies(request: NextRequest) {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === 'true') return true;
  if (override === 'false') return false;

  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto === 'https') {
    return true;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (appUrl) {
    try {
      const parsed = new URL(appUrl);
      if (parsed.protocol === 'https:') {
        return true;
      }

      if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
        return false;
      }
    } catch {
      // Ignore malformed env and fall back below.
    }
  }

  return process.env.NODE_ENV === 'production';
}

export async function GET(request: NextRequest) {
  const authenticatedUser = await resolveRequestUser(request);
  if (!authenticatedUser) {
    return error('Authentication required', 401);
  }

  const user = await getDB().getUser(authenticatedUser.id);
  return success({
    user: user || {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      createdAt: '',
      updatedAt: '',
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const authenticatedUser = await resolveRequestUser(request);
    if (!authenticatedUser) {
      return error('Authentication required', 401);
    }

    const body = profileUpdateSchema.parse(await request.json());
    const nextName = body.name.trim();
    const db = getDB();
    const existingUser = await db.getUser(authenticatedUser.id);

    if (isSupabaseConfigured()) {
      const client = createServerClient();
      if (!client) {
        return error('Supabase is not fully configured', 500);
      }

      const { error: authError } = await client.auth.admin.updateUserById(authenticatedUser.id, {
        user_metadata: {
          name: nextName,
        },
      });

      if (authError) {
        return error(authError.message || 'Could not update profile', 500);
      }
    } else {
      await mockAuth.updateProfile(authenticatedUser.email, {
        name: nextName,
      });
    }

    const updatedUser = await db.ensureUser({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: nextName,
      role: authenticatedUser.role,
      createdAt: existingUser?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = success(
      {
        user: updatedUser,
      },
      'Profile updated'
    );

    if (!isSupabaseConfigured()) {
      const secureCookies = shouldUseSecureCookies(request);
      const token = await createLocalSessionToken({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      });

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: secureCookies ? 'strict' : 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.errors[0]?.message || 'Invalid profile payload', 400);
    }

    return error('Could not update profile right now', 500);
  }
}
