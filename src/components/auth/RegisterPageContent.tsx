'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { FullPageLoader } from '@/components/FullPageLoader';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAppStore } from '@/lib/store';

export function RegisterPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Keep your progress', 'à¤…à¤ªà¤¨à¥€ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤¬à¤¨à¤¾à¤ à¤°à¤–à¥‡à¤‚')}
      title={copy(
        'Start with one free account, then move from confusion to a realistic first role.',
        'à¤à¤• à¤®à¥à¤«à¥à¤¤ à¤–à¤¾à¤¤à¥‡ à¤¸à¥‡ à¤¶à¥à¤°à¥à¤†à¤¤ à¤•à¤°à¥‡à¤‚, à¤«à¤¿à¤° à¤…à¤¨à¤¿à¤¶à¥à¤šà¤¿à¤¤à¤¤à¤¾ à¤¸à¥‡ à¤à¤• à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤ªà¤¹à¤²à¥€ à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤•à¥€ à¤“à¤° à¤¬à¤¢à¤¼à¥‡à¤‚à¥¤'
      )}
      subtitle={copy(
        'Create your account to unlock the fit check, top role matches, a role-aware resume draft, and a weekly plan that stays saved.',
        'à¤¯à¥‹à¤—à¥à¤¯à¤¤à¤¾ à¤œà¤¾à¤à¤š, à¤‰à¤ªà¤¯à¥à¤•à¥à¤¤ à¤­à¥‚à¤®à¤¿à¤•à¤¾à¤“à¤‚, à¤­à¥‚à¤®à¤¿à¤•à¤¾-à¤†à¤§à¤¾à¤°à¤¿à¤¤ à¤œà¥€à¤µà¤¨à¤µà¥ƒà¤¤à¥à¤¤ à¤ªà¥à¤°à¤¾à¤°à¥‚à¤ª à¤”à¤° à¤¸à¥à¤°à¤•à¥à¤·à¤¿à¤¤ à¤¸à¤¾à¤ªà¥à¤¤à¤¾à¤¹à¤¿à¤• à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‹ à¤…à¤¨à¤²à¥‰à¤• à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤…à¤ªà¤¨à¤¾ à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤à¤à¥¤'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Keep your progress', 'à¤…à¤ªà¤¨à¥€ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤¬à¤¨à¤¾à¤ à¤°à¤–à¥‡à¤‚')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">
            {copy('Create account', 'à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤à¤')}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Build your job-readiness workspace once', 'à¤…à¤ªà¤¨à¤¾ à¤œà¥‰à¤¬-à¤°à¥‡à¤¡à¥€à¤¨à¥‡à¤¸ à¤•à¤¾à¤°à¥à¤¯à¤¸à¥à¤¥à¤² à¤à¤• à¤¬à¤¾à¤° à¤¬à¤¨à¤¾à¤à¤')}
          </p>
        </div>

        <Suspense
          fallback={
            <FullPageLoader
              eyebrow={copy('Create account', 'à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤à¤')}
              title={copy('Loading your account setup…', 'à¤†à¤ªà¤•à¤¾ à¤–à¤¾à¤¤à¤¾ à¤¸à¥‡à¤Ÿà¤…à¤ª à¤²à¥‹à¤¡ à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ…')}
              message={copy(
                'We’re getting your registration step ready so your fit-check progress stays attached to this account.',
                'à¤¹à¤® à¤†à¤ªà¤•à¤¾ à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¥à¤°à¥‡à¤¶à¤¨ à¤•à¤¦à¤® à¤¤à¥ˆà¤¯à¤¾à¤° à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚ à¤¤à¤¾à¤•à¤¿ à¤†à¤ªà¤•à¥€ à¤¯à¥‹à¤—à¥à¤¯à¤¤à¤¾ à¤œà¤¾à¤à¤š à¤•à¥€ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤‡à¤¸ à¤–à¤¾à¤¤à¥‡ à¤¸à¥‡ à¤œà¥à¤¡à¤¼à¥€ à¤°à¤¹à¥‡à¥¤'
              )}
            />
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
