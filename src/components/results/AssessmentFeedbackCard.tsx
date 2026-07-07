'use client';

import { useState } from 'react';
import { captureProductEvent } from '@/lib/analytics';

type Locale = 'en' | 'hi';
type FeedbackRating = 'helpful' | 'unhelpful';

const copy = {
  en: {
    eyebrow: 'Quick feedback',
    title: 'Was this result helpful?',
    body: 'One line is enough. We use this to tune the fit check, not to store private notes.',
    helpful: 'Helpful',
    unhelpful: 'Not quite',
    placeholder: 'What felt accurate or off?',
    helper: 'Optional. Max 500 characters.',
    submit: 'Send feedback',
    saving: 'Sending…',
    saved: 'Thanks. Your feedback is saved.',
    error: 'We could not save that feedback right now.',
    choose: 'Choose one option before sending.',
  },
  hi: {
    eyebrow: 'त्वरित प्रतिक्रिया',
    title: 'क्या यह परिणाम मददगार था?',
    body: 'एक लाइन काफी है। इसे हम fit check बेहतर करने के लिए इस्तेमाल करते हैं, निजी नोट्स के लिए नहीं।',
    helpful: 'मददगार',
    unhelpful: 'पूरी तरह नहीं',
    placeholder: 'कौन-सी बात सही लगी या नहीं लगी?',
    helper: 'ज़रूरी नहीं। अधिकतम 500 characters.',
    submit: 'प्रतिक्रिया भेजें',
    saving: 'भेजा जा रहा है…',
    saved: 'धन्यवाद। आपकी प्रतिक्रिया सेव हो गई।',
    error: 'अभी यह प्रतिक्रिया सेव नहीं हो सकी।',
    choose: 'भेजने से पहले एक विकल्प चुनें।',
  },
} as const;

export function AssessmentFeedbackCard({ locale }: { locale: Locale }) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const currentCopy = copy[locale];

  async function submitFeedback() {
    if (!rating || status === 'saving') {
      if (!rating) {
        setErrorMessage(currentCopy.choose);
      }
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      const response = await fetch('/api/assessment/feedback', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-locale': locale,
        },
        credentials: 'include',
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to save feedback');
      }

      setStatus('saved');
      void captureProductEvent('feedback_submitted', {
        rating,
        has_comment: Boolean(comment.trim()),
        locale,
      });
    } catch {
      setStatus('error');
      setErrorMessage(currentCopy.error);
    }
  }

  return (
    <section className="route-shell">
      <p className="eyebrow-copy">{currentCopy.eyebrow}</p>
      <h2 className="mt-4 text-2xl leading-tight text-[var(--ink-strong)]">{currentCopy.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{currentCopy.body}</p>

      {status === 'saved' ? (
        <div className="mt-5 rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {currentCopy.saved}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                rating === 'helpful'
                  ? 'border-[var(--accent-ink)] bg-[var(--wash-forest)] text-[var(--ink-strong)]'
                  : 'border-[var(--border-soft)] bg-white text-[var(--ink-soft)]'
              }`}
              onClick={() => setRating('helpful')}
              type="button"
            >
              {currentCopy.helpful}
            </button>
            <button
              className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                rating === 'unhelpful'
                  ? 'border-[var(--accent-ink)] bg-[var(--wash-forest)] text-[var(--ink-strong)]'
                  : 'border-[var(--border-soft)] bg-white text-[var(--ink-soft)]'
              }`}
              onClick={() => setRating('unhelpful')}
              type="button"
            >
              {currentCopy.unhelpful}
            </button>
          </div>

          <label className="block">
            <span className="sr-only">{currentCopy.title}</span>
            <textarea
              className="input-field min-h-28 w-full resize-y"
              maxLength={500}
              onChange={(event) => setComment(event.target.value)}
              placeholder={currentCopy.placeholder}
              value={comment}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--ink-muted)]">{currentCopy.helper}</p>
            <button
              className="btn-primary"
              disabled={status === 'saving'}
              onClick={submitFeedback}
              type="button"
            >
              {status === 'saving' ? currentCopy.saving : currentCopy.submit}
            </button>
          </div>
        </div>
      )}

      {errorMessage ? (
        <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
