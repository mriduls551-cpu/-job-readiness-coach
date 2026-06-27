'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getLatestAssessment,
  getSelectedRole,
  setStoredLocale,
} from '@/lib/client-session';
import { useAppStore } from '@/lib/store';
import type { Locale } from '@/lib/product';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const HIDE_PATHS = new Set([
  '/',
  '/career-fit-check',
  '/results',
  '/login',
  '/register',
]);

function makeWelcome(locale: Locale): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      locale === 'en'
        ? 'I can help you narrow your role fit, improve your resume, or decide the next 3 actions for this week.'
        : 'मैं आपके लिए उपयुक्त भूमिका पहचानने, जीवनवृत्त बेहतर करने और इस सप्ताह के अगले 3 कदम तय करने में सहायता कर सकता हूँ।',
  };
}

export function CoachWidget() {
  const [open, setOpen] = useState(false);
  const locale = useAppStore((state) => state.locale);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const assessment = getLatestAssessment();
  const roleId = getSelectedRole() ?? assessment?.topRoles?.[0]?.roleId;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeWelcome(locale)]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const switchLocale = (nextLocale: Locale) => {
    setStoredLocale(nextLocale);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantId = `assistant-${Date.now()}`;

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': locale,
        },
        body: JSON.stringify({ message: text, roleId, profile: assessment?.profile }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Request failed');
      }

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m))
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            locale === 'en'
              ? 'I hit a temporary issue, but you can still continue with the form and results flow.'
              : 'अभी कुछ तकनीकी समस्या आई है, लेकिन आप प्रश्नों और परिणामों की प्रक्रिया जारी रख सकते हैं।',
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (HIDE_PATHS.has(pathname)) {
    return null;
  }

  const showThinking = isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <div className="coach-fab fixed right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="glass-panel w-[min(92vw,24rem)] overflow-hidden border border-white/55 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                AI Coach
              </p>
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
                {locale === 'en' ? 'Job Readiness Coach' : 'जॉब रेडीनेस कोच'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-[var(--wash-forest)] p-1">
                <button
                  className={`rounded-full px-2 py-1 text-xs ${
                    locale === 'en' ? 'bg-white text-[var(--ink-strong)] shadow-sm' : 'text-[var(--ink-muted)]'
                  }`}
                  onClick={() => switchLocale('en')}
                  type="button"
                >
                  EN
                </button>
                <button
                  className={`rounded-full px-2 py-1 text-xs ${
                    locale === 'hi' ? 'bg-white text-[var(--ink-strong)] shadow-sm' : 'text-[var(--ink-muted)]'
                  }`}
                  onClick={() => switchLocale('hi')}
                  type="button"
                >
                  HI
                </button>
              </div>
              <button
                className="rounded-full p-2 text-[var(--ink-muted)] transition hover:bg-[var(--wash-forest)] hover:text-[var(--ink-strong)]"
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
                    ? 'bg-[var(--wash-forest)] text-[var(--ink-strong)]'
                    : 'ml-auto bg-[var(--accent-ink)] text-white'
                }`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      code: ({ children }) => <code className="rounded bg-black/10 px-1 font-mono text-xs">{children}</code>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
            ))}
            {showThinking && (
              <div className="max-w-[75%] rounded-2xl bg-[var(--wash-forest)] px-4 py-3 text-sm text-[var(--ink-muted)]">
                {locale === 'en' ? 'Thinking...' : 'सोच रहा/रही हूं...'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="border-t border-[var(--border-soft)] p-4" onSubmit={handleSubmit}>
            <textarea
              className="min-h-[5rem] w-full rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-ink)]"
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                locale === 'en'
                  ? 'Ask about your resume, role fit, or next steps...'
                  : 'अपने जीवनवृत्त, उपयुक्त भूमिका या अगले कदम के बारे में पूछें...'
              }
              value={input}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[var(--ink-muted)]">
                {locale === 'en'
                  ? 'Optional help. The core flow still works without AI.'
                  : 'यह अतिरिक्त सहायता है। मुख्य प्रक्रिया कृत्रिम बुद्धिमत्ता के बिना भी काम करती है।'}
              </p>
              <button className="btn-primary" disabled={isStreaming || !input.trim()} type="submit">
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
