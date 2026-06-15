import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { JobCoachDatabase } from './job-coach-supabase.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function hasPublicSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && serviceRoleKey);
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export const supabase = getSupabaseBrowserClient();

export function createServerClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createServerAuthClient() {
  if (!hasPublicSupabaseConfig()) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

export async function getSupabaseSession(
  authHeader: string | null,
  cookieToken?: string | null
) {
  const token = extractBearerToken(authHeader) || cookieToken || null;
  if (!token) {
    return null;
  }

  const authClient = createServerAuthClient() || createServerClient();
  if (!authClient) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return { user, token };
}

export type JobCoachSupabaseClient = SupabaseClient;
export type { JobCoachDatabase };
