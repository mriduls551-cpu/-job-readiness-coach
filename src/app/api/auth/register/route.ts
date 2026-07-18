import { NextRequest } from 'next/server';
import { z } from 'zod';
import { success, error } from '@/lib/api-response';
import { mockAuth } from '@/lib/mock-auth';
import { logger } from '@/lib/logger';
import { getDB } from '@/lib/db';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { isLocalAuthEnabled } from '@/lib/auth-mode';
import { getRateLimiter } from '@/lib/rate-limiter';
import { HttpStatus } from '@/types/api';
import { getClientIp } from '@/lib/request-user';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

const registerLimiter = getRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const limitCheck = await registerLimiter.check(clientIp);
    if (limitCheck.limited) {
      logger.warn('Registration rate limit exceeded', {
        clientIp,
        resetTime: new Date(Date.now() + limitCheck.resetTime).toISOString(),
      });

      const response = error(
        'Too many registration attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      );
      response.headers.set('Retry-After', Math.ceil(limitCheck.resetTime / 1000).toString());
      return response;
    }

    const body = await request.json();
    const input = registerSchema.parse(body);
    if (isSupabaseConfigured()) {
      const client = createServerClient();
      if (!client) {
        return error('Supabase is not fully configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const { data, error: authError } = await client.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          name: input.name,
        },
      });

      if (authError || !data.user) {
        return error(authError?.message || 'Registration failed', HttpStatus.BAD_REQUEST);
      }

      const user = await getDB().ensureUser({
        id: data.user.id,
        email: input.email,
        name: input.name,
        role: 'user',
        createdAt: data.user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info('User registered with Supabase', { userId: user.id });

      return success(
        {
          user,
        },
        'Registration successful',
        201
      );
    }

    if (!isLocalAuthEnabled()) {
      return error(
        'Authentication is not configured for this environment',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const result = await mockAuth.register(input.email, input.password, input.name);
    await getDB().ensureUser({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      createdAt: result.user.createdAt,
      updatedAt: new Date().toISOString(),
    });

    logger.info('User registered', { userId: result.user.id });

    return success(
      {
        user: result.user,
      },
      'Registration successful',
      HttpStatus.CREATED
    );
  } catch (err) {
    logger.error('Registration error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    if (err instanceof z.ZodError) {
      return error(
        err.errors[0]?.message || 'Invalid registration details',
        HttpStatus.BAD_REQUEST
      );
    }
    return error(
      err instanceof Error ? err.message : 'Registration failed',
      HttpStatus.BAD_REQUEST
    );
  }
}
