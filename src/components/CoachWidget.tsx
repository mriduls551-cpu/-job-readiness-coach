'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import {
  getLatestAssessment,
  getSelectedRole,
  getStoredLocale,
  setStoredLocale,
} from '@/lib/client-session';
import type { Locale } from '@/lib/product';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const HIDE_PATHS = new Set([
  '/',
  '/career-fit-check',
  '/results',
  // /resume intentionally removed — users need coaching help while building their resume
  '/login',
  '/register',
]);

export function CoachWidget() {
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  useEffect(() => {
    const nextLocale = getStoredLocale();
    setLocale(nextLocale);

    const loadContext = async () => {
      const response = await fetch('/api/agent/context', {
        headers: {
          'x-user-locale': nextLocale,
        },
      });

      if (!response.ok) return;

      const payload = (await response.json()) as {
        data?: {
          messages?: ChatMessage[];
        };
      };

      setMessages(
        payload.data?.messages?.length
          ? payload.data.messages
          : [
              {
                id: 'welcome',
                role: 'assistant',
                content:
                  nextLocale === 'en'
                    ? 'I can help you narrow your role fit, improve your resume, or decide the next 3 actions for this week.'
                    : 'मैं आपके लिए उपयुक्त भूमिका पहचानने, जीवनवृत्त बेहतर करने और इस सप्ताह के अगले 3 कदम तय करने में सहायता कर सकता हूँ।',
              },
            ]
      );
    };

    void loadContext();
  }, []);

  useEffect(() => {
    const handleLocaleChange = () => setLocale(getStoredLocale());
    window.addEventListener('locale-change', handleLocaleChange);
    return () => window.removeEventListener('locale-change', handleLocaleChange);
  }, []);

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const assessment = getLatestAssessment();
    const roleId = getSelectedRole() || assessment?.topRoles?.[0]?.roleId;
    const optimisticUserMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: trimmed,
    };

    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft('');

    startTransition(async () => {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': locale,
        },
        body: JSON.stringify({
          message: trimmed,
          roleId,
          profile: assessment?.profile,
        }),
      });

      if (!response.ok) {
        setMessages((current) => [
          ...current,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content:
              locale === 'en'
                ? 'I hit a temporary issue, but you can still continue with the form and results flow.'
                : 'अभी कुछ तकनीकी समस्या आई है, लेकिन आप प्रश्नों और परिणामों की प्रक्रिया जारी रख सकते हैं।',
          },
        ]);
        return;
      }

      const payload = (await response.json()) as {
        data?: {
          reply: string;
        };
      };

      if (payload.data?.reply) {
        const reply = payload.data.reply;
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: reply,
          },
        ]);
      }
    });
  };

  const switchLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setStoredLocale(nextLocale);
  };

  if (HIDE_PATHS.has(pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="glass-panel w-[min(92vw,24rem)] overflow-hidden border border-white/55 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                AI Coach
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {locale === 'en' ? 'Job Readiness Coach' : 'जॉब रेडीनेस कोच'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-slate-100 p-1">
                <button
                  className={`rounded-full px-2 py-1 text-xs ${
                    locale === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => switchLocale('en')}
                  type="button"
                >
                  EN
                </button>
                <button
                  className={`rounded-full px-2 py-1 text-xs ${
                    locale === 'hi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                  onClick={() => switchLocale('hi')}
                  type="button"
                >
                  HI
                </button>
              </div>
              <button
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setOpen(false)}
                type="button"
              >
                x
              </button>
            </div>
          </div>

          <div className="max-h-[24rem] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'assistant'
                    ? 'bg-slate-100 text-slate-800'
                    : 'ml-auto bg-[var(--accent-ink)] text-white'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isPending && (
              <div className="max-w-[75%] rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                {locale === 'en' ? 'Thinking...' : 'सोच रहा/रही हूं...'}
              </div>
            )}
          </div>

          <form className="border-t border-slate-200/80 p-4" onSubmit={submitMessage}>
            <textarea
              className="min-h-[5rem] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--accent-ink)]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                locale === 'en'
                  ? 'Ask about your resume, role fit, or next steps...'
                  : 'अपने जीवनवृत्त, उपयुक्त भूमिका या अगले कदम के बारे में पूछें...'
              }
              value={draft}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {locale === 'en'
                  ? 'Optional help. The core flow still works without AI.'
                  : 'यह अतिरिक्त सहायता है। मुख्य प्रक्रिया कृत्रिम बुद्धिमत्ता के बिना भी काम करती है।'}
              </p>
              <button className="btn-primary" disabled={isPending || !draft.trim()} type="submit">
                {locale === 'en' ? 'Send' : 'भेजें'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        className="inline-flex items-center gap-3 rounded-full bg-[var(--accent-ink)] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-base">
          AI
        </span>
        <span>{locale === 'en' ? 'Talk to your coach' : 'कोच से बात करें'}</span>
      </button>
    </div>
  );
}
