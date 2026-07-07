'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { captureProductEvent } from '@/lib/analytics';
import { getLocaleValue, type Locale, type RoleMatch } from '@/lib/product';

type CtaOrder = 'resume-first' | 'practice-first';

const ORDER_KEY = 'job-readiness-d1-cta-order';

const copy = {
  en: {
    eyebrow: 'What next?',
    title: 'Choose the next path you actually want to take.',
    body: 'One option keeps you moving into a resume. The other opens a practice waitlist so we can see if guided prep is the bigger need.',
    resumeTitle: 'Build my resume',
    resumeBody: 'Keep the momentum and turn this direction into a concrete draft.',
    practiceTitle: 'Start practicing with AI',
    practiceBody: 'Coming soon. Join the waitlist and we will email you when practice mode opens.',
    practiceSheetTitle: 'Practice mode is coming soon',
    practiceSheetBody:
      'If guided practice feels more useful than resume writing, join the waitlist and we will contact you about the first release.',
    consentLabel: 'Yes, you can email me about practice mode.',
    noteLabel: 'Optional note',
    notePlaceholder: 'What would you want practice mode to help with?',
    submit: 'Join waitlist',
    saving: 'Saving…',
    success: 'You are on the waitlist.',
    error: 'We could not save your waitlist right now. Please try again.',
    close: 'Close',
  },
  hi: {
    eyebrow: 'अब क्या?',
    title: 'अगला वही रास्ता चुनें जो आप सच में लेना चाहते हैं।',
    body: 'एक विकल्प आपको जीवनवृत्त की ओर आगे बढ़ाता है। दूसरा practice waitlist खोलता है ताकि हम देख सकें कि guided prep ज्यादा जरूरी है या नहीं।',
    resumeTitle: 'मेरा जीवनवृत्त बनाएं',
    resumeBody: 'इस दिशा को एक ठोस draft में बदलें और आगे बढ़ें।',
    practiceTitle: 'AI के साथ अभ्यास शुरू करें',
    practiceBody: 'जल्द आ रहा है। waitlist में जुड़ें और practice mode खुलते ही हम आपको बताएँगे।',
    practiceSheetTitle: 'Practice mode जल्द आ रहा है',
    practiceSheetBody:
      'अगर guided practice, resume writing से ज्यादा उपयोगी लगती है, तो waitlist में जुड़ें और पहली release के लिए हम आपसे संपर्क करेंगे।',
    consentLabel: 'हाँ, आप practice mode के बारे में मुझे email कर सकते हैं।',
    noteLabel: 'वैकल्पिक नोट',
    notePlaceholder: 'Practice mode से आपको किस तरह मदद चाहिए?',
    submit: 'Waitlist में जुड़ें',
    saving: 'सेव किया जा रहा है…',
    success: 'आप waitlist में जुड़ गए हैं।',
    error: 'अभी waitlist सेव नहीं हो सकी। कृपया दोबारा प्रयास करें।',
    close: 'बंद करें',
  },
} as const;

function getStoredOrder(): CtaOrder {
  if (typeof window === 'undefined') {
    return 'resume-first';
  }

  const stored = window.sessionStorage.getItem(ORDER_KEY);
  if (stored === 'practice-first' || stored === 'resume-first') {
    return stored;
  }

  const nextOrder: CtaOrder = Math.random() < 0.5 ? 'resume-first' : 'practice-first';
  window.sessionStorage.setItem(ORDER_KEY, nextOrder);
  return nextOrder;
}

export function ResultsDecisionFork({
  locale,
  selectedMatch,
}: {
  locale: Locale;
  selectedMatch: RoleMatch;
}) {
  const [order, setOrder] = useState<CtaOrder>('resume-first');
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const currentCopy = copy[locale];

  useEffect(() => {
    setOrder(getStoredOrder());
  }, []);

  const resumeCta = {
    key: 'resume',
    title: currentCopy.resumeTitle,
    body: currentCopy.resumeBody,
    kind: 'resume' as const,
  };
  const practiceCta = {
    key: 'practice',
    title: currentCopy.practiceTitle,
    body: currentCopy.practiceBody,
    kind: 'practice' as const,
  };
  const ctas = order === 'resume-first' ? [resumeCta, practiceCta] : [practiceCta, resumeCta];

  async function submitWaitlist() {
    if (!consent || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/assessment/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-locale': locale,
        },
        credentials: 'include',
        body: JSON.stringify({
          selectedRoleId: selectedMatch.roleId,
          contactConsent: true,
          note: note.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to save waitlist');
      }

      setSubmitted(true);
      void captureProductEvent('waitlist_submitted', {
        locale,
        selected_role_id: selectedMatch.roleId,
        note_present: Boolean(note.trim()),
      });
    } catch {
      setSubmitted(false);
      setErrorMessage(currentCopy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="route-shell bg-white/90">
      <p className="eyebrow-copy">{currentCopy.eyebrow}</p>
      <h2 className="mt-4 text-3xl leading-tight text-[var(--ink-strong)]">{currentCopy.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{currentCopy.body}</p>

      <div className="mt-5 grid gap-3">
        {ctas.map((cta) =>
          cta.kind === 'resume' ? (
            <Link
              className="rounded-[1.2rem] border border-[var(--border-soft)] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-[var(--accent-ink)]"
              href="/resume"
              key={cta.key}
              onClick={() =>
                void captureProductEvent('cta_resume_clicked', {
                  locale,
                  selected_role_id: selectedMatch.roleId,
                  cta_order: order,
                })
              }
            >
              <p className="text-base font-semibold text-[var(--ink-strong)]">{cta.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{cta.body}</p>
            </Link>
          ) : (
            <button
              className="rounded-[1.2rem] border border-[var(--border-soft)] bg-white px-4 py-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-[var(--accent-ink)]"
              key={cta.key}
              onClick={() => {
                void captureProductEvent('cta_practice_clicked', {
                  locale,
                  selected_role_id: selectedMatch.roleId,
                  cta_order: order,
                });
                setErrorMessage('');
                setOpen(true);
              }}
              type="button"
            >
              <p className="text-base font-semibold text-[var(--ink-strong)]">{cta.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{cta.body}</p>
            </button>
          )
        )}
      </div>

      <div className="mt-5 rounded-[1.2rem] border border-[var(--border-soft)] bg-[var(--wash-saffron)] px-4 py-3 text-sm text-[var(--ink-soft)]">
        {locale === 'en'
          ? `Current direction: ${getLocaleValue(selectedMatch.role.shortLabel, locale)}`
          : `वर्तमान दिशा: ${getLocaleValue(selectedMatch.role.shortLabel, locale)}`}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-5 shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
            {submitted ? (
              <div className="space-y-4">
                <Dialog.Title className="text-2xl leading-tight text-[var(--ink-strong)]">
                  {currentCopy.success}
                </Dialog.Title>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  {locale === 'en'
                    ? 'We will contact you when practice mode is ready.'
                    : 'Practice mode तैयार होते ही हम आपसे संपर्क करेंगे।'}
                </p>
                <div className="flex justify-end">
                  <button className="btn-primary" onClick={() => setOpen(false)} type="button">
                    {currentCopy.close}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Dialog.Title className="text-2xl leading-tight text-[var(--ink-strong)]">
                  {currentCopy.practiceSheetTitle}
                </Dialog.Title>
                <p className="text-sm leading-7 text-[var(--ink-soft)]">
                  {currentCopy.practiceSheetBody}
                </p>

                <label className="flex items-start gap-3 rounded-[1.1rem] border border-[var(--border-soft)] bg-[var(--wash-forest)] px-4 py-3 text-sm leading-6 text-[var(--ink-soft)]">
                  <input
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{currentCopy.consentLabel}</span>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-[var(--ink-strong)]">
                    {currentCopy.noteLabel}
                  </span>
                  <textarea
                    className="input-field min-h-28 w-full resize-y"
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={currentCopy.notePlaceholder}
                    value={note}
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3">
                  <button className="btn-outline" onClick={() => setOpen(false)} type="button">
                    {locale === 'en' ? 'Not now' : 'अभी नहीं'}
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!consent || saving}
                    onClick={() => void submitWaitlist()}
                    type="button"
                  >
                    {saving ? currentCopy.saving : currentCopy.submit}
                  </button>
                </div>

                {errorMessage ? (
                  <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
