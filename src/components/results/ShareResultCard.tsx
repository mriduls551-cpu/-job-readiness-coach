'use client';

import { useMemo, useState } from 'react';
import { captureProductEvent } from '@/lib/analytics';
import { getStoredUser } from '@/lib/client-session';
import { getFirstName } from '@/lib/presentation';
import { getLocaleValue, type AssessmentResult, type Locale, type RoleMatch } from '@/lib/product';

const copy = {
  en: {
    eyebrow: 'Share card',
    title: 'Turn this result into a shareable card.',
    body: 'Create a first-name-only link with a WhatsApp-friendly preview.',
    action: 'Share fit card',
    creating: 'Creating link...',
    shared: 'Share link ready.',
    fallback: 'Open WhatsApp',
    copyLink: 'Copy link',
    copied: 'Link copied.',
    error: 'We could not create the share link right now.',
    previewTitle: 'Preview',
    previewLabel: 'First name only',
    firstNameFallback: 'You',
    linkHint: 'Public link',
  },
  hi: {
    eyebrow: 'Share card',
    title: 'इस परिणाम को shareable card में बदलें।',
    body: 'पहले नाम तक सीमित link बनाइए, जिसमें WhatsApp-friendly preview हो।',
    action: 'Fit card share करें',
    creating: 'Link बन रहा है...',
    shared: 'Share link तैयार है।',
    fallback: 'WhatsApp खोलें',
    copyLink: 'Link copy करें',
    copied: 'Link copy हो गया।',
    error: 'अभी share link नहीं बन पाया।',
    previewTitle: 'Preview',
    previewLabel: 'केवल पहला नाम',
    firstNameFallback: 'आप',
    linkHint: 'Public link',
  },
} as const;

function buildShareUrl(publicUrl: string) {
  const url = new URL(publicUrl, window.location.origin);
  url.searchParams.set('src', 'share');
  return url.toString();
}

function buildShareText(locale: Locale, firstName: string, roleLabel: string) {
  if (locale === 'en') {
    return `${firstName} looks closest to ${roleLabel}.`;
  }

  return `${firstName} के लिए सबसे नज़दीकी दिशा ${roleLabel} लगती है।`;
}

function shareUrlLabel(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

type ShareMethod = 'native' | 'whatsapp' | 'copy';

export function ShareResultCard({
  locale,
  selectedMatch,
  assessment,
}: {
  locale: Locale;
  selectedMatch: RoleMatch;
  assessment: AssessmentResult;
}) {
  const currentCopy = copy[locale];
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const previewName = useMemo(() => {
    const storedUser = getStoredUser();
    return getFirstName(storedUser?.name, currentCopy.firstNameFallback);
  }, [currentCopy.firstNameFallback]);

  const dimensionPreview = useMemo(
    () =>
      [
        {
          label: locale === 'en' ? 'Numbers' : 'संख्यात्मक',
          value: assessment.dimensionSnapshot.numerical,
        },
        {
          label: locale === 'en' ? 'People' : 'लोग',
          value:
            assessment.dimensionSnapshot['people-reactive'] +
            assessment.dimensionSnapshot['people-proactive'],
        },
        {
          label: locale === 'en' ? 'Structure' : 'व्यवस्था',
          value: assessment.dimensionSnapshot['process-ops'],
        },
      ] as const,
    [assessment.dimensionSnapshot, locale]
  );

  async function copyLink(url: string) {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(url);
    return true;
  }

  async function createShare() {
    if (status === 'creating') {
      return;
    }

    setStatus('creating');
    setMessage('');
    setErrorMessage('');

    void captureProductEvent('share_clicked', {
      locale,
      selected_role_id: selectedMatch.roleId,
    });

    try {
      const response = await fetch('/api/assessment/shares', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-locale': locale,
        },
        credentials: 'include',
        body: JSON.stringify({
          selectedRoleId: selectedMatch.roleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to create share');
      }

      const payload = (await response.json()) as {
        data?: {
          share?: {
            publicId: string;
            publicUrl: string;
            firstName: string;
          };
        };
      };

      const share = payload.data?.share;
      if (!share) {
        throw new Error('Missing share payload');
      }

      const url = buildShareUrl(share.publicUrl);
      setShareUrl(url);

      const roleLabel = getLocaleValue(selectedMatch.role.shortLabel, locale);
      const text = buildShareText(locale, share.firstName || previewName, roleLabel);
      const method: ShareMethod =
        typeof navigator.share === 'function' && window.isSecureContext ? 'native' : 'whatsapp';

      if (method === 'native') {
        await navigator.share({
          title: `${share.firstName || previewName} - ${roleLabel}`,
          text,
          url,
        });
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        if (await copyLink(url)) {
          setMessage(currentCopy.copied);
        }
      }

      setStatus('ready');
      setMessage((currentMessage) => currentMessage || currentCopy.shared);
      void captureProductEvent('share_completed', {
        locale,
        selected_role_id: selectedMatch.roleId,
        share_method: method,
        public_id: share.publicId,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle');
        return;
      }

      setStatus('error');
      setErrorMessage(currentCopy.error);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) {
      await createShare();
      return;
    }

    try {
      await copyLink(shareUrl);
      setMessage(currentCopy.copied);
      setStatus('ready');
    } catch {
      setStatus('error');
      setErrorMessage(currentCopy.error);
    }
  }

  return (
    <section className="route-shell border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(255,255,255,0.98))]">
      <p className="eyebrow-copy">{currentCopy.eyebrow}</p>
      <h2 className="mt-4 text-2xl leading-tight text-[var(--ink-strong)]">{currentCopy.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{currentCopy.body}</p>

      <article className="mt-5 overflow-hidden rounded-[1.6rem] border border-[var(--border-soft)] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
        <div className="bg-[linear-gradient(135deg,var(--wash-saffron),#fffdf6)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
            {currentCopy.previewTitle}
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--accent-ink)]">
                {currentCopy.previewLabel}
              </p>
              <h3 className="mt-1 text-3xl text-[var(--brand-ink)]">{previewName}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                {getLocaleValue(selectedMatch.role.shortLabel, locale)}
              </p>
            </div>
            <div className="rounded-full bg-white/85 px-4 py-2 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Confidence' : 'भरोसा'}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--accent-ink)]">
                {assessment.confidenceBand}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {dimensionPreview.map((item) => (
              <div className="rounded-[1rem] border border-white/75 bg-white/92 p-3" key={item.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--accent-ink)]">{item.value}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-[1rem] border border-[var(--border-soft)] bg-[var(--wash-forest)] px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
            {locale === 'en'
              ? 'The public link keeps only a first name and the selected direction.'
              : 'Public link में केवल पहला नाम और चुनी हुई दिशा रहती है।'}
          </div>

          {shareUrl ? (
            <p className="text-xs text-[var(--ink-muted)]">
              {currentCopy.linkHint}: {shareUrlLabel(shareUrl)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="btn-primary"
              disabled={status === 'creating'}
              onClick={() => void createShare()}
              type="button"
            >
              {status === 'creating' ? currentCopy.creating : currentCopy.action}
            </button>
            <button
              className="btn-outline"
              disabled={!shareUrl && status === 'creating'}
              onClick={() => void handleCopyLink()}
              type="button"
            >
              {currentCopy.copyLink}
            </button>
          </div>

          {status === 'ready' && shareUrl ? (
            <a
              className="inline-flex rounded-full bg-[var(--accent-ink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              href={shareUrl}
              rel="noreferrer"
              target="_blank"
            >
              {currentCopy.fallback}
            </a>
          ) : null}

          {message ? <p className="text-sm font-medium text-[var(--accent-ink)]">{message}</p> : null}
          {errorMessage ? (
            <p className="text-sm font-medium text-amber-800">{errorMessage}</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
