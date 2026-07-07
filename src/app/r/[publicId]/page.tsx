import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDB } from '@/lib/db';
import { getLocaleValue } from '@/lib/product';

export const dynamic = 'force-dynamic';

function shareUrl(publicId: string) {
  return `/r/${publicId}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const share = await getDB().getPublicShare(publicId);
  if (!share) {
    return {
      title: 'Fit-check share',
      description: 'A shared fit-check result from Job Readiness Coach.',
    };
  }

  return {
    title: `${share.firstName}'s fit-check result`,
    description: getLocaleValue(share.roleSummary, share.locale),
    openGraph: {
      title: `${share.firstName}'s fit-check result`,
      description: getLocaleValue(share.roleSummary, share.locale),
      url: shareUrl(share.publicId),
      images: [`/r/${share.publicId}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${share.firstName}'s fit-check result`,
      description: getLocaleValue(share.roleSummary, share.locale),
    },
  };
}

export default async function PublicSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams?: Promise<{ src?: string }>;
}) {
  const { publicId } = await params;
  const share = await getDB().recordPublicShareVisit(publicId);
  const query = searchParams ? await searchParams : {};
  if (!share) {
    notFound();
  }

  const locale = share.locale;
  const dimensions = [
    {
      label: locale === 'en' ? 'Numbers' : 'सांख्यिक समझ',
      value: share.dimensionSnapshot.numerical,
    },
    {
      label: locale === 'en' ? 'People' : 'लोगों से संवाद',
      value:
        share.dimensionSnapshot['people-reactive'] + share.dimensionSnapshot['people-proactive'],
    },
    {
      label: locale === 'en' ? 'Structure' : 'व्यवस्था',
      value: share.dimensionSnapshot['process-ops'],
    },
    {
      label: locale === 'en' ? 'Creative' : 'रचनात्मकता',
      value: share.dimensionSnapshot['creative-output'],
    },
  ];

  return (
    <main className="section-shell">
      <div className="container-main max-w-5xl">
        <section className="workspace-hero overflow-hidden">
          <p className="eyebrow-copy">
            {locale === 'en' ? 'Shared fit card' : 'साझा fit card'}
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.08fr,0.92fr]">
            <div className="space-y-5">
              <h1 className="text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                {locale === 'en'
                  ? `${share.firstName} looks closest to ${getLocaleValue(share.roleName, locale)}.`
                  : `${share.firstName} के लिए सबसे नज़दीकी दिशा ${getLocaleValue(share.roleName, locale)} लगती है।`}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)]">
                {getLocaleValue(share.roleSummary, locale)}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link className="btn-primary" href="/career-fit-check?src=share">
                  {locale === 'en'
                    ? 'Find which track fits you - free, 12 minutes'
                    : 'देखें कौन-सी दिशा आपके लिए सही है - मुफ़्त, 12 मिनट'}
                </Link>
                <Link className="btn-outline" href="/">
                  {locale === 'en' ? 'Back to home' : 'होम पर लौटें'}
                </Link>
              </div>
              {query.src === 'share' ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  {locale === 'en'
                    ? 'Opened from a shared link.'
                    : 'यह एक साझा लिंक से खोला गया है।'}
                </p>
              ) : null}
            </div>

            <article className="story-card border border-[var(--border-soft)] bg-white/95 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Fit card' : 'Fit card'}
              </p>
              <div className="mt-4 rounded-[1.25rem] bg-[linear-gradient(135deg,var(--wash-saffron),#fff9ef)] p-5">
                <p className="text-sm font-semibold text-[var(--accent-ink)]">
                  {locale === 'en' ? 'First name only' : 'केवल पहला नाम'}
                </p>
                <h2 className="mt-2 text-3xl text-[var(--brand-ink)]">{share.firstName}</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                  {getLocaleValue(share.roleName, locale)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {dimensions.map((item) => (
                    <div className="rounded-[1rem] border border-white/70 bg-white/90 p-3" key={item.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--ink-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--accent-ink)]">
                        {item.value}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-[1rem] border border-[var(--border-soft)] bg-[var(--wash-forest)] px-4 py-3 text-sm text-[var(--ink-soft)]">
                {locale === 'en'
                  ? 'Free fit check. No login needed until the results step.'
                  : 'मुफ़्त fit check. परिणामों तक कोई login नहीं चाहिए।'}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
