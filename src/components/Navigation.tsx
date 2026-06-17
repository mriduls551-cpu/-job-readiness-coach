'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BrandWordmark } from '@/components/BrandWordmark';
import {
  clearStoredUser,
  setStoredLocale,
} from '@/lib/client-session';
import { useAppStore } from '@/lib/store';
import type { Locale } from '@/lib/product';
import { Home, FileText, ListChecks, Briefcase, MessageSquare, User, ChevronDown, LogOut, Settings } from 'lucide-react';
import { getFirstName } from '@/lib/presentation';

const HIDE_PATHS = new Set(['/', '/login', '/register']);

// Bottom nav items for authenticated mobile users
const BOTTOM_NAV = [
  { href: '/dashboard', label: { en: 'Home', hi: 'मुख्य पृष्ठ' }, icon: '01' },
  { href: '/resume', label: { en: 'Resume', hi: 'जीवनवृत्त' }, icon: '02' },
  { href: '/plan', label: { en: 'Plan', hi: 'योजना' }, icon: '03' },
  { href: '/applications', label: { en: 'Jobs', hi: 'आवेदन' }, icon: '04' },
  { href: '/interview', label: { en: 'Prep', hi: 'तैयारी' }, icon: '05' },
] as const;

const BOTTOM_NAV_ICONS = {
  '/dashboard': Home,
  '/resume': FileText,
  '/plan': ListChecks,
  '/applications': Briefcase,
  '/interview': MessageSquare,
};

const DESKTOP_LINKS = [
  { href: '/career-fit-check', label: { en: 'Fit Check', hi: 'योग्यता जाँच' } },
  { href: '/results', label: { en: 'Results', hi: 'परिणाम' } },
  { href: '/dashboard', label: { en: 'Dashboard', hi: 'कार्यस्थल' }, auth: true },
  { href: '/resume', label: { en: 'Resume', hi: 'जीवनवृत्त' }, auth: true },
  { href: '/plan', label: { en: 'Plan', hi: 'साप्ताहिक योजना' }, auth: true },
  { href: '/interview', label: { en: 'Interview', hi: 'साक्षात्कार' }, auth: true },
] as const;

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppStore((state) => state.user);
  const locale = useAppStore((state) => state.locale);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      clearStoredUser();
      router.push('/');
    }
  };

  const toggleLocale = (nextLocale: Locale) => {
    setStoredLocale(nextLocale);
  };

  if (HIDE_PATHS.has(pathname)) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Top nav */}
      <nav className="sticky top-0 z-40 border-b border-[rgba(17,63,69,0.08)] bg-[rgba(250,246,239,0.92)] backdrop-blur-xl">
        <div className="container-main flex min-h-[4.8rem] items-center justify-between gap-4 py-3">
          <BrandWordmark compact href="/" locale={locale} />

          {/* Desktop links - hidden on mobile */}
          <div className="hidden items-center gap-5 md:flex">
            {DESKTOP_LINKS.filter((item) => !('auth' in item) || user).map((item) => (
              <Link
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`text-sm transition ${
                  isActive(item.href)
                    ? 'font-semibold text-[var(--brand-ink)]'
                    : 'text-[var(--ink-soft)] hover:text-[var(--brand-ink)]'
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label[locale]}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Locale toggle */}
            <div className="rounded-full bg-white/80 p-1 shadow-sm">
              <button
                aria-label="Switch to English"
                className={`min-h-[36px] min-w-[36px] rounded-full px-3 py-2 text-xs font-semibold transition ${
                  locale === 'en'
                    ? 'bg-[var(--brand-ink)] text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--brand-ink)]'
                }`}
                onClick={() => toggleLocale('en')}
                type="button"
              >
                EN
              </button>
              <button
                aria-label="Switch to Hindi"
                className={`min-h-[36px] min-w-[36px] rounded-full px-3 py-2 text-xs font-semibold transition ${
                  locale === 'hi'
                    ? 'bg-[var(--brand-ink)] text-white'
                    : 'text-[var(--ink-soft)] hover:text-[var(--brand-ink)]'
                }`}
                onClick={() => toggleLocale('hi')}
                type="button"
              >
                HI
              </button>
            </div>

            {user ? (
              <div className="relative">
                <button
                  aria-expanded={showMenu}
                  aria-haspopup="true"
                  className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--brand-ink)]"
                  onClick={() => setShowMenu((current) => !current)}
                  type="button"
                >
                  <User aria-hidden="true" size={14} />
                  {getFirstName(user.name, locale === 'en' ? 'Account' : 'खाता')}
                  <ChevronDown aria-hidden="true" size={12} />
                </button>
                {showMenu ? (
                  <div className="absolute right-0 mt-3 w-56 rounded-3xl border border-white/70 bg-white/95 p-3 shadow-2xl">
                    <p className="px-3 py-2 text-xs text-[var(--ink-muted)]">
                      {user.email}
                    </p>
                    <Link
                      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--brand-ink)] hover:bg-slate-100"
                      href="/applications"
                    >
                      <Briefcase aria-hidden="true" size={14} />
                      {locale === 'en' ? 'Applications' : 'आवेदन'}
                    </Link>
                    <Link
                      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-[var(--brand-ink)] hover:bg-slate-100"
                      href="/profile"
                    >
                      <Settings aria-hidden="true" size={14} />
                      {locale === 'en' ? 'Account' : 'खाता'}
                    </Link>
                    <button
                      className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-[var(--brand-ink)] hover:bg-slate-100"
                      onClick={handleLogout}
                      type="button"
                    >
                      <LogOut aria-hidden="true" size={14} />
                      {locale === 'en' ? 'Log out' : 'साइन आउट'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <Link
                  className="text-sm font-semibold text-[var(--brand-ink)]"
                  href="/login"
                >
                  {locale === 'en' ? 'Sign in' : 'साइन इन'}
                </Link>
                <Link className="btn-primary" href="/register">
                  {locale === 'en' ? 'Create free account' : 'मुफ़्त खाता बनाएँ'}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav - authenticated users only, hidden on md+ */}
      {user ? (
        <nav
          aria-label="Main navigation"
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(17,63,69,0.1)] bg-[rgba(255,253,248,0.97)] pb-safe backdrop-blur-xl md:hidden"
        >
          <div className="flex items-stretch">
            {BOTTOM_NAV.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-3 text-center transition ${
                    active
                      ? 'text-[var(--accent-ink)]'
                      : 'text-[var(--ink-muted)] hover:text-[var(--brand-ink)]'
                  }`}
                  href={href}
                  key={href}
                >
                  {(() => {
                    const NavIcon = BOTTOM_NAV_ICONS[href];
                    return NavIcon ? <NavIcon size={22} aria-hidden="true" /> : null;
                  })()}
                  <span className="text-[10px] font-semibold leading-tight">
                    {label[locale]}
                  </span>
                  {active ? (
                    <span className="mt-0.5 h-0.5 w-4 rounded-full bg-[var(--accent-ink)]" />
                  ) : (
                    <span className="mt-0.5 h-0.5 w-4" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
