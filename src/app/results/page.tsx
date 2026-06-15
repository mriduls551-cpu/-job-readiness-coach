'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getStoredLocale,
  persistSelectedRole,
} from '@/lib/client-session';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { getLocaleValue, type Locale, type RoleId } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';

export default function ResultsPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId | null>(null);
  const { assessment, selectedRoleId: persistedSelectedRoleId, loading } = useAssessmentState();

  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);

  useEffect(() => {
    setSelectedRoleId(persistedSelectedRoleId);
  }, [persistedSelectedRoleId]);

  const selectedMatch = useMemo(() => {
    if (!assessment?.topRoles?.length) return null;
    return (
      assessment.topRoles.find((match) => match.roleId === selectedRoleId) ||
      assessment.topRoles[0]
    );
  }, [assessment, selectedRoleId]);

  const dimensionCards = assessment
    ? [
        {
          label: locale === 'en' ? 'Numbers' : 'संख्यात्मक समझ',
          value: assessment.dimensionSnapshot.numerical,
        },
        {
          label: locale === 'en' ? 'People' : 'लोगों से संवाद',
          value:
            assessment.dimensionSnapshot['people-reactive'] +
            assessment.dimensionSnapshot['people-proactive'],
        },
        {
          label: locale === 'en' ? 'Structure' : 'व्यवस्था',
          value: assessment.dimensionSnapshot['process-ops'],
        },
        {
          label: locale === 'en' ? 'Creative' : 'रचनात्मकता',
          value: assessment.dimensionSnapshot['creative-output'],
        },
      ]
    : [];

  if (loading) {
    return (
      <FullPageLoader
        eyebrow="Fit-check results"
        title="Loading your role matches…"
        message="We’re restoring your saved assessment and current role selection."
      />
    );
  }

  if (!assessment?.topRoles?.length) {
    return (
      <main className="section-shell">
        <div className="container-main max-w-3xl">
          <section className="workspace-hero">
            <p className="eyebrow-copy">
              {locale === 'en' ? 'Results unavailable' : 'परिणाम उपलब्ध नहीं हैं'}
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-slate-950">
              {locale === 'en'
                ? 'Complete your fit check to unlock role matches.'
                : 'अपनी योग्यता जाँच पूरी करके उपयुक्त भूमिकाएँ देखें।'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              {locale === 'en'
                ? 'We could not find a saved assessment in this session yet.'
                : 'इस सत्र में अभी कोई पूरी की हुई योग्यता जाँच नहीं मिली।'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/career-fit-check">
                {locale === 'en' ? 'Start fit check' : 'योग्यता जाँच शुरू करें'}
              </Link>
              <Link className="btn-outline" href="/">
                {locale === 'en' ? 'Back to home' : 'होम पर वापस जाएं'}
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-6">
        <section className="workspace-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Your fit-check results' : 'आपकी योग्यता जाँच के परिणाम'}
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-slate-950 sm:text-5xl">
                {assessment.summary[locale]}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {locale === 'en'
                  ? 'Choose the role you want to build around next. Your selected role will carry into the resume, plan, and dashboard.'
                  : 'अब वह भूमिका चुनें जिसके आधार पर आप आगे बढ़ना चाहते हैं। चुनी हुई भूमिका जीवनवृत्त, योजना और कार्यस्थल में साथ बनी रहेगी।'}
              </p>
            </div>

            <div className="story-card max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Selected direction' : 'चुनी हुई दिशा'}
              </p>
              <p className="mt-3 text-2xl font-semibold text-[#0a5a60]">
                {selectedMatch ? getLocaleValue(selectedMatch.role.shortLabel, locale) : '--'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {selectedMatch ? getLocaleValue(selectedMatch.strengthLabel, locale) : '--'}
              </p>
            </div>
          </div>

          {assessment.warning ? (
            <div className="mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {assessment.warning[locale]}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {dimensionCards.map((item) => (
              <div className="metric-tile p-4" key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{item.value}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.08fr,0.92fr]">
          <div className="space-y-4">
            {assessment.topRoles.map((match, index) => {
              const isSelected = selectedMatch?.roleId === match.roleId;
              return (
                <article
                  className={`match-card ${isSelected ? 'match-card--active' : ''}`}
                  key={match.roleId}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d97b2f] text-base font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="text-2xl text-[#103f44]">
                          {getLocaleValue(match.role.name, locale)}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {getLocaleValue(match.role.salaryRange, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-[#e8f7ed] px-3 py-1 text-xs font-semibold text-[#18794e]">
                        {getLocaleValue(match.strengthLabel, locale)}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {locale === 'en' ? 'Match score' : 'उपयुक्तता अंक'}: {match.score}
                      </p>
                    </div>
                  </div>

                  <div className="step-panel mt-4">
                    <p className="text-sm font-semibold text-[#103f44]">
                      {locale === 'en' ? 'Why this fits' : 'यह भूमिका क्यों उपयुक्त है'}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {match.rationale[locale]}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {match.supportingSignals.map((signal) => (
                      <span className="accent-chip" key={`${match.roleId}-${signal.en}`}>
                        {getLocaleValue(signal, locale)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className={isSelected ? 'btn-outline' : 'btn-primary'}
                      onClick={async () => {
                        setSelectedRoleId(match.roleId);
                        try {
                          await persistSelectedRole(match.roleId);
                        } catch {
                          setSelectedRoleId(persistedSelectedRoleId);
                        }
                      }}
                      type="button"
                    >
                      {isSelected
                        ? locale === 'en'
                          ? 'Selected role'
                          : 'चुनी हुई भूमिका'
                        : locale === 'en'
                          ? 'Choose this role'
                          : 'यह भूमिका चुनें'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="space-y-5">
            <div className="route-shell bg-white/90">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Next step' : 'अगला कदम'}
              </p>
              <h2 className="mt-4 text-3xl leading-tight text-slate-950">
                {selectedMatch
                  ? getLocaleValue(selectedMatch.role.shortLabel, locale)
                  : locale === 'en'
                    ? 'Choose a role'
                    : 'एक भूमिका चुनें'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedMatch
                  ? getLocaleValue(selectedMatch.role.summary, locale)
                  : locale === 'en'
                    ? 'Pick one role so your resume and weekly plan can stay consistent.'
                    : 'एक भूमिका चुनें, ताकि आपका जीवनवृत्त और साप्ताहिक योजना एक ही दिशा में रहें।'}
              </p>

              <div className="mt-5 space-y-3">
                <Link className="btn-primary w-full justify-center" href="/resume">
                  {locale === 'en' ? 'Continue to resume' : 'जीवनवृत्त पर आगे बढ़ें'}
                </Link>
                <Link className="btn-secondary w-full justify-center" href="/dashboard">
                  {locale === 'en' ? 'Open dashboard' : 'कार्यस्थल खोलें'}
                </Link>
                <button
                  className="btn-outline w-full"
                  onClick={() => router.push('/career-fit-check')}
                  type="button"
                >
                  {locale === 'en' ? 'Retake fit check' : 'योग्यता जाँच फिर से करें'}
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
