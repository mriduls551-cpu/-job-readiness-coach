'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BrandWordmark } from '@/components/BrandWordmark';
import { FullPageLoader } from '@/components/FullPageLoader';
import { getStoredUser, refreshStoredUserFromSession } from '@/lib/client-session';

const PROTECTED_PREFIXES = [
  '/career-fit-check',
  '/results',
  '/resume',
  '/dashboard',
  '/plan',
  '/applications',
  '/interview',
  '/profile',
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'needs-auth'>('checking');

  const isProtected = useMemo(
    () => PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname]
  );
  const isAuthScreen = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const localUser = getStoredUser();
      const user = localUser || (await refreshStoredUserFromSession());

      if (!active) return;

      if (isAuthScreen && user) {
        router.replace('/');
        return;
      }

      if (isProtected && !user) {
        setStatus('needs-auth');
        return;
      }

      setStatus('ready');
    };

    void sync();

    return () => {
      active = false;
    };
  }, [isAuthScreen, isProtected, router]);

  if (status === 'checking') {
    return (
      <FullPageLoader
        eyebrow="Checking your session"
        title="Opening your saved workspace..."
        message="We are restoring your account, assessment, resume, and next-step context."
      />
    );
  }

  if (status === 'needs-auth') {
    return (
      <main className="section-shell">
        <div className="container-main max-w-5xl">
          <section className="workspace-hero">
            <BrandWordmark compact />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
              <div>
                <p className="eyebrow-copy">Account required</p>
                <h1 className="mt-4 text-4xl leading-tight text-slate-950 sm:text-5xl">
                  Sign in once to keep your job-readiness journey together.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                  Your fit-check answers, role matches, resume draft, weekly plan,
                  applications, and interview practice all stay in one saved workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className="btn-primary"
                    href={`/register?next=${encodeURIComponent(pathname)}`}
                  >
                    Create free account
                  </Link>
                  <Link
                    className="btn-outline"
                    href={`/login?next=${encodeURIComponent(pathname)}`}
                  >
                    Sign in
                  </Link>
                </div>
              </div>

              <div className="route-shell bg-white/90">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  What stays saved
                </p>
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700">
                  <p>Role matches with plain-language rationale</p>
                  <p>Resume draft tied to your selected role</p>
                  <p>Weekly action plan and applications tracker</p>
                  <p>Interview preparation in the same journey</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
