import { NextRequest } from 'next/server';
import { error } from '@/lib/api-response';
import { HttpStatus } from '@/types/api';

function getBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export function verifyCronRequest(request: NextRequest) {
  const configuredSecret = process.env.VERCEL_CRON_SECRET?.trim();
  const providedToken = getBearerToken(request.headers.get('authorization'));

  if (configuredSecret) {
    if (providedToken !== configuredSecret) {
      return {
        authorized: false as const,
        source: 'unauthorized' as const,
        response: error('Unauthorized cron request', HttpStatus.UNAUTHORIZED),
      };
    }

    return {
      authorized: true as const,
      source: 'vercel-cron' as const,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      authorized: false as const,
      source: 'misconfigured' as const,
      response: error(
        'VERCEL_CRON_SECRET is not configured',
        HttpStatus.SERVICE_UNAVAILABLE
      ),
    };
  }

  return {
    authorized: true as const,
    source: 'local-dev' as const,
  };
}
