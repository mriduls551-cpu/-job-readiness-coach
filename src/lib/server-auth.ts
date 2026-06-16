import { getSupabaseSession, isSupabaseConfigured } from '@/lib/supabase';

type UserRole = 'user' | 'admin';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
}

interface LocalSessionPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

interface RequestLike {
  headers: {
    get(name: string): string | null;
  };
  cookies: {
    get(name: string): { value: string } | undefined;
  };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'job-readiness-dev-session-secret';
  }

  throw new Error('NEXTAUTH_SECRET is required in production');
}

function toBase64(value: Uint8Array | string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value).toString('base64');
  }

  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const binary = Array.from(bytes, (item) => String.fromCharCode(item)).join('');
  return btoa(binary);
}

function fromBase64(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64');
  }

  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toBase64Url(value: Uint8Array | string) {
  return toBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return decoder.decode(fromBase64(normalized + padding));
}

async function sign(value: string) {
  const secret = getSessionSecret();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function parseLocalSessionPayload(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(parts[1])) as LocalSessionPayload;
  } catch {
    return null;
  }
}

function extractRole(value: unknown): UserRole {
  return value === 'admin' ? 'admin' : 'user';
}

export async function createLocalSessionToken(input: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: LocalSessionPayload = {
    sub: input.id,
    email: input.email,
    name: input.name,
    role: input.role,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_DURATION_SECONDS,
  };

  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = await sign(unsignedToken);

  return `${unsignedToken}.${signature}`;
}

export async function verifyLocalSessionToken(token: string) {
  const payload = parseLocalSessionPayload(token);
  if (!payload) {
    return null;
  }

  const [header, body, providedSignature] = token.split('.');
  const expectedSignature = await sign(`${header}.${body}`);
  if (providedSignature !== expectedSignature) {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

export async function resolveAuthenticatedUser(request: RequestLike): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('auth-token')?.value || null;
  const token = extractBearerToken(authHeader) || cookieToken;

  if (!token) {
    return null;
  }

  if (isSupabaseConfigured()) {
    const session = await getSupabaseSession(authHeader, cookieToken);
    if (!session?.user) {
      return null;
    }

    const role = extractRole(
      session.user.app_metadata?.role || session.user.user_metadata?.role
    );
    const name =
      (typeof session.user.user_metadata?.name === 'string' && session.user.user_metadata.name) ||
      (session.user.email ? session.user.email.split('@')[0] : 'User');

    return {
      id: session.user.id,
      email: session.user.email || '',
      name,
      role,
      token: session.token,
    };
  }

  const payload = await verifyLocalSessionToken(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    token,
  };
}
