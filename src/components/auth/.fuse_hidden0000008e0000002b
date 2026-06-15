'use client';

import { useEffect } from 'react';
import {
  refreshStoredAssessmentFromServer,
  refreshStoredUserFromSession,
} from '@/lib/client-session';

export function SessionBootstrap() {
  useEffect(() => {
    void refreshStoredUserFromSession().then((user) => {
      if (user) {
        void refreshStoredAssessmentFromServer();
      }
    });
  }, []);

  return null;
}
