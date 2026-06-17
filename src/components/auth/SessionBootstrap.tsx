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
import { identifyProductUser } from '@/lib/analytics';
import { useAppStore } from '@/lib/store';

export function SessionBootstrap() {
  useEffect(() => {
    // Hydrate the Zustand store from localStorage before any server calls.
    // This means components that read from the store see the right locale/user
    // immediately on first render, without waiting for the server round-trip.
    const storedUser = getStoredUser();
    useAppStore.setState({
      user: storedUser,
      locale: getStoredLocale(),
      latestAssessment: getLatestAssessment(),
      selectedRole: getSelectedRole(),
    });
    void identifyProductUser(storedUser);

    void refreshStoredUserFromSession().then((user) => {
      void identifyProductUser(user);
      if (user) {
        void refreshStoredAssessmentFromServer();
      }
    });
  }, []);

  return null;
}
