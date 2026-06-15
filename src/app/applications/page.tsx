'use client';

import { useEffect, useState, useTransition } from 'react';
import { getStoredLocale } from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { Locale } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';

interface ApplicationItem {
  id: string;
  companyName: string;
  roleTitle: string;
  status: 'applied' | 'interview' | 'offered' | 'rejected';
  applicationDate: string;
  notes: string;
}

const STATUS_LABELS: Record<ApplicationItem['status'], Record<Locale, string>> = {
  applied: { en: 'Applied', hi: 'आवेदन किया' },
  interview: { en: 'Interview', hi: 'साक्षात्कार' },
  offered: { en: 'Offered', hi: 'प्रस्ताव मिला' },
  rejected: { en: 'Rejected', hi: 'चयन नहीं हुआ' },
};

const STATUS_STYLES: Record<ApplicationItem['status'], string> = {
  applied: 'bg-slate-100 text-slate-700',
  interview: 'bg-amber-100 text-amber-800',
  offered: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function ApplicationsPage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const [locale, setLocale] = useState<Locale>('en');
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [form, setForm] = useState({
    companyName: '',
    roleTitle: '',
    notes: '',
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const syncLocale = () => setLocale(getStoredLocale());
    syncLocale();
    window.addEventListener('locale-change', syncLocale);
    return () => window.removeEventListener('locale-change', syncLocale);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const load = async () => {
      const response = await fetch('/api/applications');
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: {
          applications: ApplicationItem[];
        };
      };
      setApplications(payload.data?.applications || []);
    };

    void load();
  }, [user]);

  const appliedCount = applications.filter((item) => item.status === 'applied').length;
  const interviewCount = applications.filter((item) => item.status === 'interview').length;
  const offeredCount = applications.filter((item) => item.status === 'offered').length;

  const createApplication = () => {
    if (!user || !form.companyName || !form.roleTitle) return;

    startTransition(async () => {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: {
          application: ApplicationItem;
        };
      };
      const nextApplication = payload.data?.application;
      if (nextApplication) {
        setApplications((current) => [nextApplication, ...current]);
        setForm({ companyName: '', roleTitle: '', notes: '' });
      }
    });
  };

  const updateStatus = (applicationId: string, status: ApplicationItem['status']) => {
    if (!user) return;

    startTransition(async () => {
      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          status,
        }),
      });
      if (!response.ok) return;
      setApplications((current) =>
        current.map((item) => (item.id === applicationId ? { ...item, status } : item))
      );
    });
  };

  if (loading) {
    return (
      <FullPageLoader
        eyebrow="Applications tracker"
        title="Loading your applications..."
        message="We are opening your tracker and recent follow-up history."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Applications tracker"
        title="Redirecting to sign in..."
        message="Your application tracker is protected, so we are taking you to your account flow."
      />
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-8">
        <section className="workspace-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Applications tracker' : 'आवेदन सूची'}
              </p>
              <h1 className="mt-3 text-4xl leading-tight text-slate-950 sm:text-5xl">
                {locale === 'en'
                  ? 'Track every application and keep follow-through visible.'
                  : 'हर आवेदन और अगले संपर्क को स्पष्ट रूप से दर्ज रखें।'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {locale === 'en'
                  ? 'This is your calm tracking layer for realistic openings, recruiter movement, and next follow-ups.'
                  : 'उपयुक्त अवसरों, भर्ती प्रक्रिया की स्थिति और अगले संपर्क का लेखा यहाँ एक सरल जगह पर रखें।'}
              </p>
            </div>

            <div className="story-card max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Pipeline health' : 'आवेदन की स्थिति'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{applications.length}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {locale === 'en'
                  ? 'Use this to stay honest about momentum instead of relying on memory.'
                  : 'याददाश्त पर निर्भर रहने के बजाय अपनी वास्तविक प्रगति देखने के लिए इसका उपयोग करें।'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Applied' : 'आवेदन'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{appliedCount}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Interview' : 'साक्षात्कार'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{interviewCount}</p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Offered' : 'प्रस्ताव'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{offeredCount}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.78fr,1.22fr]">
          <div className="route-shell space-y-4">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Add an application' : 'नया आवेदन जोड़ें'}
              </p>
              <h2 className="mt-3 text-3xl text-slate-950">
                {locale === 'en'
                  ? 'Add a real application, not just an intention.'
                  : 'सिर्फ योजना नहीं, वास्तव में किया गया आवेदन दर्ज करें।'}
              </h2>
            </div>

            <input
              className="input-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyName: event.target.value,
                }))
              }
              aria-label={locale === 'en' ? 'Company name' : 'कंपनी का नाम'}
              placeholder={locale === 'en' ? 'Company name' : 'कंपनी का नाम'}
              value={form.companyName}
            />
            <input
              className="input-field"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  roleTitle: event.target.value,
                }))
              }
              aria-label={locale === 'en' ? 'Role title' : 'पद का नाम'}
              placeholder={locale === 'en' ? 'Role title' : 'पद का नाम'}
              value={form.roleTitle}
            />
            <textarea
              className="input-field min-h-[8rem]"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder={
                locale === 'en'
                  ? 'Where you applied, who referred you, or when you should follow up.'
                  : 'आवेदन कहाँ किया, किसने सुझाव दिया, या अगला संपर्क कब करना है।'
              }
              value={form.notes}
            />
            <button className="btn-primary" onClick={createApplication} type="button">
              {isPending
                ? locale === 'en'
                  ? 'Saving...'
                  : 'सहेजा जा रहा है...'
                : locale === 'en'
                  ? 'Log application'
                  : 'आवेदन दर्ज करें'}
            </button>
          </div>

          <div className="route-shell space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-copy">
                  {locale === 'en' ? 'Recent applications' : 'हाल के आवेदन'}
                </p>
                <h2 className="mt-3 text-3xl text-slate-950">
                  {locale === 'en'
                    ? 'Your visible follow-through list.'
                    : 'आपके आवेदनों और अगले कदमों की स्पष्ट सूची।'}
                </h2>
              </div>
            </div>

            {applications.length ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <article className="step-panel" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          {application.companyName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{application.roleTitle}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[application.status]}`}
                      >
                        {STATUS_LABELS[application.status][locale]}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {application.notes || (locale === 'en' ? 'No notes yet.' : 'अभी कोई टिप्पणी नहीं।')}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(Object.keys(STATUS_LABELS) as ApplicationItem['status'][]).map((status) => (
                        <button
                          className={
                            status === application.status ? 'btn-primary' : 'btn-outline'
                          }
                          key={`${application.id}-${status}`}
                          onClick={() => updateStatus(application.id, status)}
                          type="button"
                        >
                          {STATUS_LABELS[status][locale]}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="story-card">
                <p className="text-lg text-[var(--brand-ink)]">
                  {locale === 'en'
                    ? 'No applications logged yet.'
                    : 'अभी तक कोई आवेदन दर्ज नहीं किया गया है।'}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {locale === 'en'
                    ? 'Start with one real opening so the rest of your job search feels concrete.'
                    : 'एक वास्तविक अवसर से शुरुआत करें, ताकि नौकरी की खोज ठोस और स्पष्ट लगे।'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
