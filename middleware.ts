import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { resolveAuthenticatedUser } from '@/lib/server-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of protected routes
  const protectedRoutes = [
    '/career-fit-check',
    '/matches',
    '/results',
    '/dashboard',
    '/resume',
    '/plan',
    '/applications',
    '/interview',
    '/profile',
  ];

  // List of admin-only routes
  const adminRoutes = ['/admin'];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check for auth token
  const authToken =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  const authenticatedUser = authToken
    ? await resolveAuthenticatedUser(request)
    : null;

  // If accessing protected route without auth, redirect to login
  if (isProtectedRoute && !authenticatedUser) {
    logger.info('Unauthorized access attempt - no auth token', {
      pathname,
      ip: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // If accessing admin routes, verify admin role
  if (isAdminRoute) {
    if (!authenticatedUser) {
      logger.warn('Admin access attempted without auth', {
        pathname,
        ip: request.headers.get('x-forwarded-for'),
      });
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url)
      );
    }

    if (authenticatedUser.role !== 'admin') {
      logger.warn('Non-admin attempted access to admin route', {
        pathname,
        userRole: authenticatedUser.role,
        ip: request.headers.get('x-forwarded-for'),
      });
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If accessing auth routes while authenticated, redirect to dashboard
  if ((pathname === '/login' || pathname === '/register') && authenticatedUser) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);

  // Add security headers
  addSecurityHeaders(response);

  return response;
}

/**
 * Add security headers to all responses
 */
function addSecurityHeaders(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' https: data:",
    "img-src 'self' data: https: blob:",
    `connect-src 'self' https://openrouter.ai https://*.supabase.co${
      isProduction ? '' : ' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*'
    }`,
    "form-action 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // Prevent content type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // HSTS (only in production with https)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // Content Security Policy
  response.headers.set('Content-Security-Policy', csp);
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
