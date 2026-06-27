'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAppStore } from '@/lib/store';

export function LoginPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Save your progress', 'अपनी प्रगति सेव रखें')}
      title={copy(
        'Welcome back to your one calm job-readiness system.',
        'अपने एक ही व्यवस्थित जॉब-रेडीनेस सिस्टम में फिर से स्वागत है।'
      )}
      subtitle={copy(
        'Sign in to reopen your fit check, resume draft, weekly plan, and application momentum without starting over.',
        'अपनी योग्यता जाँच, जीवनवृत्त प्रारूप, साप्ताहिक योजना और आवेदन प्रगति को फिर से खोलने के लिए साइन इन करें।'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Save your progress', 'अपनी प्रगति सेव रखें')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">
            {copy('Sign in', 'साइन इन करें')}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Welcome back to Job Readiness Coach', 'जॉब रेडीनेस कोच में फिर से स्वागत है')}
          </p>
        </div>

        <Suspense fallback={<div>{copy('Loading...', 'लोड हो रहा है...')}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
