'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAppStore } from '@/lib/store';

export function RegisterPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}
      title={copy(
        'Start with one free account, then move from confusion to a realistic first role.',
        'एक मुफ्त खाते से शुरुआत करें, फिर अनिश्चितता से एक व्यावहारिक पहली भूमिका की ओर बढ़ें।'
      )}
      subtitle={copy(
        'Create your account to unlock the fit check, top role matches, a role-aware resume draft, and a weekly plan that stays saved.',
        'योग्यता जाँच, उपयुक्त भूमिकाओं, भूमिका-आधारित जीवनवृत्त प्रारूप और सुरक्षित साप्ताहिक योजना को अनलॉक करने के लिए अपना खाता बनाएँ।'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">
            {copy('Create account', 'खाता बनाएँ')}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Build your job-readiness workspace once', 'अपना जॉब-रेडीनेस कार्यस्थल एक बार बनाएँ')}
          </p>
        </div>

        <Suspense fallback={<div>{copy('Loading...', 'लोड हो रहा है...')}</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
