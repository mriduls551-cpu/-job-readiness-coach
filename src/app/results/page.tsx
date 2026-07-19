'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getStoredLocale,
  persistSelectedRole,
} from '@/lib/client-session';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { captureProductEvent } from '@/lib/analytics';
import { AssessmentFeedbackCard } from '@/components/results/AssessmentFeedbackCard';
import { ShareResultCard } from '@/components/results/ShareResultCard';
import { ResultsDecisionFork } from '@/components/results/ResultsDecisionFork';
import { getLocaleValue, type Locale, type RoleId, type RoleMatch } from '@/lib/product';
import { useAppStore } from '@/lib/store';
import { FullPageLoader } from '@/components/FullPageLoader';

export default function ResultsPage() {
  // Store is the single source of truth for locale; it updates live when the
  // user switches language anywhere in the app (LanguageSelect → setStoredLocale → store).
  const locale: Locale = useAppStore((state) => state.locale);
  const [localeReady, setLocaleReady] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<RoleId | null>(null);
  const [showDemotedShelf, setShowDemotedShelf] = useState(false);
  const { assessment, selectedRoleId: persistedSelectedRoleId, loading } = useAssessmentState();
  const hasTrackedResultsView = useRef(false);

  useEffect(() => {
    // Hydrate from localStorage on mount so a persisted locale survives reload
    // regardless of whether SessionBootstrap's effect has run yet.
    useAppStore.setState({ locale: getStoredLocale() });
    setLocaleReady(true);
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

  const rankedRoles = assessment?.rankedRoles?.length
    ? assessment.rankedRoles
    : assessment?.topRoles || [];
  const remainingRoles = rankedRoles.slice(3);
  const educationDemotedRoles = remainingRoles.filter((match) => match.backgroundFit?.educationDemoted);
  const strongBackgroundRoles = remainingRoles.filter(
    (match) =>
      !match.backgroundFit?.educationDemoted &&
      match.eligibility !== 'conditional' &&
      match.backgroundFit?.streamRelevant &&
      match.backgroundFit?.levelCoherent
  );
  const alsoOpenRoles = remainingRoles.filter(
    (match) =>
      !match.backgroundFit?.educationDemoted &&
      !strongBackgroundRoles.some((strongMatch) => strongMatch.roleId === match.roleId)
  );

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

  useEffect(() => {
    if (!assessment || !selectedMatch || !localeReady || hasTrackedResultsView.current) {
      return;
    }

    hasTrackedResultsView.current = true;
    void captureProductEvent('results_viewed', {
      locale,
      selected_role_id: selectedMatch.roleId,
      confidence_band: assessment.confidenceBand,
      scoring_version: assessment.scoringVersion,
    });
  }, [assessment, locale, localeReady, selectedMatch]);

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

  const renderShelfRole = (match: RoleMatch) => (
    <article className="step-panel" key={match.roleId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--brand-ink)]">
            {getLocaleValue(match.role.name, locale)}
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {getLocaleValue(match.role.salaryRange, locale)}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
          {match.score}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
        {match.rationale[locale]}
      </p>
      {match.eligibilityReasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm leading-6 text-amber-950">
          {match.eligibilityReasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );

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

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
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

            <section className="space-y-4">
              <div>
                <p className="eyebrow-copy">
                  {locale === 'en'
                    ? 'Strong fits for your background'
                    : 'आपकी पृष्ठभूमि के लिए मजबूत विकल्प'}
                </p>
                <div className="mt-3 space-y-3">
                  {strongBackgroundRoles.length > 0 ? (
                    strongBackgroundRoles.map(renderShelfRole)
                  ) : (
                    <div className="step-panel text-sm text-[var(--ink-muted)]">
                      {locale === 'en'
                        ? 'Your top three already carry the strongest background-fit signals.'
                        : 'आपके शीर्ष तीन विकल्पों में ही सबसे मजबूत background-fit संकेत हैं।'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="eyebrow-copy">
                  {locale === 'en' ? 'Also open to you' : 'आपके लिए अन्य खुले विकल्प'}
                </p>
                <div className="mt-3 space-y-3">
                  {alsoOpenRoles.length > 0 ? (
                    alsoOpenRoles.map(renderShelfRole)
                  ) : (
                    <div className="step-panel text-sm text-[var(--ink-muted)]">
                      {locale === 'en'
                        ? 'No extra non-conditional roles are available beyond the stronger matches above.'
                        : 'ऊपर के मजबूत विकल्पों के अलावा कोई अतिरिक्त non-conditional भूमिका उपलब्ध नहीं है।'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  aria-expanded={showDemotedShelf}
                  className="flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-950"
                  onClick={() => setShowDemotedShelf((value) => !value)}
                  type="button"
                >
                  <span>
                    {locale === 'en' ? 'Shown on request' : 'अनुरोध पर दिखाए गए विकल्प'}
                  </span>
                  <span>{showDemotedShelf ? '−' : '+'}</span>
                </button>
                {showDemotedShelf ? (
                  <div className="mt-3 space-y-3">
                    {educationDemotedRoles.length > 0 ? (
                      educationDemotedRoles.map(renderShelfRole)
                    ) : (
                      <div className="step-panel text-sm text-[var(--ink-muted)]">
                        {locale === 'en'
                          ? 'No role was demoted for education fit in this result.'
                          : 'इस परिणाम में शिक्षा-फिट के कारण कोई भूमिका नीचे नहीं की गई।'}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            {selectedMatch ? (
              <>
                <ResultsDecisionFork locale={locale} selectedMatch={selectedMatch} />
                <ShareResultCard
                  assessment={assessment}
                  locale={locale}
                  selectedMatch={selectedMatch}
                />
              </>
            ) : null}

            <AssessmentFeedbackCard locale={locale} />
          </aside>
        </section>
      </div>
    </main>
  );
}
