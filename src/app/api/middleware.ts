/**
 * API middleware for all routes
 * Handles:
 * - Security headers
 * - CORS
 * - Rate limiting (stub)
 * - Request ID tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-user';

function addSecurityHeaders(response: NextResponse): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https: data:",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' https://openrouter.ai https://*.supabase.co${
      isProduction
        ? ''
        : ' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*'
    }`,
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

function addCORSHeaders(response: NextResponse): NextResponse {
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '3600');

  return response;
}

export async function withSecurityHeaders(
  handler: (request: NextRequest) => Promise<Response>
): Promise<(request: NextRequest) => Promise<Response>> {
  return async (request: NextRequest) => {
    const requestId = crypto.randomUUID();

    logger.debug('API request', {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      ip: getClientIp(request),
    });

    try {
      const response = await handler(request);
      const headerResponse = addSecurityHeaders(response as NextResponse);
      const corsResponse = addCORSHeaders(headerResponse);

      corsResponse.headers.set('x-request-id', requestId);

      return corsResponse;
    } catch (error) {
      logger.error('API middleware error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );

      return addSecurityHeaders(addCORSHeaders(errorResponse));
    }
  };
}
