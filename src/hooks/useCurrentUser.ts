'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredUser,
  refreshStoredUserFromSession,
  type StoredUser,
} from '@/lib/client-session';

interface UseCurrentUserOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { requireAuth = false, redirectTo = '/login' } = options;
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const localUser = getStoredUser();
      if (localUser && active) {
        setUser(localUser);
        setLoading(false);
      }

      const sessionUser = await refreshStoredUserFromSession();
      if (!active) return;

      if (sessionUser) {
        setUser(sessionUser);
        setLoading(false);
        return;
      }

      setUser(null);
      setLoading(false);

      if (requireAuth) {
        router.replace(redirectTo);
      }
    };

    void sync();

    return () => {
      active = false;
    };
  }, [redirectTo, requireAuth, router]);

  return {
    user,
    loading,
  };
}
