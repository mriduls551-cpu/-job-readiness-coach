/**
 * Mock Authentication Service
 * Simulates Supabase Auth without actual external API calls
 */

import { isLocalAuthEnabled } from '@/lib/auth-mode';

interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface AuthSession {
  user: MockUser;
  token: string;
  expiresAt: number;
}

function buildDefaultMockUsers(): Record<string, { email: string; password: string; user: MockUser }> {
  const demoEmail = process.env.MOCK_DEMO_EMAIL || 'demo@example.com';
  const demoPassword = process.env.MOCK_DEMO_PASSWORD;
  const adminEmail = process.env.MOCK_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.MOCK_ADMIN_PASSWORD;

  if (!demoPassword || !adminPassword) {
    if (process.env.NODE_ENV === 'production' && isLocalAuthEnabled()) {
      throw new Error(
        'MOCK_DEMO_PASSWORD and MOCK_ADMIN_PASSWORD must be set when local auth is enabled in production.'
      );
    }
    // Dev-only fallback — never ships to production
    console.warn(
      '[mock-auth] MOCK_DEMO_PASSWORD / MOCK_ADMIN_PASSWORD not set. Using insecure dev defaults. ' +
      'Set these env vars or set ENABLE_LOCAL_AUTH=false for any non-local environment.'
    );
  }

  return {
    [demoEmail]: {
      email: demoEmail,
      password: demoPassword ?? 'dev-demo-password',
      user: {
        id: 'user-1',
        email: demoEmail,
        name: 'Demo User',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
    },
    [adminEmail]: {
      email: adminEmail,
      password: adminPassword ?? 'dev-admin-password',
      user: {
        id: 'admin-1',
        email: adminEmail,
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    },
  };
}

let mockUsers: Record<string, { email: string; password: string; user: MockUser }> | null = null;

function getMockUsers() {
  if (!mockUsers) {
    mockUsers = buildDefaultMockUsers();
  }

  return mockUsers;
}

function generateToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: Math.random().toString(36).substr(2, 9),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
    })
  );
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
}

export const mockAuth = {
  register: async (email: string, password: string, name: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = getMockUsers();

    if (users[email]) {
      throw new Error('Email already registered');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const newUser: MockUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    users[email] = {
      email,
      password,
      user: newUser,
    };

    return { user: newUser, message: 'Registration successful' };
  },

  login: async (email: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const users = getMockUsers();

    const userRecord = users[email];

    if (!userRecord || userRecord.password !== password) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken();
    const expiresAt = Date.now() + 3600 * 24 * 7;

    const session: AuthSession = {
      user: userRecord.user,
      token,
      expiresAt,
    };

    // SECURITY: Token storage is handled by the caller (server API endpoint)
    // Server sets httpOnly cookie; client stores user data only
    // Never store auth tokens in localStorage

    return session;
  },

  logout: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-session');
    }
  },

  getSession: (): AuthSession | null => {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem('auth-session');
    if (!stored) return null;

    try {
      const session = JSON.parse(stored) as AuthSession;

      if (session.expiresAt < Date.now()) {
        localStorage.removeItem('auth-session');
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  getCurrentUser: (): MockUser | null => {
    const session = mockAuth.getSession();
    return session?.user || null;
  },

  resetPassword: async (email: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const users = getMockUsers();

    if (!users[email]) {
      throw new Error('Email not found');
    }
    return { message: 'Password reset email sent' };
  },

  confirmPasswordReset: async (email: string, newPassword: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const users = getMockUsers();
    const user = users[email];
    if (!user) {
      throw new Error('Email not found');
    }
    user.password = newPassword;
    return { message: 'Password reset confirmed' };
  },

  updateProfile: async (
    email: string,
    input: {
      name?: string;
    }
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const users = getMockUsers();
    const userRecord = users[email];
    if (!userRecord) {
      throw new Error('User not found');
    }

    if (input.name) {
      userRecord.user.name = input.name;
    }

    return {
      user: userRecord.user,
    };
  },
};
