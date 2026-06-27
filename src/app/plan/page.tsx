'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getStoredLocale,
} from '@/lib/client-session';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { ROLE_DEFINITIONS, getLocaleValue, type Locale, type RoleId } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';
import { differenceInDays, isToday, isPast } from 'date-fns';
import { CheckCircle2, BookOpen, Target, Users, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';

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

const CATEGORY_ICONS = {
  skill: BookOpen,
  assessment: Target,
  networking: Users,
  project: FolderKanban,
};

const CATEGORY_LABELS: Record<NonNullable<PlanTask['category']>, Record<Locale, string>> = {
  skill: { en: 'Skill', hi: 'कौशल' },
  assessment: { en: 'Assessment', hi: 'मूल्यांकन' },
  networking: { en: 'Networking', hi: 'संपर्क' },
  project: { en: 'Project', hi: 'परियोजना' },
};


function getDueDateLabel(dueDate: string, locale: Locale): { label: string; color: string } {
  const date = new Date(dueDate);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isToday(date)) {
    return {
      label: locale === 'en' ? 'Due today' : 'आज देय है',
      color: 'text-amber-600 font-medium',
    };
  }
  if (isPast(date)) {
    const days = Math.abs(differenceInDays(today, date));
    return {
      label: locale === 'en' ? `Overdue ${days}d` : `${days} दिन विलंब`,
      color: 'text-rose-600 font-medium',
    };
  }
  const days = differenceInDays(date, today);
  return {
    label: locale === 'en' ? `Due in ${days}d` : `${days} दिन में`,
    color: days <= 2 ? 'text-amber-500 font-medium' : 'text-[var(--ink-muted)]',
  };
}

export default function PlanPage() {
  const { user, loading } = useCurrentUser({ requireAuth: true });
  const {
    assessment,
    selectedRoleId: persistedSelectedRoleId,
    loading: assessmentLoading,
  } = useAssessmentState();
  const [locale, setLocale] = useState<Locale>('en');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);

  const queryClient = useQueryClient();

  const { data: plan, isPending: planLoading } = useQuery({
    queryKey: ['plan'],
    queryFn: async () => {
      const locale = getStoredLocale();
      const existing = await fetch('/api/plan');
      if (existing.ok) {
        const payload = (await existing.json()) as {
          data?: { plan: PlanData };
        };
        return payload.data?.plan ?? null;
      }

      const roleId = (persistedSelectedRoleId || assessment?.topRoles?.[0]?.roleId) as
        | RoleId
        | undefined;
      if (!assessment || !roleId) return null;

      const created = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-locale': locale,
        },
        body: JSON.stringify({ roleId, profile: assessment.profile }),
      });
      if (!created.ok) return null;
      const payload = (await created.json()) as {
        data?: { plan: PlanData };
      };
      return { ...payload.data?.plan, roleId } as PlanData;
    },
    enabled: !!user && !assessmentLoading,
  });

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

    const previousPlan = plan;
    queryClient.setQueryData<PlanData>(['plan'], {
      ...plan,
      tasks: plan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !completed } : task
      ),
    });

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
      if (!response.ok) {
        queryClient.setQueryData(['plan'], previousPlan);
        toast.error(
          locale === 'en'
            ? 'Could not update that task. Please try again.'
            : 'यह कार्य अपडेट नहीं हो सका। कृपया फिर से प्रयास करें।'
        );
        return;
      }
      const payload = (await response.json()) as {
        data?: {
          plan: PlanData;
        };
      };
      if (payload.data?.plan) {
        queryClient.setQueryData(['plan'], {
          ...payload.data.plan,
          roleId: selectedRoleId || undefined,
        });
      }
    });
  };

  if (loading || assessmentLoading || planLoading) {
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
            <div className="story-card mt-6 flex flex-col items-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wash-forest)]">
                <FolderKanban aria-hidden="true" className="text-[var(--accent-ink)]" size={26} />
              </span>
              <h1 className="mt-5 text-2xl font-semibold leading-tight text-[var(--ink-strong)]">
                {locale === 'en'
                  ? 'Complete your fit check to unlock your weekly plan.'
                  : 'अपनी साप्ताहिक योजना पाने के लिए योग्यता जाँच पूरी करें।'}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--ink-muted)]">
                {locale === 'en'
                  ? 'Your weekly plan is built around your selected role. It takes about 5–7 minutes to set up.'
                  : 'आपकी साप्ताहिक योजना चुनी हुई भूमिका के आधार पर बनती है। इसे तैयार करने में 5–7 मिनट लगते हैं।'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link className="btn-primary" href="/career-fit-check">
                  {locale === 'en' ? 'Start career fit check' : 'योग्यता जाँच शुरू करें'}
                </Link>
                <Link className="btn-outline" href="/dashboard">
                  {locale === 'en' ? 'Back to dashboard' : 'कार्यस्थल पर वापस जाएँ'}
                </Link>
              </div>
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
              <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                {locale === 'en'
                  ? 'A realistic weekly plan tied to your selected role.'
                  : 'आपकी चुनी हुई भूमिका से जुड़ी एक व्यावहारिक साप्ताहिक योजना।'}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Progress' : 'प्रगति'}
              </p>
              <p className="mt-3 text-5xl font-semibold text-[var(--accent-ink)]">{progress}%</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {locale === 'en'
                  ? `${completedTasks} of ${totalTasks} tasks completed`
                  : `${totalTasks} में से ${completedTasks} कार्य पूरे`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Skill' : 'कौशल'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {groupedCounts.skill}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Assessment' : 'मूल्यांकन'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {groupedCounts.assessment}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Networking' : 'संपर्क'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
                {groupedCounts.networking}
              </p>
            </div>
            <div className="metric-tile p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                {locale === 'en' ? 'Project' : 'परियोजना'}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[var(--accent-ink)]">
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
                  {task.completed ? (
                    <CheckCircle2 aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-[var(--accent-ink)]" />
                  ) : (
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{task.title}</h2>
                      {task.category ? (() => {
                        const CatIcon = CATEGORY_ICONS[task.category];
                        return (
                          <span className="inline-flex items-center gap-1 accent-chip">
                            {CatIcon ? <CatIcon aria-hidden="true" size={11} /> : null}
                            {CATEGORY_LABELS[task.category][locale]}
                          </span>
                        );
                      })() : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                      {task.description}
                    </p>
                    {task.dueDate ? (() => {
                        const due = getDueDateLabel(task.dueDate, locale);
                        return (
                          <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${due.color}`}>
                            {due.label}
                          </p>
                        );
                      })() : null}
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
              <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-ink)]">
                  {locale === 'en' ? 'Selected role' : 'चुनी हुई भूमिका'}
                </p>
                <h2 className="mt-3 text-2xl text-[var(--ink-strong)]">
                  {getLocaleValue(selectedRole.name, locale)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
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
              <p className="text-sm text-[var(--ink-muted)]">
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
