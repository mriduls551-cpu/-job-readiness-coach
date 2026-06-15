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
  const selectedOptionId = responses[question.id] || '';
  const progress = Math.round(((currentIndex + 1) / QUESTION_COUNT) * 100);
  const isLastQuestion = currentIndex === QUESTION_COUNT - 1;

  const updateLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setStoredLocale(nextLocale);
  };

  const chooseOption = (optionId: string) => {
    setResponses((current) => ({
      ...current,
      [question.id]: optionId,
    }));
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
              <h1 className="mt-3 text-4xl leading-tight text-slate-950">
                {locale === 'en'
                  ? 'A focused fit-check for realistic first jobs.'
                  : 'वास्तविक शुरुआती नौकरियों के लिए एक केंद्रित योग्यता जाँच।'}
              </h1>
            </div>
            <div className="flex rounded-full border border-slate-200 bg-white p-1">
              {(['en', 'hi'] as const).map((item) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    locale === item ? 'bg-[#0a5a60] text-white' : 'text-slate-600'
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

          <p className="mt-5 text-base leading-8 text-slate-600">
            {locale === 'en'
              ? 'We are using a tighter MVP role set: support, operations, MIS, finance, HR, counselling, marketing, content, healthcare coordination, and compliance.'
              : 'यह जाँच ग्राहक सहायता, संचालन, सूचना प्रबंधन, वित्त, मानव संसाधन, परामर्श, विपणन, लेखन, स्वास्थ्य समन्वय और अनुपालन जैसी शुरुआती भूमिकाओं पर केंद्रित है।'}
          </p>

          <div className="story-card mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0a5a60]">
              {locale === 'en' ? 'Why this is different' : 'यह अलग क्यों है'}
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <li>
                {locale === 'en'
                  ? 'Role matches come from a deterministic scoring engine, not AI guessing.'
                  : 'भूमिकाओं के सुझाव तय मानदंडों पर आधारित हैं, कृत्रिम बुद्धिमत्ता के अनुमान पर नहीं।'}
              </li>
              <li>
                {locale === 'en'
                  ? 'A few direct-choice questions are included to reduce gaming.'
                  : 'अधिक सटीक उत्तरों के लिए कुछ सीधे विकल्प वाले प्रश्न भी शामिल हैं।'}
              </li>
              <li>
                {locale === 'en'
                  ? 'Your top matches will be saved to your account for the next steps.'
                  : 'आपकी प्रमुख भूमिकाएँ खाते में सुरक्षित रहेंगी, ताकि आगे की तैयारी वहीं से जारी हो सके।'}
              </li>
            </ul>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <label className="metric-tile space-y-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
              <h2 className="mt-3 text-3xl leading-tight text-slate-950">
                {getLocaleValue(question.prompt, locale)}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {getLocaleValue(question.helper, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#0a5a60]">
                {locale === 'en'
                  ? `Question ${currentIndex + 1} of ${QUESTION_COUNT}`
                  : `प्रश्न ${currentIndex + 1} / ${QUESTION_COUNT}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {locale === 'en' ? 'About 3 to 5 minutes' : 'लगभग 3 से 5 मिनट'}
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 rounded-full bg-[#e6ece9]">
            <div
              className="h-3 rounded-full bg-[#0a5a60] transition-all"
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
                      <p className="text-base font-semibold text-slate-950">
                        {getLocaleValue(option.label, locale)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {getLocaleValue(option.signal, locale)}
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-5 w-5 rounded-full border ${
                        isActive ? 'border-[#0a5a60] bg-[#0a5a60]' : 'border-slate-300'
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
