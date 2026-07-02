'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { captureProductEvent } from '@/lib/analytics';
import {
  getStoredLocale,
  persistAssessmentFeedback,
  persistSelectedRole,
} from '@/lib/client-session';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import {
  getLocaleValue,
  type AssessmentFeedback,
  type Locale,
  type RoleId,
} from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';

export default function ResultsPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const {
    assessment,
    selectedRoleId: persistedSelectedRoleId,
    feedback,
    loading,
  } = useAssessmentState();

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

  const feedbackOptions: Array<{
    value: AssessmentFeedback;
    label: string;
    helper: string;
  }> = [
    {
      value: 'yes',
      label: locale === 'en' ? 'Yes' : 'हाँ',
      helper: locale === 'en' ? 'This feels right.' : 'यह सही लगता है।',
    },
    {
      value: 'somewhat',
      label: locale === 'en' ? 'Somewhat' : 'कुछ हद तक',
      helper:
        locale === 'en'
          ? 'Partly right, but not exact.'
          : 'कुछ हद तक सही, लेकिन पूरी तरह नहीं।',
    },
    {
      value: 'no',
      label: locale === 'en' ? 'No' : 'नहीं',
      helper: locale === 'en' ? 'This does not feel right.' : 'यह सही नहीं लगता।',
    },
  ];

  async function handleFeedbackSubmit(nextFeedback: AssessmentFeedback) {
    if (savingFeedback || feedback === nextFeedback) return;

    setSavingFeedback(true);
    setFeedbackError(null);
    const persisted = await persistAssessmentFeedback(nextFeedback);

    if (!persisted) {
      setFeedbackError(
        locale === 'en'
          ? 'We could not save your feedback right now. Please try again.'
          : 'अभी आपकी प्रतिक्रिया सहेजी नहीं जा सकी। कृपया फिर से प्रयास करें।'
      );
    } else {
      void captureProductEvent('results_feedback_submitted', {
        feedback: nextFeedback,
        role_id: selectedMatch?.roleId || selectedRoleId,
        cluster: assessment?.cluster,
        confidence_band: assessment?.confidenceBand,
      });
    }

    setSavingFeedback(false);
  }

  const dimensionCards = assessment
    ? [
        {
          label: locale === 'en' ? 'Numbers' : 'संख्यात्मक समझ',
          value: assessment.dimensionSnapshot.numerical,
        },
        {
          label: locale === 'en' ? 'People reactive' : 'लोगों की जरूरत पर प्रतिक्रिया',
          value: assessment.dimensionSnapshot['people-reactive'],
        },
        {
          label: locale === 'en' ? 'People proactive' : 'लोगों के साथ पहल करना',
          value: assessment.dimensionSnapshot['people-proactive'],
        },
        {
          label: locale === 'en' ? 'Structure' : 'व्यवस्था',
          value: assessment.dimensionSnapshot['process-ops'],
        },
        {
          label: locale === 'en' ? 'Creative' : 'रचनात्मकता',
          value: assessment.dimensionSnapshot['creative-output'],
        },
        {
          label: locale === 'en' ? 'Analytical output' : 'विश्लेषण से निकलता काम',
          value: assessment.dimensionSnapshot['analytical-output'],
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
            <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)]">
              {locale === 'en'
                ? 'Complete your fit check to unlock role matches.'
                : 'अपनी योग्यता जाँच पूरी करके उपयुक्त भूमिकाएँ देखें।'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
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
              <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                {assessment.summary[locale]}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                {locale === 'en'
                  ? 'Choose the role you want to build around next. Your selected role will carry into the resume, plan, and dashboard.'
                  : 'अब वह भूमिका चुनें जिसके आधार पर आप आगे बढ़ना चाहते हैं। चुनी हुई भूमिका जीवनवृत्त, योजना और कार्यस्थल में साथ बनी रहेगी।'}
              </p>
            </div>

            <div className="story-card max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Selected direction' : 'चुनी हुई दिशा'}
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--accent-ink)]">
                {selectedMatch ? getLocaleValue(selectedMatch.role.shortLabel, locale) : '--'}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {selectedMatch ? getLocaleValue(selectedMatch.strengthLabel, locale) : '--'}
              </p>
            </div>
          </div>

          {assessment.warning ? (
            <div className="mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {assessment.warning[locale]}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {dimensionCards.map((item) => (
              <div className="metric-tile p-4" key={item.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">{item.value}%</p>
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
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-saffron)] text-base font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="text-2xl text-[var(--brand-ink)]">
                          {getLocaleValue(match.role.name, locale)}
                        </h2>
                        <p className="text-sm text-[var(--ink-muted)]">
                          {getLocaleValue(match.role.salaryRange, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-[var(--wash-forest)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                        {getLocaleValue(match.strengthLabel, locale)}
                      </span>
                      <p className="mt-2 text-sm font-semibold text-[var(--ink-soft)]">
                        {locale === 'en'
                          ? `Evidence confidence: ${assessment.confidenceBand}`
                          : `प्रमाण का भरोसा: ${
                              assessment.confidenceBand === 'high'
                                ? 'उच्च'
                                : assessment.confidenceBand === 'medium'
                                  ? 'मध्यम'
                                  : 'कम'
                            }`}
                      </p>
                    </div>
                  </div>

                  <div className="step-panel mt-4">
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">
                      {locale === 'en' ? 'Why this fits' : 'यह भूमिका क्यों उपयुक्त है'}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      {match.rationale[locale]}
                    </p>
                  </div>

                  {match.eligibility !== 'ready' && match.eligibilityReasons.length > 0 ? (
                    <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                      <p className="text-sm font-semibold">
                        {locale === 'en' ? 'Check before applying' : 'आवेदन से पहले जांचें'}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm leading-6">
                        {match.eligibilityReasons.map((reason) => (
                          <li key={reason}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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
                          if (!isSelected) {
                            void captureProductEvent('results_role_selected', {
                              role_id: match.roleId,
                              rank: index + 1,
                              cluster: assessment.cluster,
                              confidence_band: assessment.confidenceBand,
                            });
                          }
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
              <h2 className="mt-4 text-3xl leading-tight text-[var(--ink-strong)]">
                {selectedMatch
                  ? getLocaleValue(selectedMatch.role.shortLabel, locale)
                  : locale === 'en'
                    ? 'Choose a role'
                    : 'एक भूमिका चुनें'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
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

            <div className="route-shell bg-white/90">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Quick feedback' : 'त्वरित प्रतिक्रिया'}
              </p>
              <h2 className="mt-4 text-2xl leading-tight text-[var(--ink-strong)]">
                {locale === 'en'
                  ? 'Did these results feel right?'
                  : 'क्या ये परिणाम आपको सही लगे?'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {locale === 'en'
                  ? 'Your answer helps us improve future role matches.'
                  : 'आपका जवाब भविष्य के role matches को बेहतर बनाने में मदद करता है।'}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {feedbackOptions.map((option) => {
                  const isActive = feedback === option.value;
                  return (
                    <button
                      aria-pressed={isActive}
                      className={isActive ? 'btn-primary w-full justify-center' : 'btn-outline w-full'}
                      disabled={savingFeedback}
                      key={option.value}
                      onClick={() => {
                        void handleFeedbackSubmit(option.value);
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 min-h-[1.5rem]">
                {feedback ? (
                  <p className="text-sm text-[var(--ink-soft)]">
                    {locale === 'en'
                      ? `Saved: ${feedbackOptions.find((option) => option.value === feedback)?.helper || ''}`
                      : `सहेजा गया: ${feedbackOptions.find((option) => option.value === feedback)?.helper || ''}`}
                  </p>
                ) : null}
                {feedbackError ? (
                  <p className="text-sm text-rose-700" role="alert">
                    {feedbackError}
                  </p>
                ) : null}
              </div>
            </div>

            {assessment.adjacentRoles?.length ? (
              <div className="route-shell bg-white/90">
                <p className="eyebrow-copy">
                  {locale === 'en' ? 'Adjacent directions' : 'आस-पास की दिशाएं'}
                </p>
                <h2 className="mt-4 text-2xl leading-tight text-[var(--ink-strong)]">
                  {locale === 'en'
                    ? 'Related roles to explore separately'
                    : 'अलग से देखने लायक संबंधित भूमिकाएं'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {locale === 'en'
                    ? 'These are nearby candidate roles, not your main shortlist. Treat them as exploration ideas after the core directions above.'
                    : 'ये पास की candidate भूमिकाएं हैं, आपकी मुख्य shortlist नहीं। ऊपर की core दिशाओं के बाद इन्हें exploration ideas की तरह देखें।'}
                </p>

                <div className="mt-5 space-y-3">
                  {assessment.adjacentRoles.map((match, index) => (
                    <div
                      className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3"
                      key={match.roleId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--brand-ink)]">
                            {index + 1}. {getLocaleValue(match.role.name, locale)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                            {getLocaleValue(match.role.summary, locale)}
                          </p>
                        </div>
                        {match.eligibility !== 'ready' ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                            {locale === 'en' ? 'Needs verification' : 'जांच जरूरी'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
