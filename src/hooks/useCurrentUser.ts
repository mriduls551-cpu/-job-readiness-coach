'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { refreshStoredUserFromSession } from '@/lib/client-session';
import { useAppStore } from '@/lib/store';

interface UseCurrentUserOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { requireAuth = false, redirectTo = '/login' } = options;
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      // SessionBootstrap may not have run yet on first render.
      // refreshStoredUserFromSession hits the server, updates localStorage,
      // and calls syncStore({ user }) inside client-session — so `user` from
      // the store will update automatically when it resolves.
      const sessionUser = await refreshStoredUserFromSession();
      if (!active) return;

      setLoading(false);

      if (!sessionUser && requireAuth) {
        router.replace(redirectTo);
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [redirectTo, requireAuth, router]);

  return { user, loading };
}
