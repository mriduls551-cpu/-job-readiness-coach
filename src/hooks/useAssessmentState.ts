'use client';

import { useEffect, useState } from 'react';
import { refreshStoredAssessmentFromServer } from '@/lib/client-session';
import { useAppStore } from '@/lib/store';
import type { RoleId } from '@/lib/product';

export function useAssessmentState() {
  const assessment = useAppStore((state) => state.latestAssessment);
  const storedRoleId = useAppStore((state) => state.selectedRole);
  const feedback = useAppStore((state) => state.assessmentFeedback);
  const [loading, setLoading] = useState(true);

  // Derive the effective selectedRoleId: stored override > top assessment role
  const selectedRoleId: RoleId | null =
    storedRoleId ?? assessment?.topRoles?.[0]?.roleId ?? null;

  useEffect(() => {
    let active = true;

    // If we already have assessment data from the store (hydrated from localStorage),
    // stop showing the loading state immediately.
    if (assessment) {
      setLoading(false);
    }

    // Always refresh from server in the background to catch server-side changes.
    // refreshStoredAssessmentFromServer calls syncStore internally, so the store
    // (and all subscribers) update automatically when it resolves.
    const sync = async () => {
      await refreshStoredAssessmentFromServer();
      if (active) setLoading(false);
    };

    void sync();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { assessment, selectedRoleId, feedback, loading };
}
