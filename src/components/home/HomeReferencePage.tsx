'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import {
  setStoredLocale,
} from '@/lib/client-session';
import { useAppStore } from '@/lib/store';
import { getFirstName } from '@/lib/presentation';

type Locale = 'en' | 'hi';
type Focus = 'clarity' | 'resume' | 'action';

const copy = {
  en: {
    title: 'Your first job should not feel like a guessing game.',
    accent: 'Find a direction, then build toward it.',
    subtitle:
      'Answer a few practical questions and get realistic role matches, a focused resume, a weekly plan, and interview preparation that stay connected.',
    primaryGuest: 'Find my best-fit roles',
    primaryUser: 'Continue my journey',
    secondaryGuest: 'Sign in',
    secondaryUser: 'Open my workspace',
    note: 'Free to use. About 5 minutes to your first useful recommendation.',
    greeting: 'Welcome back',
    question: 'What would help most today?',
    trust: ['Built for first-job seekers', 'English and Hindi', 'Progress stays connected'],
    focus: {
      clarity: {
        label: 'I need career clarity',
        eyebrow: 'Start with direction',
        title: 'See roles that match how you naturally work.',
        body: 'The fit check looks at people skills, structure, numbers, and creative work. You get clear reasons, not a mystery score.',
        action: 'Take the career fit check',
        href: '/career-fit-check',
      },
      resume: {
        label: 'I need a better resume',
        eyebrow: 'Turn direction into a story',
        title: 'Build a resume around the role you actually want.',
        body: 'Your selected role shapes the headline, strengths, and prompts so the draft feels specific instead of generic.',
        action: 'Open resume builder',
        href: '/resume',
      },
      action: {
        label: 'I need a plan',
        eyebrow: 'Turn preparation into motion',
        title: 'Know the next useful thing to do this week.',
        body: 'Use one connected plan for applications, resume improvements, interview stories, and follow-ups.',
        action: 'See my weekly plan',
        href: '/plan',
      },
    },
    journey: [
      ['01', 'Discover', 'Understand your strongest role directions.'],
      ['02', 'Prepare', 'Build the resume and skills those roles need.'],
      ['03', 'Apply', 'Track realistic openings and follow-ups.'],
      ['04', 'Interview', 'Practice answers using your own experience.'],
    ],
  },
  hi: {
    title: 'पहली नौकरी चुनना अनुमान लगाने जैसा नहीं होना चाहिए।',
    accent: 'सही दिशा पहचानिए, फिर उसी दिशा में तैयारी कीजिए।',
    subtitle:
      'कुछ व्यावहारिक प्रश्नों के उत्तर दीजिए और अपने लिए उपयुक्त भूमिकाएँ, केंद्रित जीवनवृत्त, साप्ताहिक योजना तथा साक्षात्कार की तैयारी एक ही जगह पाइए।',
    primaryGuest: 'मेरे लिए उपयुक्त भूमिकाएँ खोजें',
    primaryUser: 'अपनी तैयारी जारी रखें',
    secondaryGuest: 'साइन इन करें',
    secondaryUser: 'अपना कार्यस्थल खोलें',
    note: 'पूरी तरह मुफ़्त। लगभग 5 मिनट में पहला उपयोगी सुझाव।',
    greeting: 'फिर से स्वागत है',
    question: 'आज आपको सबसे अधिक किस सहायता की आवश्यकता है?',
    trust: ['पहली नौकरी खोजने वालों के लिए', 'अंग्रेज़ी और हिंदी', 'पूरी प्रगति एक साथ'],
    focus: {
      clarity: {
        label: 'मुझे सही करियर दिशा चाहिए',
        eyebrow: 'दिशा से शुरुआत करें',
        title: 'जानिए कि आपके स्वभाव और कौशल के अनुसार कौन-सी भूमिकाएँ उपयुक्त हैं।',
        body: 'योग्यता जाँच लोगों से संवाद, व्यवस्था, संख्यात्मक समझ और रचनात्मक कार्य में आपकी रुचि को समझती है। हर सुझाव के साथ स्पष्ट कारण मिलता है।',
        action: 'योग्यता जाँच शुरू करें',
        href: '/career-fit-check',
      },
      resume: {
        label: 'मुझे बेहतर जीवनवृत्त चाहिए',
        eyebrow: 'अपनी दिशा को प्रभावी परिचय बनाएँ',
        title: 'जिस भूमिका के लिए आवेदन करना है, उसी के अनुसार जीवनवृत्त बनाएँ।',
        body: 'चुनी हुई भूमिका के आधार पर शीर्षक, प्रमुख कौशल और लेखन संकेत बदलते हैं, ताकि जीवनवृत्त सामान्य न लगे।',
        action: 'जीवनवृत्त बनाएँ',
        href: '/resume',
      },
      action: {
        label: 'मुझे स्पष्ट योजना चाहिए',
        eyebrow: 'तैयारी को कार्य में बदलें',
        title: 'इस सप्ताह का अगला उपयोगी कदम स्पष्ट रूप से जानिए।',
        body: 'आवेदन, जीवनवृत्त सुधार, साक्षात्कार के उदाहरण और समय पर संपर्क के लिए एक जुड़ी हुई योजना का उपयोग करें।',
        action: 'साप्ताहिक योजना देखें',
        href: '/plan',
      },
    },
    journey: [
      ['01', 'पहचान', 'अपनी सबसे उपयुक्त करियर दिशाएँ समझें।'],
      ['02', 'तैयारी', 'भूमिका के अनुसार जीवनवृत्त और कौशल तैयार करें।'],
      ['03', 'आवेदन', 'उपयुक्त अवसरों और अगले संपर्क का लेखा रखें।'],
      ['04', 'साक्षात्कार', 'अपने अनुभव के आधार पर उत्तरों का अभ्यास करें।'],
    ],
  },
} as const;

export default function HomeReferencePage() {
  const user = useAppStore((state) => state.user);
  const locale = useAppStore((state) => state.locale);
  const [focus, setFocus] = useState<Focus>('clarity');

  const currentCopy = copy[locale];
  const currentFocus = currentCopy.focus[focus];
  const primaryHref = user ? '/dashboard' : '/register?next=%2Fcareer-fit-check';
  const secondaryHref = user ? '/dashboard' : '/login';

  const changeLocale = (nextLocale: Locale) => {
    setStoredLocale(nextLocale);
  };

  return (
    <main className="home-shell">
      <div className="container-main">
        <header className="flex items-center justify-between gap-5 py-5">
          <BrandWordmark locale={locale} />
          <div className="inline-flex rounded-full border border-white/70 bg-white/75 p-1 shadow-sm">
            <button
              className={`rounded-full px-4 py-2 text-sm transition ${
                locale === 'en' ? 'bg-[var(--brand-ink)] text-white' : 'text-[var(--ink-soft)]'
              }`}
              onClick={() => changeLocale('en')}
              type="button"
            >
              English
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm transition ${
                locale === 'hi' ? 'bg-[var(--brand-ink)] text-white' : 'text-[var(--ink-soft)]'
              }`}
              onClick={() => changeLocale('hi')}
              type="button"
            >
              हिंदी
            </button>
          </div>
        </header>

        <section className="home-hero">
          <div className="home-hero__copy">
            {user ? (
              <p className="eyebrow-copy">
                {currentCopy.greeting}, {getFirstName(user.name, locale === 'en' ? 'there' : 'दोस्त')}
              </p>
            ) : null}
            <h1 className="home-display">{currentCopy.title}</h1>
            <p className="home-accent">{currentCopy.accent}</p>
            <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
              {currentCopy.subtitle}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link className="btn-primary" href={primaryHref}>
                {user ? currentCopy.primaryUser : currentCopy.primaryGuest}
              </Link>
              <Link className="btn-outline" href={secondaryHref}>
                {user ? currentCopy.secondaryUser : currentCopy.secondaryGuest}
              </Link>
            </div>
            <p className="text-sm text-[var(--ink-muted)]">{currentCopy.note}</p>
          </div>

          <div className="home-guide" aria-live="polite">
            <p className="eyebrow-copy">{currentCopy.question}</p>
            <div className="home-guide__tabs" role="tablist">
              {(Object.keys(currentCopy.focus) as Focus[]).map((item) => (
                <button
                  aria-selected={focus === item}
                  className={`home-guide__tab ${focus === item ? 'home-guide__tab--active' : ''}`}
                  key={item}
                  onClick={() => setFocus(item)}
                  role="tab"
                  type="button"
                >
                  {currentCopy.focus[item].label}
                </button>
              ))}
            </div>

            <div className="home-guide__response" key={`${locale}-${focus}`}>
              <span className="home-guide__marker" />
              <p className="eyebrow-copy">{currentFocus.eyebrow}</p>
              <h2 className="mt-3 text-3xl leading-tight text-[var(--brand-ink)] sm:text-4xl">
                {currentFocus.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
                {currentFocus.body}
              </p>
              <Link className="mt-6 inline-flex font-semibold text-[var(--accent-ink)]" href={currentFocus.href}>
                {currentFocus.action} <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="journey-rail" aria-label={locale === 'en' ? 'Your journey' : 'आपकी यात्रा'}>
          {currentCopy.journey.map(([index, title, body]) => (
            <div className="journey-rail__step" key={index}>
              <span className="journey-rail__index">{index}</span>
              <div>
                <h2 className="text-xl text-[var(--brand-ink)]">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{body}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--border-soft)] py-7 text-sm text-[var(--ink-soft)]">
          {currentCopy.trust.map((item) => (
            <span className="inline-flex items-center gap-2" key={item}>
              <span className="h-2 w-2 rounded-full bg-[var(--accent-saffron)]" />
              {item}
            </span>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-soft)] py-8 text-sm text-[var(--ink-muted)]">
          <p>© {new Date().getFullYear()} Job Readiness Coach</p>
          <div className="flex gap-6">
            <span>{locale === 'en' ? 'Privacy' : 'गोपनीयता'}</span>
            <span>{locale === 'en' ? 'Terms' : 'नियम'}</span>
            <a className="hover:text-[var(--brand-ink)]" href="mailto:support@jobreadinesscoach.example">
              {locale === 'en' ? 'Contact' : 'संपर्क करें'}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
