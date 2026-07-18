'use client';

import { Suspense, useEffect, useState } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAppStore } from '@/lib/store';

export function RegisterPageContent() {
  const locale = useAppStore((state) => state.locale);
  const [nextPath, setNextPath] = useState('');
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);
  const isPostFitCheckGate = nextPath.includes('/career-fit-check') && nextPath.includes('resume=1');

  useEffect(() => {
    setNextPath(new URLSearchParams(window.location.search).get('next') || '');
  }, []);

  return (
    <AuthScaffold
      eyebrow={copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}
      title={copy(
        isPostFitCheckGate
          ? 'Save your answers, then see your realistic role matches.'
          : 'Start with one free account, then move from confusion to a realistic first role.',
        isPostFitCheckGate
          ? 'अपने उत्तर सुरक्षित करें, फिर अपने लिए वास्तविक भूमिका मैच देखें।'
          : 'एक मुफ्त खाते से शुरुआत करें, फिर अनिश्चितता से एक व्यावहारिक पहली भूमिका की ओर बढ़ें।'
      )}
      subtitle={copy(
        isPostFitCheckGate
          ? 'Create your account to keep this fit-check, finish scoring, and carry your selected direction into the resume, plan, and practice waitlist.'
          : 'Create your account to unlock the fit check, top role matches, a role-aware resume draft, and a weekly plan that stays saved.',
        isPostFitCheckGate
          ? 'इस योग्यता जाँच को सहेजने, परिणाम पूरे करने और चुनी हुई दिशा को जीवनवृत्त, योजना और practice waitlist में ले जाने के लिए खाता बनाएँ।'
          : 'योग्यता जाँच, उपयुक्त भूमिकाओं, भूमिका-आधारित जीवनवृत्त प्रारूप और सुरक्षित साप्ताहिक योजना को अनलॉक करने के लिए अपना खाता बनाएँ।'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">
            {copy(
              isPostFitCheckGate ? 'Save and see results' : 'Create account',
              isPostFitCheckGate ? 'परिणाम देखें और सहेजें' : 'खाता बनाएँ'
            )}
          </h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy(
              isPostFitCheckGate
                ? 'Your answers stay on this device until the account is created'
                : 'Build your job-readiness workspace once',
              isPostFitCheckGate
                ? 'खाता बनने तक आपके उत्तर इसी डिवाइस पर रहेंगे'
                : 'अपना जॉब-रेडीनेस कार्यस्थल एक बार बनाएँ'
            )}
          </p>
        </div>

        <Suspense fallback={<div>{copy('Loading...', 'लोड हो रहा है...')}</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
