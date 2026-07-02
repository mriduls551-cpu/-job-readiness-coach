/**
 * Zustand app store — reactive layer over client-session.ts localStorage state.
 *
 * No persist middleware: client-session.ts owns localStorage.
 * This store is the pub/sub mechanism that replaces window.dispatchEvent/addEventListener.
 *
 * Bootstrap: SessionBootstrap reads localStorage once on mount and calls setState.
 * Updates: client-session.ts write functions call useAppStore.setState() directly
 *          (Zustand's vanilla API works outside React components).
 */

import { create } from 'zustand';
import type { AssessmentFeedback, AssessmentResult, RoleId } from '@/lib/product';
import type { StoredUser } from '@/lib/client-session';

export interface AppState {
  user: StoredUser | null;
  locale: 'en' | 'hi';
  latestAssessment: AssessmentResult | null;
  selectedRole: RoleId | null;
  assessmentFeedback: AssessmentFeedback | null;
}

export const useAppStore = create<AppState>(() => ({
  user: null,
  locale: 'en',
  latestAssessment: null,
  selectedRole: null,
  assessmentFeedback: null,
}));
