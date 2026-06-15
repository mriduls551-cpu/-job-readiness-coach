import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const promisePoints = [
  'Clear role matches instead of vague career advice',
  'Resume co-writing tied to your chosen direction',
  'Weekly plan, applications, and interview prep in one place',
];

const trustPoints = ['No payment required', 'Progress saved to your account', 'Made for first-job seekers'];

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthScaffoldProps) {
  return (
    <main className="section-shell">
      <div className="container-main">
        <div className="auth-layout">
          <section className="auth-aside">
            <div className="space-y-6">
              <BrandWordmark compact />
              <div className="heritage-quote">
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
                  key={item}
                >
                  <span className="pt-1 text-xs font-bold tracking-[0.16em] text-[var(--accent-saffron)]">
                    0{index + 1}
                  </span>
                  <p className="text-lg leading-7 text-[var(--brand-ink)]">{item}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustPoints.map((item) => (
                <div className="trust-tile" key={item}>
                  <span className="trust-tile__badge" />
                  <span>{item}</span>
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
