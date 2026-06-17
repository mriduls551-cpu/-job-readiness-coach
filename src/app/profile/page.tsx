'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LanguageSelect } from '@/components/LanguageSelect';
import { FullPageLoader } from '@/components/FullPageLoader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { setStoredUser } from '@/lib/client-session';
import { captureProductEvent } from '@/lib/analytics';
import { useAppStore } from '@/lib/store';
import { ROLE_DEFINITIONS, getLocaleValue, type RoleId } from '@/lib/product';

interface ProfileResponseUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export default function ProfilePage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const {
    assessment,
    selectedRoleId,
    loading: assessmentLoading,
  } = useAssessmentState();
  const locale = useAppStore((state) => state.locale);
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setSavedName(user.name);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const response = await fetch('/api/profile', {
        credentials: 'include',
      });

      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: {
          user?: ProfileResponseUser;
        };
      };
      const nextUser = payload.data?.user;
      if (!nextUser) return;

      setStoredUser(nextUser);
      setName(nextUser.name);
      setSavedName(nextUser.name);
    };

    void loadProfile();
  }, [user]);

  const activeRole = useMemo(() => {
    const roleId = (selectedRoleId ||
      assessment?.topRoles?.[0]?.roleId ||
      null) as RoleId | null;
    return roleId ? ROLE_DEFINITIONS[roleId] : null;
  }, [assessment?.topRoles, selectedRoleId]);

  const saveProfile = () => {
    if (!user) return;

    startTransition(async () => {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      const payload = (await response.json()) as {
        error?: string;
        data?: { user?: ProfileResponseUser };
      };

      if (!response.ok || !payload.data?.user) {
        toast.error(
          payload.error ||
            (locale === 'en'
              ? 'We could not save your profile right now.'
              : 'हम अभी आपका प्रोफ़ाइल सेव नहीं कर पाए।')
        );
        return;
      }

      setStoredUser(payload.data.user);
      setSavedName(payload.data.user.name);
      void captureProductEvent('profile_updated', {
        changed_name: true,
      });
      toast.success(
        locale === 'en' ? 'Profile updated successfully.' : 'प्रोफ़ाइल सफलतापूर्वक अपडेट हो गई।'
      );
    });
  };

  const hasUnsavedChanges = name.trim() !== savedName.trim();

  if (loading || assessmentLoading) {
    return (
      <FullPageLoader
        eyebrow="Account"
        title="Loading your account…"
        message="We’re bringing together your profile, language preference, and journey summary."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Account"
        title="Redirecting to sign in…"
        message="Your account page is available after sign-in."
      />
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-6">
        <section className="workspace-hero">
          <p className="eyebrow-copy">{locale === 'en' ? 'Account' : 'खाता'}</p>
          <h1 className="mt-4 text-4xl leading-tight text-slate-950 sm:text-5xl">
            {locale === 'en'
              ? 'Keep your profile and job journey in sync.'
              : 'अपनी जानकारी और नौकरी की तैयारी को एक साथ व्यवस्थित रखें।'}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {locale === 'en'
              ? 'Update the name you want to show across your workspace, choose your preferred language, and jump back into the next step quickly.'
              : 'कार्यस्थल पर दिखने वाला नाम बदलें, पसंदीदा भाषा चुनें और अगले कदम पर तुरंत लौटें।'}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr,0.92fr]">
          <div className="route-shell space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                {locale === 'en' ? 'Full name' : 'पूरा नाम'}
              </label>
              <input
                className="input-field mt-2"
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder={locale === 'en' ? 'Your full name' : 'अपना पूरा नाम'}
                value={name}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                {locale === 'en' ? 'Email' : 'ईमेल'}
              </label>
              <input className="input-field mt-2 bg-slate-50" disabled value={user.email} />
              <p className="mt-2 text-xs text-slate-500">
                {locale === 'en'
                  ? 'Email changes are not supported in this release yet.'
                  : 'इस रिलीज़ में अभी ईमेल बदलना समर्थित नहीं है।'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">
                {locale === 'en' ? 'Preferred language' : 'पसंदीदा भाषा'}
              </p>
              <div className="mt-3">
                <LanguageSelect surface="profile" />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="btn-primary"
                disabled={!hasUnsavedChanges || isPending || name.trim().length < 2}
                onClick={saveProfile}
                type="button"
              >
                {isPending
                  ? locale === 'en'
                    ? 'Saving...'
                    : 'सेव हो रहा है...'
                  : locale === 'en'
                    ? 'Save profile'
                    : 'प्रोफ़ाइल सेव करें'}
              </button>
              <Link className="btn-outline" href="/dashboard">
                {locale === 'en' ? 'Back to dashboard' : 'डैशबोर्ड पर वापस'}
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="route-shell">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Current role direction' : 'वर्तमान करियर दिशा'}
              </p>
              <h2 className="mt-3 text-2xl text-slate-950">
                {activeRole ? getLocaleValue(activeRole.name, locale) : '--'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {activeRole
                  ? getLocaleValue(activeRole.summary, locale)
                  : locale === 'en'
                    ? 'Complete your fit check to lock in a role direction.'
                    : 'अपनी योग्यता जाँच पूरी करें, ताकि आपकी करियर दिशा तय हो सके।'}
              </p>
            </div>

            <div className="route-shell">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Quick links' : 'त्वरित लिंक'}
              </p>
              <div className="mt-4 grid gap-3">
                <Link className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/results">
                  {locale === 'en' ? 'Review role matches' : 'उपयुक्त भूमिकाएँ देखें'}
                </Link>
                <Link className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/resume">
                  {locale === 'en' ? 'Open resume workspace' : 'जीवनवृत्त पर काम करें'}
                </Link>
                <Link className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/plan">
                  {locale === 'en' ? 'Open weekly plan' : 'साप्ताहिक योजना खोलें'}
                </Link>
                <Link className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50" href="/applications">
                  {locale === 'en' ? 'Track applications' : 'आवेदन दर्ज करें'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
