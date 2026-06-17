'use client';

import { useEffect } from 'react';
import {
  getLatestAssessment,
  getSelectedRole,
  getStoredLocale,
  getStoredUser,
  refreshStoredAssessmentFromServer,
  refreshStoredUserFromSession,
} from '@/lib/client-session';
import { useAppStore } from '@/lib/store';

export function SessionBootstrap() {
  useEffect(() => {
    // Hydrate the Zustand store from localStorage before any server calls.
    // This means components that read from the store see the right locale/user
    // immediately on first render, without waiting for the server round-trip.
    useAppStore.setState({
      user: getStoredUser(),
      locale: getStoredLocale(),
      latestAssessment: getLatestAssessment(),
      selectedRole: getSelectedRole(),
    });

    void refreshStoredUserFromSession().then((user) => {
      if (user) {
        void refreshStoredAssessmentFromServer();
      }
    });
  }, []);

  return null;
}
