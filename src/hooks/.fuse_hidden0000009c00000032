'use client';

import { useEffect, useState } from 'react';
import {
  getLatestAssessment,
  getSelectedRole,
  refreshStoredAssessmentFromServer,
} from '@/lib/client-session';
import type { AssessmentResult, RoleId } from '@/lib/product';

export function useAssessmentState() {
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncLocal = () => {
      const localAssessment = getLatestAssessment();
      const localRoleId =
        getSelectedRole() || localAssessment?.topRoles?.[0]?.roleId || null;

      if (!active) {
        return;
      }

      setAssessment(localAssessment);
      setSelectedRoleId(localRoleId);
      setLoading(!localAssessment);
    };

    const syncServer = async () => {
      const payload = await refreshStoredAssessmentFromServer();
      if (!active) {
        return;
      }

      setAssessment(payload?.result || null);
      setSelectedRoleId(
        payload?.selectedRoleId || payload?.result?.topRoles?.[0]?.roleId || null
      );
      setLoading(false);
    };

    syncLocal();
    window.addEventListener('assessment-change', syncLocal);
    void syncServer();

    return () => {
      active = false;
      window.removeEventListener('assessment-change', syncLocal);
    };
  }, []);

  return {
    assessment,
    selectedRoleId,
    loading,
  };
}
