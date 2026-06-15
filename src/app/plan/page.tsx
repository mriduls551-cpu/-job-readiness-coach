'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getStoredLocale,
} from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { ROLE_DEFINITIONS, getLocaleValue, type Locale, type RoleId } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';

interface PlanTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium';
  completed: boolean;
  category?: 'skill' | 'project' | 'assessment' | 'networking';
  dueDate?: string;
}

interface PlanData {
  id: string;
  roleId?: RoleId;
  tasks: PlanTask[];
}

export default function PlanPage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const {
    assessment,
    selectedRoleId: persistedSelectedRoleId,
    loading: assessmentLoading,
  } = useAssessmentState();
  const [locale, setLocale] = useState<Locale>('en');
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const nextLocale = getStoredLocale();
    setLocale(nextLocale);

    if (!user) {
      return;
    }

    const load = async () => {
      const existing = await fetch('/api/plan');
      if (existing.ok) {
        const payload = (await existing.json()) as {
          data?: {
            plan: PlanData;
          };
        };
        setPlan(payload.data?.plan || null);
        return;
      }

      const roleId = (persistedSelectedRoleId || assessment?.topRoles?.[0]?.roleId) as
        | RoleId
        | undefined;
      if (!assessment || !roleId) return;

      const created = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': nextLocale,
        },
        body: JSON.stringify({
          roleId,
          profile: assessment.profile,
        }),
      });
      if (!created.ok) return;
      const payload = (await created.json()) as {
        data?: {
          plan: PlanData;
        };
      };
      setPlan({
        ...payload.data?.plan,
        roleId,
      } as PlanData);
    };

    void load();
  }, [assessment, persistedSelectedRoleId, user]);

  const selectedRoleId =
    plan?.roleId || persistedSelectedRoleId || assessment?.topRoles?.[0]?.roleId || null;
  const selectedRole = selectedRoleId ? ROLE_DEFINITIONS[selectedRoleId] : null;
  const completedTasks = plan?.tasks.filter((task) => task.completed).length || 0;
  const totalTasks = plan?.tasks.length || 0;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const groupedCounts = useMemo(() => {
    const counts = {
      skill: 0,
      assessment: 0,
      networking: 0,
      project: 0,
    };

    plan?.tasks.forEach((task) => {
      if (task.category && task.category in counts) {
        counts[task.category] += 1;
      }
    });

    return counts;
  }, [plan?.tasks]);

  const toggleTask = (taskId: string, completed: boolean) => {
    if (!plan || !user) return;

    startTransition(async () => {
      const response = await fetch('/api/plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          taskId,
          completed: !completed,
        }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data?: {
          plan: PlanData;
        };
      };
      if (payload.data?.plan) {
        setPlan({
          ...payload.data.plan,
          roleId: selectedRoleId || undefined,
        });
      }
    });
  };

  if (loading || assessmentLoading) {
    return (
      <FullPageLoader
        eyebrow="Weekly plan"
        title="Loading your weekly plan…"
        message="We’re checking your selected role and plan progress now."
      />
    );
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Weekly plan"
        title="Redirecting to sign in…"
        message="Your weekly plan lives inside your account, so we’re routing you there."
      />
    );
  }

  if (!plan) {
    return (
      <main className="section-shell">
        <div className="container-main max-w-2xl">
          <section className="workspace-hero">
            <p className="eyebrow-copy">
              {locale === 'en' ? 'Weekly plan' : 'साप्ताहिक योजना'}
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-slate-950">
              {locale === 'en'
                ? 'Complete your fit check to unlock your weekly plan.'
                : 'अपनी साप्ताहिक योजना पाने के लिए योग्यता जाँच पूरी करें।'}
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {locale === 'en'
                ? 'Your weekly plan is built around your selected role. It takes about 5–7 minutes to set up.'
                : 'आपकी साप्ताहिक योजना चुनी हुई भूमिका के आधार पर बनती है। इसे तैयार करने में 5–7 मिनट लगते हैं।'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/career-fit-check">
                {locale === 'en' ? 'Start career fit check' : 'योग्यता जाँच शुरू करें'}
              </Link>
              <Link className="btn-outline" href="/dashboard">
                {locale === 'en' ? 'Back to dashboard' : 'कार्यस्थल पर वापस जाएँ'}
              </Link>
            </div>
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
                {locale === 'en' ? 'Weekly plan' : 'साप्ताहिक योजना'}
              </p>
              <h1 className="mt-4 text-4xl leading-tight text-slate-950 sm:text-5xl">
                {locale === 'en'
                  ? 'A realistic weekly plan tied to your selected role.'
                  : 'आपकी चुनी हुई भूमिका से जुड़ी एक व्यावहारिक साप्ताहिक योजना।'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
                {selectedRole
                  ? locale === 'en'
                    ? `${getLocaleValue(selectedRole.shortLabel, locale)} is your current direction, so these tasks are meant to tighten your resume, sharpen your story, and move applications forward.`
                    : `${getLocaleValue(selectedRole.shortLabel, locale)} आपकी वर्तमान दिशा है, इसलिए ये कार्य जीवनवृत्त, परिचय और आवेदनों को आगे बढ़ाने के लिए हैं।`
                  : locale === 'en'
                    ? 'These are the highest-leverage next steps for this week.'
                    : 'ये इस सप्ताह के सबसे उपयोगी अगले कदम हैं।'}
              </p>
            </div>

            <div className="story-card max-w-sm text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Progress' : 'प्रगति'}
              </p>
              <p className="mt-3 text-5xl font-semibold text-[#0a5a60]">{progress}%</p>
              <p className="mt-2 text-sm text-slate-600">
                {locale === 'en'
                  ? `${completedTasks} of ${totalTasks} tasks completed`
                  : `${totalTasks} में से ${completedTasks} कार्य पूरे`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Skill' : 'कौशल'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                {groupedCounts.skill}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Assessment' : 'मूल्यांकन'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                {groupedCounts.assessment}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Networking' : 'संपर्क'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                {groupedCounts.networking}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {locale === 'en' ? 'Project' : 'परियोजना'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#0a5a60]">
                {groupedCounts.project}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-4">
            {plan.tasks.map((task, index) => (
              <button
                className={`selection-option flex items-start justify-between gap-4 px-5 py-5 text-left ${task.completed ? 'selection-option--active' : ''}`}
                key={task.id}
                onClick={() => toggleTask(task.id, task.completed)}
                type="button"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#0a5a60] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{task.title}</h2>
                      {task.category ? (
                        <span className="accent-chip">{task.category}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {task.description}
                    </p>
                    {task.dueDate ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {locale === 'en' ? 'Due' : 'अंतिम तिथि'}{' '}
                        {new Date(task.dueDate).toLocaleDateString(locale === 'en' ? 'en-IN' : 'hi-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="accent-chip">
                  {task.completed
                    ? locale === 'en'
                      ? 'Done'
                      : 'पूरा'
                    : task.priority}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div className="route-shell">
              <p className="eyebrow-copy">
                {locale === 'en' ? 'Why this plan works' : 'यह योजना क्यों उपयोगी है'}
              </p>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                <p>
                  {locale === 'en'
                    ? 'The first task is usually the highest leverage move for your selected role.'
                    : 'पहला कार्य आमतौर पर चुनी हुई भूमिका के लिए सबसे उपयोगी कदम होता है।'}
                </p>
                <p>
                  {locale === 'en'
                    ? 'The middle tasks tighten either your resume, your fit story, or your proof of work.'
                    : 'बीच के कार्य आपके जीवनवृत्त, भूमिका से मेल और काम के प्रमाण को मजबूत करते हैं।'}
                </p>
                <p>
                  {locale === 'en'
                    ? 'The final task is there to create visible application momentum, not perfect preparation.'
                    : 'अंतिम कार्य पूर्णता की प्रतीक्षा करने के बजाय आवेदनों में वास्तविक गति बनाने के लिए है।'}
                </p>
              </div>
            </div>

            {selectedRole ? (
              <div className="route-shell bg-[rgba(255,255,255,0.78)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a5a60]">
                  {locale === 'en' ? 'Selected role' : 'चुनी हुई भूमिका'}
                </p>
                <h2 className="mt-3 text-2xl text-slate-950">
                  {getLocaleValue(selectedRole.name, locale)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {getLocaleValue(selectedRole.summary, locale)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedRole.strengths.map((item) => (
                    <span className="accent-chip" key={`${selectedRole.id}-${item.en}`}>
                      {getLocaleValue(item, locale)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Link className="btn-primary" href="/applications">
                {locale === 'en' ? 'Track applications' : 'आवेदन दर्ज करें'}
              </Link>
              <Link className="btn-outline" href="/resume">
                {locale === 'en' ? 'Open resume workspace' : 'जीवनवृत्त पर काम करें'}
              </Link>
              <Link className="btn-secondary" href="/dashboard">
                {locale === 'en' ? 'Back to dashboard' : 'कार्यस्थल पर वापस जाएँ'}
              </Link>
            </div>

            {isPending ? (
              <p className="text-sm text-slate-500">
                {locale === 'en'
                  ? 'Updating your progress...'
                  : 'आपकी प्रगति सहेजी जा रही है...'}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
