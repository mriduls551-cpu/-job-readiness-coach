/**
 * Client-side session management
 */

import { isActiveRoleId, type AssessmentResult, type RoleId } from '@/lib/product';
import { useAppStore } from '@/lib/store';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface SessionData {
  user: StoredUser | null;
  token: string | null;
  latestAssessment: AssessmentResult | null;
  selectedRole: RoleId | null;
  locale: 'en' | 'hi';
  resumeDraft: any | null;
}

export interface StoredAssessmentState {
  result: AssessmentResult | null;
  selectedRoleId: RoleId | null;
}

const SESSION_KEY = 'job-readiness-session';
const LOCALE_KEY = 'job-readiness-locale';
const RESUME_DRAFT_KEY = 'job-readiness-resume-draft';

function getSession(): SessionData {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      latestAssessment: null,
      selectedRole: null,
      locale: 'en',
      resumeDraft: null,
    };
  }

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : createEmptySession();
  } catch {
    return createEmptySession();
  }
}

function createEmptySession(): SessionData {
  return {
    user: null,
    token: null,
    latestAssessment: null,
    selectedRole: null,
    locale: 'en',
    resumeDraft: null,
  };
}

function saveSession(session: SessionData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

function syncStore(patch: Partial<import('@/lib/store').AppState>) {
  if (typeof window !== 'undefined') {
    useAppStore.setState(patch);
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
  syncStore({ user: null, latestAssessment: null, selectedRole: null });
}

export function clearStoredUser(): void {
  const session = getSession();
  session.user = null;
  session.latestAssessment = null;
  session.selectedRole = null;
  saveSession(session);
  syncStore({ user: null, latestAssessment: null, selectedRole: null });
}

export function setStoredUser(user: StoredUser): void {
  const session = getSession();
  session.user = user;
  saveSession(session);
  syncStore({ user });
}

export function getStoredUser(): StoredUser | null {
  return getSession().user;
}

/**
 * @deprecated Do NOT use - tokens must never be stored in localStorage
 * Tokens are stored in httpOnly cookies by the server (secure against XSS)
 * This function exists only for backward compatibility
 */
export function setToken(token: string): void {
  const session = getSession();
  session.token = token;
  saveSession(session);
}

/**
 * @deprecated Do NOT use - tokens must never be stored in localStorage
 * Tokens are stored in httpOnly cookies by the server (secure against XSS)
 * This function exists only for backward compatibility
 */
export function getToken(): string | null {
  return getSession().token;
}

export function setLatestAssessment(assessment: AssessmentResult): void {
  if (assessment.topRoles.some((role) => !isActiveRoleId(role.roleId))) {
    clearLatestAssessment();
    return;
  }
  const session = getSession();
  session.latestAssessment = assessment;
  saveSession(session);
  syncStore({ latestAssessment: assessment });
}

export function clearLatestAssessment(): void {
  const session = getSession();
  session.latestAssessment = null;
  session.selectedRole = null;
  saveSession(session);
  syncStore({ latestAssessment: null, selectedRole: null });
}

export function getLatestAssessment(): AssessmentResult | null {
  const assessment = getSession().latestAssessment;
  return assessment && assessment.topRoles.every((role) => isActiveRoleId(role.roleId))
    ? assessment
    : null;
}

export function setSelectedRole(roleId: RoleId | null): void {
  if (roleId !== null && !isActiveRoleId(roleId)) roleId = null;
  const session = getSession();
  session.selectedRole = roleId;
  saveSession(session);
  syncStore({ selectedRole: roleId });
}

export async function persistSelectedRole(
  roleId: RoleId | null
): Promise<StoredAssessmentState | null> {
  setSelectedRole(roleId);

  if (!roleId) {
    return {
      result: getLatestAssessment(),
      selectedRoleId: null,
    };
  }

  try {
    const response = await fetch('/api/assessment/fit-check', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to persist selected role');
    }

    const data = await response.json();
    const result = (data.data?.result || null) as AssessmentResult | null;
    const selectedRoleId = (data.data?.selectedRoleId || roleId) as RoleId | null;

    if (result) {
      setLatestAssessment(result);
    }
    setSelectedRole(selectedRoleId);

    return {
      result,
      selectedRoleId,
    };
  } catch {
    return {
      result: getLatestAssessment(),
      selectedRoleId: getSelectedRole(),
    };
  }
}

export function getSelectedRole(): RoleId | null {
  const roleId = getSession().selectedRole;
  return isActiveRoleId(roleId) ? roleId : null;
}

export function setStoredLocale(locale: 'en' | 'hi'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_KEY, locale);
  }
  syncStore({ locale });
}

export function getStoredLocale(): 'en' | 'hi' {
  if (typeof window === 'undefined') {
    return 'en';
  }

  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return (stored === 'hi' ? 'hi' : 'en') as 'en' | 'hi';
  } catch {
    return 'en';
  }
}

export function setStoredResumeDraft(draft: any): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RESUME_DRAFT_KEY, JSON.stringify(draft));
  }
}

export function getStoredResumeDraft(): any | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(RESUME_DRAFT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  const user = data.data?.user;

  if (user) {
    setStoredUser(user);
    // SECURITY: Token is stored in httpOnly cookie by server, NOT in localStorage
    // HttpOnly cookies are inaccessible to JavaScript, protecting against XSS
    // Client retrieves token from /api/auth/session endpoint when needed
  }

  return data;
}

export async function logout(): Promise<void> {
  return fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  }).then(() => {
    clearSession();
  });
}

export async function refreshStoredUserFromSession(): Promise<StoredUser | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!response.ok) {
      clearStoredUser();
      return null;
    }

    const data = await response.json();
    const user = data.data?.user;

    if (user) {
      setStoredUser(user);
      return user;
    } else {
      clearStoredUser();
      return null;
    }
  } catch {
    clearStoredUser();
    return null;
  }
}

export async function refreshStoredAssessmentFromServer(): Promise<StoredAssessmentState | null> {
  try {
    const response = await fetch('/api/assessment/fit-check', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const assessment = (data.data?.result || null) as AssessmentResult | null;
    const selectedRoleId = (data.data?.selectedRoleId || null) as RoleId | null;

    if (assessment) {
      setLatestAssessment(assessment);
      setSelectedRole(selectedRoleId || assessment.topRoles?.[0]?.roleId || null);
      return {
        result: assessment,
        selectedRoleId: selectedRoleId || assessment.topRoles?.[0]?.roleId || null,
      };
    }

    clearLatestAssessment();
    return {
      result: null,
      selectedRoleId: null,
    };
  } catch {
    return null;
  }
}
