'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  getStoredLocale,
} from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { ROLE_DEFINITIONS, getLocaleValue, type Locale, type RoleId } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';
import { getFirstName } from '@/lib/presentation';

interface DashboardSnapshot {
  assessment: any;
  reminders: Array<{
    id: string;
    title: Record<Locale, string>;
    body: Record<Locale, string>;
    tone: 'info' | 'action' | 'celebration';
  }>;
  applications: Array<{
    id: string;
    companyName: string;
    roleTitle: string;
    status: 'applied' | 'interview' | 'offered' | 'rejected';
  }>;
  plan: {
    id: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium';
      completed: boolean;
    }>;
  } | null;
  resume: {
    id: string;
    title: string;
    updatedAt: string;
  } | null;
  selectedRole?: string | null;
}

export default function DashboardPage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const { assessment, selectedRoleId: persistedSelectedRoleId } = useAssessmentState();
  const [locale, setLocale] = useState<Locale>('en');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

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
      const response = await fetch('/api/dashboard', {
        headers: {
          'x-user-locale': locale,
        },
      });

      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: {
          snapshot: DashboardSnapshot;
        };
      };
      setSnapshot(payload.data?.snapshot || null);
    };

    void load();
  }, [locale, user]);

  const selectedRoleId =
    ((snapshot?.selectedRole || persistedSelectedRoleId || assessment?.topRoles?.[0]?.roleId) as
      | RoleId
      | undefined) || null;
  const selectedRole = selectedRoleId ? ROLE_DEFINITIONS[selectedRoleId] : null;

  const selectedRationale = useMemo(() => {
    if (!selectedRoleId) return '';
    return (
      assessment?.topRoles?.find((item) => item.roleId === selectedRoleId)?.rationale?.[
        locale
      ] || ''
    );
  }, [assessment?.topRoles, locale, selectedRoleId]);

  const completedTasks =
    snapshot?.plan?.tasks?.filter((task) => task.completed).length || 0;
  const totalTasks = snapshot?.plan?.tasks?.length || 0;
  const planProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const latestApplications = snapshot?.applications?.slice(0, 3) || [];
  const firstName = getFirstName(user?.name, locale === 'en' ? 'there' : 'दोस्त');

  if (loading) {
    return (
      <FullPageLoader
        eyebrow="Personal workspace"
        title="Loading your dashboard…"
        message="We’re pulling together your role, plan, resume, and reminders."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Personal workspace"
        title="Redirecting to sign in…"
        message="Your dashboard is protected, so we’re taking you back to your account flow."
      />
    );
  }

  // New user — no assessment yet. Show a clear starting point.
  const hasAssessment = !!(snapshot?.assessment || assessment?.topRoles?.length);
  if (snapshot !== null && !hasAssessment && !loading) {
    return (
      <main className="section-shell">
        <div className="container-main max-w-2xl">
          <section className="workspace-hero">
            <p className="eyebrow-copy">
              {locale === 'en' ? 'Personal workspace' : 'पर्सनल वर्कस्पेस'}
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-slate-950">
              {locale === 'en'
                ? `Welcome, ${firstName}. Let's find your best-fit role.`
                : `स्वागत है, ${firstName}। आइए आपके लिए सबसे उपयुक्त भूमिका खोजें।`}
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {locale === 'en'
                ? 'Start with a 5–7 minute career fit check. It will suggest your top entry-level roles and build your resume and weekly plan around them.'
                : '5–7 मिनट की योग्यता जाँच शुरू करें। यह आपके लिए उपयुक्त शुरुआती भूमिकाएँ सुझाएगी और उनके आधार पर जीवनवृत्त तथा साप्ताहिक योजना बनाएगी।'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/career-fit-check">
                {locale === 'en' ? 'Start career fit check' : 'योग्यता जाँच शुरू करें'}
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {locale === 'en'
                ? '⚡ Takes 5–7 minutes • Free • Bilingual'
                : '5–7 मिनट • बिल्कुल मुफ़्त • हिंदी और अंग्रेज़ी'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-6">
        <section className="workspace-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Personal workspace' : 'पर्सनल वर्कस्पेस'}
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-slate-950 sm:text-5xl">
                {locale === 'en'
                  ? `Hi ${firstName}, keep your job search moving with one calm system.`
                  : `नमस्ते ${firstName}, अपनी नौकरी की खोज को एक सरल व्यवस्था के साथ आगे बढ़ाइए।`}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {locale === 'en'
                  ? 'Your selected role, resume progress, weekly plan, reminders, and application momentum now live in one place.'
                  : 'आपकी चुनी हुई भूमिका, जीवनवृत्त की प्रगति, साप्ताहिक योजना, स्मरण और आवेदन अब एक ही जगह जुड़े हुए हैं।'}
              </p>
            </div>

            <div className="progress-orbit" aria-label={`${planProgress}%`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Plan progress' : 'योजना की प्रगति'}
              </p>
              <div
                className="progress-orbit__ring"
                style={{ '--progress': `${planProgress * 3.6}deg` } as CSSProperties}
              >
                <span>{planProgress}%</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {locale === 'en'
                  ? `${completedTasks} of ${totalTasks} tasks completed`
                  : `${totalTasks} में से ${completedTasks} कार्य पूरे`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="workspace-section">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Current role direction' : 'वर्तमान करियर दिशा'}
              </p>
              <h2 className="mt-2 text-3xl leading-tight text-slate-950">
                {selectedRole ? getLocaleValue(selectedRole.name, locale) : '--'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedRationale ||
                  (selectedRole
                    ? getLocaleValue(selectedRole.summary, locale)
                    : locale === 'en'
                      ? 'Choose a role from your fit-check to anchor the rest of your journey.'
                      : 'अपनी योग्यता जाँच से एक भूमिका चुनें, ताकि आगे की पूरी तैयारी उसी दिशा में रहे।')}
              </p>
              {assessment?.topRoles?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {assessment.topRoles.map((match) => (
                    <span className="accent-chip" key={match.roleId}>
                      {getLocaleValue(match.role.shortLabel, locale)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

              <div className="metric-strip">
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {locale === 'en' ? 'Resume' : 'जीवनवृत्त'}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                  {snapshot?.resume ? '1' : '0'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {snapshot?.resume
                    ? locale === 'en'
                      ? 'Draft initialized'
                      : 'प्रारूप तैयार'
                    : locale === 'en'
                      ? 'Not started'
                      : 'शुरू नहीं हुआ'}
                </p>
              </div>
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {locale === 'en' ? 'Applications' : 'आवेदन'}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                  {snapshot?.applications?.length || 0}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === 'en'
                    ? 'Tracked in one place'
                    : 'एक ही जगह दर्ज'}
                </p>
              </div>
              <div className="metric-tile p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {locale === 'en' ? 'This week' : 'इस हफ्ते'}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">{totalTasks}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === 'en' ? 'Tasks in motion' : 'चल रहे कार्य'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr,1.08fr]">
          <div className="space-y-6">
            <div className="workspace-section">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Quick actions' : 'त्वरित कार्य'}
              </p>
              <div className="mt-5 grid gap-3">
                <Link className="btn-primary" href="/resume">
                  {locale === 'en' ? 'Open resume workspace' : 'जीवनवृत्त पर काम करें'}
                </Link>
                <Link className="btn-secondary" href="/applications">
                  {locale === 'en' ? 'Track applications' : 'आवेदन दर्ज करें'}
                </Link>
                <Link className="btn-outline" href="/plan">
                  {locale === 'en' ? 'View weekly plan' : 'साप्ताहिक योजना देखें'}
                </Link>
                <Link className="btn-outline" href="/interview">
                  {locale === 'en' ? 'Interview prep' : 'साक्षात्कार की तैयारी'}
                </Link>
              </div>
            </div>

            <div className="workspace-section">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Timely reminders' : 'समय पर स्मरण'}
              </p>
              <div className="mt-5 space-y-3">
                {snapshot?.reminders?.map((reminder) => (
                  <article
                    className="workspace-row"
                    key={reminder.id}
                  >
                    <h2 className="text-lg font-semibold text-slate-950">
                      {reminder.title[locale]}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {reminder.body[locale]}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="workspace-section">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="eyebrow-copy">
                    {locale === 'en' ? 'This week' : 'इस हफ्ते'}
                  </p>
                  <h2 className="mt-3 text-3xl text-slate-950">
                    {locale === 'en'
                      ? 'Keep momentum on the highest-leverage tasks.'
                      : 'सबसे उपयोगी कार्यों पर अपनी गति बनाए रखें।'}
                  </h2>
                </div>
                <span className="rounded-full bg-[#ebf7f5] px-4 py-2 text-sm font-semibold text-[#0a5a60]">
                  {planProgress}%
                </span>
              </div>

              {snapshot?.plan?.tasks?.length ? (
                <div className="mt-5 space-y-3">
                  {snapshot.plan.tasks.slice(0, 4).map((task) => (
                    <div
                      className={`workspace-row flex items-start justify-between gap-4 ${
                        task.completed
                          ? 'workspace-row--complete'
                          : ''
                      }`}
                      key={task.id}
                    >
                      <div>
                        <h3 className="font-semibold text-slate-950">{task.title}</h3>
                        <p className="mt-1 text-sm leading-7 text-slate-600">
                          {task.description}
                        </p>
                      </div>
                      <span className="accent-chip">
                        {task.completed
                          ? locale === 'en'
                            ? 'Done'
                            : 'पूरा'
                          : task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.4rem] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  {locale === 'en'
                    ? 'Create your first weekly plan from the resume workspace or after choosing your top role.'
                    : 'जीवनवृत्त बनाते समय या अपनी प्रमुख भूमिका चुनने के बाद पहली साप्ताहिक योजना तैयार करें।'}
                </div>
              )}
            </div>

            <div className="workspace-section">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Recent applications' : 'हाल के आवेदन'}
              </p>
              {latestApplications.length ? (
                <div className="mt-5 space-y-3">
                  {latestApplications.map((application) => (
                    <div
                      className="workspace-row flex items-center justify-between"
                      key={application.id}
                    >
                      <div>
                        <h3 className="font-semibold text-slate-950">
                          {application.companyName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {application.roleTitle}
                        </p>
                      </div>
                      <span className="accent-chip">{application.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.4rem] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  {locale === 'en'
                    ? 'No applications tracked yet. Start with 5 realistic openings tied to your selected role.'
                    : 'अभी कोई आवेदन दर्ज नहीं है। अपनी चुनी हुई भूमिका से जुड़े 5 उपयुक्त अवसरों से शुरुआत करें।'}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
