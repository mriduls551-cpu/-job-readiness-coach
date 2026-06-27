'use client';

import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { useAppStore } from '@/lib/store';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const promisePoints: { en: string; hi: string }[] = [
  { en: 'Clear role matches instead of vague career advice', hi: 'अस्पष्ट करियर सलाह नहीं, बल्कि उपयुक्त भूमिकाओं के स्पष्ट सुझाव' },
  { en: 'Resume co-writing tied to your chosen direction', hi: 'आपकी चुनी हुई दिशा के अनुसार जीवनवृत्त सह-लेखन' },
  { en: 'Weekly plan, applications, and interview prep in one place', hi: 'साप्ताहिक योजना, आवेदन और साक्षात्कार की तैयारी एक ही जगह' },
];

const trustPoints: { en: string; hi: string }[] = [
  { en: 'No payment required', hi: 'कोई भुगतान आवश्यक नहीं' },
  { en: 'Progress saved to your account', hi: 'प्रगति आपके खाते में सुरक्षित रहती है' },
  { en: 'Made for first-job seekers', hi: 'पहली नौकरी खोजने वालों के लिए बनाया गया' },
];

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthScaffoldProps) {
  const locale = useAppStore((state) => state.locale);

  return (
    <main className="section-shell">
      <div className="container-main">
        <div className="auth-layout">
          <section className="auth-aside">
            <div className="space-y-6">
              <BrandWordmark compact />
              <div className="heritage-quote">
                {/* Intentional: brand tagline stays Hinglish in both locales, the way a wordmark would. */}
                <p className="text-xl text-[var(--brand-ink)] sm:text-2xl">
                  Taiyari aaj ki, behtar kal ka.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="eyebrow-copy">{eyebrow}</p>
              <h1 className="text-4xl leading-[1.02] text-[var(--brand-ink)] sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-8 text-[var(--ink-soft)]">
                {subtitle}
              </p>
            </div>

            <div className="grid gap-1 border-y border-[var(--border-soft)] md:grid-cols-3">
              {promisePoints.map((item, index) => (
                <article
                  className="flex min-h-[8rem] gap-4 border-b border-[var(--border-soft)] px-2 py-5 last:border-b-0 md:border-b-0 md:border-r md:px-5 md:last:border-r-0"
                  key={item.en}
                >
                  <span className="pt-1 text-xs font-bold tracking-[0.16em] text-[var(--accent-saffron)]">
                    0{index + 1}
                  </span>
                  <p className="text-lg leading-7 text-[var(--brand-ink)]">{item[locale]}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustPoints.map((item) => (
                <div className="trust-tile" key={item.en}>
                  <span className="trust-tile__badge" />
                  <span>{item[locale]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="auth-form-card">{children}</section>
        </div>
      </div>
    </main>
  );
}
