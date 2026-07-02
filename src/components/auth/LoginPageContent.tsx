'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { FullPageLoader } from '@/components/FullPageLoader';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAppStore } from '@/lib/store';

export function LoginPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Save your progress', 'à¤…à¤ªà¤¨à¥€ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤¸à¥‡à¤µ à¤°à¤–à¥‡à¤‚')}
      title={copy(
        'Welcome back to your one calm job-readiness system.',
        'à¤…à¤ªà¤¨à¥‡ à¤à¤• à¤¹à¥€ à¤µà¥à¤¯à¤µà¤¸à¥à¤¥à¤¿à¤¤ à¤œà¥‰à¤¬-à¤°à¥‡à¤¡à¥€à¤¨à¥‡à¤¸ à¤¸à¤¿à¤¸à¥à¤Ÿà¤® à¤®à¥‡à¤‚ à¤«à¤¿à¤° à¤¸à¥‡ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆà¥¤'
      )}
      subtitle={copy(
        'Sign in to reopen your fit check, resume draft, weekly plan, and application momentum without starting over.',
        'à¤…à¤ªà¤¨à¥€ à¤¯à¥‹à¤—à¥à¤¯à¤¤à¤¾ à¤œà¤¾à¤à¤š, à¤œà¥€à¤µà¤¨à¤µà¥ƒà¤¤à¥à¤¤ à¤ªà¥à¤°à¤¾à¤°à¥‚à¤ª, à¤¸à¤¾à¤ªà¥à¤¤à¤¾à¤¹à¤¿à¤• à¤¯à¥‹à¤œà¤¨à¤¾ à¤”à¤° à¤†à¤µà¥‡à¤¦à¤¨ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤•à¥‹ à¤«à¤¿à¤° à¤¸à¥‡ à¤–à¥‹à¤²à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚à¥¤'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Save your progress', 'à¤…à¤ªà¤¨à¥€ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤¸à¥‡à¤µ à¤°à¤–à¥‡à¤‚')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">
            {copy('Sign in', 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨ à¤•à¤°à¥‡à¤‚')}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Welcome back to Job Readiness Coach', 'à¤œà¥‰à¤¬ à¤°à¥‡à¤¡à¥€à¤¨à¥‡à¤¸ à¤•à¥‹à¤š à¤®à¥‡à¤‚ à¤«à¤¿à¤° à¤¸à¥‡ à¤¸à¥à¤µà¤¾à¤—à¤¤ à¤¹à¥ˆ')}
          </p>
        </div>

        <Suspense
          fallback={
            <FullPageLoader
              eyebrow={copy('Sign in', 'à¤¸à¤¾à¤‡à¤¨ à¤‡à¤¨')}
              title={copy('Loading your sign-in form…', 'à¤†à¤ªà¤•à¤¾ à¤¸à¤¾à¤‡à¤¨-à¤‡à¤¨ à¤«à¥‰à¤°à¥à¤® à¤²à¥‹à¤¡ à¤•à¤¿à¤¯à¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ…')}
              message={copy(
                'We’re preparing your saved route so you can continue without losing progress.',
                'à¤¹à¤® à¤†à¤ªà¤•à¤¾ à¤¸à¥‡à¤µ à¤•à¤¿à¤¯à¤¾ à¤¹à¥à¤† à¤°à¤¾à¤¸à¥à¤¤à¤¾ à¤¤à¥ˆà¤¯à¤¾à¤° à¤•à¤° à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚ à¤¤à¤¾à¤•à¤¿ à¤†à¤ª à¤¬à¤¿à¤¨à¤¾ à¤ªà¥à¤°à¤—à¤¤à¤¿ à¤—à¤à¤µà¤¾à¤ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼ à¤¸à¤•à¥‡à¤‚à¥¤'
              )}
            />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
