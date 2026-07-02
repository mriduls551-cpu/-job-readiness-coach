import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AssessmentProfile, Locale } from '@/lib/product';

export const FITCHECK_DRAFT_STORAGE_KEY = 'job-readiness-fitcheck-draft';

type FitCheckDraftProfile = Partial<
  Pick<AssessmentProfile, 'fullName' | 'city' | 'degreeName' | 'educationStream'>
>;

export interface FitCheckDraftSnapshot {
  responses: Record<string, string>;
  profile: FitCheckDraftProfile;
  currentIndex: number;
  locale: Locale;
  updatedAt: number | null;
}

interface FitCheckDraftState extends FitCheckDraftSnapshot {
  hydrated: boolean;
  setDraft: (patch: Partial<FitCheckDraftSnapshot>) => void;
  hydrateDraft: (patch: Partial<FitCheckDraftSnapshot>) => void;
  clearDraft: () => void;
  markHydrated: (hydrated: boolean) => void;
}

export function createEmptyFitCheckDraft(): FitCheckDraftSnapshot {
  return {
    responses: {},
    profile: {
      fullName: '',
      city: '',
      degreeName: '',
    },
    currentIndex: 0,
    locale: 'en',
    updatedAt: null,
  };
}

export const useFitCheckDraftStore = create<FitCheckDraftState>()(
  persist(
    (set) => ({
      ...createEmptyFitCheckDraft(),
      hydrated: false,
      setDraft: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
          updatedAt: Date.now(),
        })),
      hydrateDraft: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
        })),
      clearDraft: () =>
        set({
          ...createEmptyFitCheckDraft(),
          hydrated: true,
        }),
      markHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: FITCHECK_DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ responses, profile, currentIndex, locale, updatedAt }) => ({
        responses,
        profile,
        currentIndex,
        locale,
        updatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated(true);
      },
    }
  )
);
