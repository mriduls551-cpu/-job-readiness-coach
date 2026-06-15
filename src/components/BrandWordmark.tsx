import Link from 'next/link';

interface BrandWordmarkProps {
  compact?: boolean;
  href?: string;
  locale?: 'en' | 'hi';
}

export function BrandWordmark({
  compact = false,
  href = '/',
  locale = 'en',
}: BrandWordmarkProps) {
  const subtitle =
    locale === 'hi'
      ? 'India-first. Bilingual. AI-powered.'
      : 'India-first. Bilingual. AI-powered.';

  return (
    <Link className="inline-flex items-center gap-3 text-left" href={href}>
      <span className="brand-emblem">
        <span className="brand-emblem__core">JR</span>
      </span>
      <span className="space-y-1">
        <span
          className={`block font-[var(--font-heading)] leading-none text-[var(--brand-ink)] ${
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'
          }`}
        >
          Job Readiness Coach
        </span>
        <span className="block text-sm text-[var(--ink-soft)] sm:text-base">
          {subtitle}{' '}
          <span className="font-semibold text-[var(--accent-saffron)]">
            {locale === 'hi' ? 'Har pehla kadam.' : 'For every first step.'}
          </span>
        </span>
      </span>
    </Link>
  );
}
