'use client';

import { Suspense, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getStoredUser,
  getStoredLocale,
  setLatestAssessment,
  setSelectedRole,
  setStoredLocale,
} from '@/lib/client-session';
import {
  getLocaleValue,
  getNextQuestions,
  pruneOrphanResponses,
  type AssessmentProfile,
  type Locale,
} from '@/lib/product';
import { captureProductEvent } from '@/lib/analytics';
import { useFitCheckDraftStore } from '@/lib/stores/fitcheck-draft';

function CareerFitCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    hydrated,
    locale,
    currentIndex,
    responses,
    profile,
    updatedAt,
    setDraft,
    hydrateDraft,
    clearDraft,
  } = useFitCheckDraftStore((state) => state);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasBootstrapped = useRef(false);
  const hasTrackedStart = useRef(false);
  const hasAttemptedResumeSubmit = useRef(false);

  // No auth wall here: the fit check is answerable anonymously; an account is
  // asked for at the results/save step (submit) only.
  useEffect(() => {
    if (!hydrated || hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;

    const storedUser = getStoredUser();
    const storedLocale = getStoredLocale();
    const normalizedResponses = pruneOrphanResponses(responses);
    const responsesChanged =
      Object.keys(normalizedResponses).length !== Object.keys(responses).length ||
      Object.entries(normalizedResponses).some(
        ([questionId, optionId]) => responses[questionId] !== optionId
      );
    const normalizedQuestions = getNextQuestions(normalizedResponses);
    const normalizedIndex = Math.min(currentIndex, Math.max(normalizedQuestions.length - 1, 0));
    const effectiveLocale = updatedAt ? locale : storedLocale;
    const nextProfile: Partial<AssessmentProfile> =
      !profile.fullName && storedUser?.name ? { ...profile, fullName: storedUser.name } : profile;

    if (
      responsesChanged ||
      normalizedIndex !== currentIndex ||
      effectiveLocale !== locale ||
      nextProfile.fullName !== profile.fullName
    ) {
      hydrateDraft({
        responses: normalizedResponses,
        currentIndex: normalizedIndex,
        locale: effectiveLocale,
        profile: nextProfile,
      });
    }

    setStoredLocale(effectiveLocale);

    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      void captureProductEvent('assessment_start', {
        locale: effectiveLocale,
        authenticated: Boolean(storedUser),
        resumed: Boolean(updatedAt || Object.keys(normalizedResponses).length > 0),
      });
    }
  }, [currentIndex, hydrateDraft, hydrated, locale, profile, responses, updatedAt]);

  // Adaptive question list — updates as responses come in (tie-breaker + branch)
  const questions = getNextQuestions(responses);
  const QUESTION_COUNT = questions.length;
  const safeCurrentIndex = Math.min(currentIndex, Math.max(QUESTION_COUNT - 1, 0));

  const question = questions[safeCurrentIndex] ?? questions[0];
  const storedOptionId = responses[question.id] || '';
  const selectedOptionId = question.options.some((option) => option.id === storedOptionId)
    ? storedOptionId
    : '';
  const progress = Math.round(((safeCurrentIndex + 1) / QUESTION_COUNT) * 100);
  const isLastQuestion = safeCurrentIndex === QUESTION_COUNT - 1;
  const replayAfterAuthPath = '/career-fit-check?resume=1';
  const canonicalResponses = pruneOrphanResponses(responses);
  const activeQuestions = getNextQuestions(canonicalResponses);
  const isDraftComplete = activeQuestions.every((item) => Boolean(canonicalResponses[item.id]));
  const shouldReplayAfterAuth = searchParams.get('resume') === '1';

  useEffect(() => {
    if (hydrated && currentIndex !== safeCurrentIndex) {
      hydrateDraft({ currentIndex: safeCurrentIndex });
    }
  }, [currentIndex, hydrated, hydrateDraft, safeCurrentIndex]);

  const updateLocale = (nextLocale: Locale) => {
    setDraft({ locale: nextLocale });
    setStoredLocale(nextLocale);
  };

  const updateProfile = (patch: Partial<AssessmentProfile>) => {
    setDraft({ profile: { ...profile, ...patch } });
  };

  const chooseOption = (optionId: string) => {
    const currentQuestionId = question.id;
    const nextResponses = pruneOrphanResponses({ ...responses, [currentQuestionId]: optionId });
    const nextQuestions = getNextQuestions(nextResponses);
    const nextIndex = nextQuestions.findIndex((item) => item.id === currentQuestionId);
    setDraft({
      responses: nextResponses,
      currentIndex: nextIndex === -1 ? 0 : Math.min(nextIndex, nextQuestions.length - 1),
    });
    void captureProductEvent('question_answered', {
      locale,
      question_id: currentQuestionId,
      question_index: safeCurrentIndex + 1,
      option_id: optionId,
    });
    setErrorMessage('');
  };

  const goBack = () => {
    if (safeCurrentIndex === 0) {
      router.push('/');
      return;
    }

    setDraft({ currentIndex: safeCurrentIndex - 1 });
  };

  const submitAssessment = useCallback(async () => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      // Value before wall: answers stay in the persisted draft across the
      // register round-trip, then ?resume=1 replays the submit.
      router.push(`/register?next=${encodeURIComponent(replayAfterAuthPath)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      setErrorMessage('');
      const response = await fetch('/api/assessment/fit-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': locale,
        },
        body: JSON.stringify({
          responses: canonicalResponses,
          profile: {
            fullName: profile.fullName?.trim(),
            city: profile.city?.trim(),
            degreeName: profile.degreeName?.trim(),
            educationStream: profile.educationStream || undefined,
            locale,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired mid-assessment — draft survives the login round-trip
          router.push(`/login?next=${encodeURIComponent(replayAfterAuthPath)}`);
          return;
        }
        setErrorMessage(
          locale === 'en'
            ? 'We could not score your fit-check right now. Please try again.'
            : 'अभी आपके उत्तरों का मूल्यांकन नहीं हो सका। कृपया दोबारा प्रयास करें।'
        );
        return;
      }

      const payload = (await response.json()) as {
        data?: {
          result: any;
        };
      };

      const result = payload.data?.result;
      if (!result?.topRoles?.length) {
        setErrorMessage(
          locale === 'en'
            ? 'We need a few more details before showing your top matches.'
            : 'उपयुक्त भूमिकाएँ दिखाने से पहले हमें कुछ और जानकारी चाहिए।'
        );
        return;
      }

      setLatestAssessment(result);
      setSelectedRole(result.topRoles[0].roleId);
      void captureProductEvent('assessment_complete', {
        locale,
        selected_role_id: result.topRoles[0].roleId,
        confidence_band: result.confidenceBand,
        question_count: QUESTION_COUNT,
      });
      clearDraft();
      router.push('/results');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    QUESTION_COUNT,
    canonicalResponses,
    clearDraft,
    locale,
    profile.city,
    profile.degreeName,
    profile.educationStream,
    profile.fullName,
    replayAfterAuthPath,
    router,
  ]);

  const goNext = () => {
    if (isPending || isSubmitting) {
      return;
    }

    if (!selectedOptionId) {
      setErrorMessage(
        locale === 'en'
          ? 'Choose the option that feels closest to you before continuing.'
          : 'आगे बढ़ने से पहले वही विकल्प चुनें जो आपके सबसे करीब लगता है।'
      );
      return;
    }

    if (!isLastQuestion) {
      setDraft({ currentIndex: safeCurrentIndex + 1 });
      return;
    }

    startTransition(() => {
      void submitAssessment();
    });
  };

  // Returning from register/login with a complete draft: submit it once.
  useEffect(() => {
    if (
      !hydrated ||
      !shouldReplayAfterAuth ||
      !isDraftComplete ||
      !getStoredUser() ||
      hasAttemptedResumeSubmit.current
    ) {
      return;
    }

    hasAttemptedResumeSubmit.current = true;
    startTransition(() => {
      void submitAssessment();
    });
  }, [hydrated, isDraftComplete, shouldReplayAfterAuth, submitAssessment]);

  if (!hydrated) {
    return (
      <main className="section-shell">
        <div className="container-main">
          <section className="route-shell">
            <p className="text-sm text-[var(--ink-soft)]">
              Loading your saved progress...
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main grid gap-6 lg:grid-cols-[0.82fr,1.18fr]">
        <aside className="workspace-hero">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Career fit check' : 'करियर योग्यता जाँच'}
              </p>
              <h1 className="mt-3 text-4xl leading-tight text-[var(--ink-strong)]">
                {locale === 'en'
                  ? 'A focused fit-check for realistic first jobs.'
                  : 'वास्तविक शुरुआती नौकरियों के लिए एक केंद्रित योग्यता जाँच।'}
              </h1>
            </div>
            <div className="flex rounded-full border border-[var(--border-soft)] bg-white p-1">
              {(['en', 'hi'] as const).map((item) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    locale === item ? 'bg-[var(--accent-ink)] text-white' : 'text-[var(--ink-soft)]'
                  }`}
                  key={item}
                  onClick={() => updateLocale(item)}
                  type="button"
                >
                  {item === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-base leading-8 text-[var(--ink-soft)]">
            {locale === 'en'
              ? 'This fit check now weighs practical constraints, realistic work scenarios, and small proof signals before suggesting entry-level directions.'
              : 'यह fit check अब शुरुआती भूमिकाएँ सुझाने से पहले practical constraints, realistic work scenarios और छोटे proof signals को साथ में देखता है।'}
          </p>

          <div className="story-card mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-ink)]">
              {locale === 'en' ? 'Why this is different' : 'यह अलग क्यों है'}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
              <li>
                {locale === 'en'
                  ? 'Role matches come from a deterministic scoring engine, not AI guessing.'
                  : 'भूमिकाओं के सुझाव तय मानदंडों पर आधारित हैं, कृत्रिम बुद्धिमत्ता के अनुमान पर नहीं।'}
              </li>
              <li>
                {locale === 'en'
                  ? 'The questions separate feasibility, judgment, and evidence instead of asking only what sounds interesting.'
                  : 'प्रश्न सिर्फ पसंद नहीं पूछते; वे feasibility, judgment और evidence को अलग-अलग देखते हैं।'}
              </li>
              <li>
                {locale === 'en'
                  ? 'Small proof checks, like data accuracy or written replies, help us avoid weak self-reporting.'
                  : 'data accuracy या written reply जैसे छोटे proof checks weak self-reporting से बचाने में मदद करते हैं।'}
              </li>
              <li>
                {locale === 'en'
                  ? 'Answer without an account — your progress saves on this device, and you create an account only to see and keep your results.'
                  : 'बिना खाते के उत्तर दें — आपकी प्रगति इसी डिवाइस पर सुरक्षित रहती है, और खाता केवल परिणाम देखने और सहेजने के लिए बनाना होगा।'}
              </li>
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="metric-tile space-y-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Name' : 'नाम'}
              </span>
              <input
                className="input-field"
                onChange={(event) => updateProfile({ fullName: event.target.value })}
                aria-label={locale === 'en' ? 'Full name' : 'पूरा नाम'}
                placeholder={locale === 'en' ? 'Your full name' : 'आपका पूरा नाम'}
                value={profile.fullName || ''}
              />
            </label>
            <label className="metric-tile space-y-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Education stream' : 'शिक्षा क्षेत्र'}
              </span>
              <select
                className="input-field"
                onChange={(event) => updateProfile({ educationStream: event.target.value })}
                value={profile.educationStream || ''}
              >
                <option value="">{locale === 'en' ? 'Prefer not to say' : 'नहीं बताना चाहता/चाहती'}</option>
                <option value="commerce">{locale === 'en' ? 'Commerce' : 'कॉमर्स'}</option>
                <option value="management">{locale === 'en' ? 'Management' : 'मैनेजमेंट'}</option>
                <option value="arts-humanities">{locale === 'en' ? 'Arts / Humanities' : 'कला / मानविकी'}</option>
                <option value="science">{locale === 'en' ? 'Science' : 'विज्ञान'}</option>
                <option value="healthcare">{locale === 'en' ? 'Healthcare' : 'स्वास्थ्य सेवा'}</option>
                <option value="law">{locale === 'en' ? 'Law' : 'कानून'}</option>
                <option value="open">{locale === 'en' ? 'Other / open' : 'अन्य / खुला'}</option>
              </select>
            </label>
            <label className="metric-tile space-y-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'City' : 'शहर'}
              </span>
              <input
                className="input-field"
                onChange={(event) => updateProfile({ city: event.target.value })}
                aria-label={locale === 'en' ? 'City' : 'शहर'}
                placeholder={locale === 'en' ? 'Your city' : 'आपका शहर'}
                value={profile.city || ''}
              />
            </label>
            <label className="metric-tile space-y-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Degree' : 'शैक्षणिक योग्यता'}
              </span>
              <input
                className="input-field"
                onChange={(event) => updateProfile({ degreeName: event.target.value })}
                aria-label={locale === 'en' ? 'Degree' : 'शैक्षणिक योग्यता'}
                placeholder={locale === 'en' ? 'Your degree' : 'अपनी योग्यता लिखें'}
                value={profile.degreeName || ''}
              />
            </label>
          </div>
        </aside>

        <section className="route-shell">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow-copy">{getLocaleValue(question.section, locale)}</p>
              <h2 className="mt-3 text-3xl leading-tight text-[var(--ink-strong)]">
                {getLocaleValue(question.prompt, locale)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                {getLocaleValue(question.helper, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--accent-ink)]">
                {locale === 'en'
                  ? `Question ${safeCurrentIndex + 1} of ${QUESTION_COUNT}`
                  : `प्रश्न ${safeCurrentIndex + 1} / ${QUESTION_COUNT}`}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {locale === 'en' ? 'About 3 to 5 minutes' : 'लगभग 3 से 5 मिनट'}
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 rounded-full bg-[var(--border-soft)]">
            <div
              className="h-3 rounded-full bg-[var(--accent-ink)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <RadioGroup.Root
            aria-label={getLocaleValue(question.prompt, locale)}
            className="mt-8 space-y-3"
            onValueChange={chooseOption}
            value={selectedOptionId}
          >
            {question.options.map((option) => {
              const isActive = selectedOptionId === option.id;

              return (
                <RadioGroup.Item
                  className={`selection-option flex w-full items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ink)] focus-visible:ring-offset-2 ${
                    isActive ? 'selection-option--active' : ''
                  }`}
                  id={option.id}
                  key={option.id}
                  value={option.id}
                >
                  <div>
                    <p className="text-base font-semibold text-[var(--ink-strong)]">
                      {getLocaleValue(option.label, locale)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      {getLocaleValue(option.signal, locale)}
                    </p>
                  </div>
                  <div
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                      isActive ? 'border-[var(--accent-ink)] bg-[var(--accent-ink)]' : 'border-[var(--border-soft)] bg-white'
                    }`}
                  >
                    <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-white" />
                  </div>
                </RadioGroup.Item>
              );
            })}
          </RadioGroup.Root>

          {errorMessage ? (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-outline" onClick={goBack} type="button">
              {safeCurrentIndex === 0
                ? locale === 'en'
                  ? 'Back to landing'
                  : 'लैंडिंग पर वापस'
                : locale === 'en'
                  ? 'Previous question'
                  : 'पिछला प्रश्न'}
            </button>

            <button
              className="btn-primary"
              disabled={isPending || isSubmitting}
              onClick={goNext}
              type="button"
            >
              {isPending || isSubmitting
                ? locale === 'en'
                  ? 'Scoring your fit...'
                  : 'आपके उत्तरों का मूल्यांकन किया जा रहा है...'
                : isLastQuestion
                  ? locale === 'en'
                    ? 'See my top matches'
                    : 'मेरी उपयुक्त भूमिकाएँ देखें'
                  : locale === 'en'
                    ? 'Next question'
                    : 'अगला प्रश्न'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CareerFitCheckPage() {
  return (
    <Suspense
      fallback={
        <main className="section-shell">
          <div className="container-main text-sm text-[var(--ink-muted)]">
            Loading your saved progress...
          </div>
        </main>
      }
    >
      <CareerFitCheckContent />
    </Suspense>
  );
}
