'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredLocale,
  getStoredUser,
  setLatestAssessment,
  setSelectedRole,
  setStoredLocale,
} from '@/lib/client-session';
import {
  getLocaleValue,
  getNextQuestions,
  type AssessmentProfile,
  type Locale,
} from '@/lib/product';

export default function CareerFitCheckPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>('en');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<Partial<AssessmentProfile>>({
    fullName: '',
    city: '',
    degreeName: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocale(getStoredLocale());
    const storedUser = getStoredUser();
    // Guard: redirect unauthenticated users to register before they waste 7 minutes
    if (!storedUser) {
      router.replace('/register?next=%2Fcareer-fit-check');
      return;
    }
    setProfile((current) => ({ ...current, fullName: storedUser.name }));
  }, [router]);

  // Adaptive question list — updates as responses come in (tie-breaker + branch)
  const questions = getNextQuestions(responses);
  const QUESTION_COUNT = questions.length;

  const question = questions[currentIndex] ?? questions[0];
  const storedOptionId = responses[question.id] || '';
  const selectedOptionId = question.options.some((option) => option.id === storedOptionId)
    ? storedOptionId
    : '';
  const progress = Math.round(((currentIndex + 1) / QUESTION_COUNT) * 100);
  const isLastQuestion = currentIndex === QUESTION_COUNT - 1;

  const updateLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setStoredLocale(nextLocale);
  };

  const chooseOption = (optionId: string) => {
    setResponses((current) => {
      const next = { ...current, [question.id]: optionId };
      if (question.id.startsWith('r') && question.id !== 'rtb' && question.id !== 'rf') {
        delete next.rtb;
        delete next.b1;
        delete next.b2;
        delete next.b3;
        delete next.b4;
        delete next.rf;
      } else if (question.id === 'rtb') {
        delete next.b1;
        delete next.b2;
        delete next.b3;
        delete next.b4;
        delete next.rf;
      }
      return next;
    });
    setErrorMessage('');
  };

  const goBack = () => {
    if (currentIndex === 0) {
      router.push('/');
      return;
    }

    setCurrentIndex((current) => current - 1);
  };

  const goNext = () => {
    if (!selectedOptionId) {
      setErrorMessage(
        locale === 'en'
          ? 'Choose the option that feels closest to you before continuing.'
          : 'आगे बढ़ने से पहले वही विकल्प चुनें जो आपके सबसे करीब लगता है।'
      );
      return;
    }

    if (!isLastQuestion) {
      setCurrentIndex((current) => current + 1);
      return;
    }

    startTransition(async () => {
      setErrorMessage('');
      const response = await fetch('/api/assessment/fit-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': locale,
        },
        body: JSON.stringify({
          responses,
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
          // Session expired mid-assessment — send to login preserving destination
          router.push('/login?next=%2Fcareer-fit-check');
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
      router.push('/results');
    });
  };

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
                  ? 'Your top matches will be saved to your account for the next steps.'
                  : 'आपकी प्रमुख भूमिकाएँ खाते में सुरक्षित रहेंगी, ताकि आगे की तैयारी वहीं से जारी हो सके।'}
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
                onChange={(event) =>
                  setProfile((current) => ({ ...current, fullName: event.target.value }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({ ...current, educationStream: event.target.value }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({ ...current, city: event.target.value }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({ ...current, degreeName: event.target.value }))
                }
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
                  ? `Question ${currentIndex + 1} of ${QUESTION_COUNT}`
                  : `प्रश्न ${currentIndex + 1} / ${QUESTION_COUNT}`}
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

          <div className="mt-8 space-y-3">
            {question.options.map((option) => {
              const isActive = selectedOptionId === option.id;

              return (
                <button
                  className={`selection-option w-full text-left ${isActive ? 'selection-option--active' : ''}`}
                  key={option.id}
                  onClick={() => chooseOption(option.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-[var(--ink-strong)]">
                        {getLocaleValue(option.label, locale)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">
                        {getLocaleValue(option.signal, locale)}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-5 w-5 rounded-full border ${
                        isActive ? 'border-[var(--accent-ink)] bg-[var(--accent-ink)]' : 'border-[var(--border-soft)]'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-outline" onClick={goBack} type="button">
              {currentIndex === 0
                ? locale === 'en'
                  ? 'Back to landing'
                  : 'लैंडिंग पर वापस'
                : locale === 'en'
                  ? 'Previous question'
                  : 'पिछला प्रश्न'}
            </button>

            <button
              className="btn-primary"
              disabled={isPending}
              onClick={goNext}
              type="button"
            >
              {isPending
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
