'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAssessmentState } from '@/hooks/useAssessmentState';
import { ROLE_DEFINITIONS, getLocaleValue, type Locale, type RoleId } from '@/lib/product';
import { FullPageLoader } from '@/components/FullPageLoader';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { getFirstName } from '@/lib/presentation';
import { MapPin, FileText, Briefcase, CheckSquare } from 'lucide-react';

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
  const locale = useAppStore((state) => state.locale);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

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

  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  const selectedRoleId =
    ((snapshot?.selectedRole || persistedSelectedRoleId || assessment?.topRoles?.[0]?.roleId) as
      | RoleId
      | undefined) || null;
  const selectedRole = selectedRoleId ? ROLE_DEFINITIONS[selectedRoleId] : null;

  const completedTasks = snapshot?.plan?.tasks?.filter((task) => task.completed).length || 0;
  const totalTasks = snapshot?.plan?.tasks?.length || 0;
  const planProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const latestApplications = snapshot?.applications?.slice(0, 3) || [];
  const firstName = getFirstName(user?.name, locale === 'en' ? 'there' : 'dost');
  const hasAssessment = !!(snapshot?.assessment || assessment?.topRoles?.length);
  const hasResume = !!snapshot?.resume;
  const hasPlan = totalTasks > 0;
  const hasApplications = (snapshot?.applications?.length || 0) > 0;
  const roleChips = assessment?.topRoles?.slice(0, 3) || [];
  const completedJourneySteps =
    Number(hasAssessment) +
    Number(!!selectedRole) +
    Number(hasResume) +
    Number(hasPlan) +
    Number(hasApplications);

  const journeySteps = [
    {
      id: 'fit-check',
      title: copy('Finish fit check', 'Fit check poori karein'),
      detail: copy('Unlock realistic role matches.', 'Vastavik role matches dekhein.'),
      complete: hasAssessment,
      href: '/career-fit-check',
    },
    {
      id: 'role',
      title: copy('Lock one role direction', 'Ek role direction chunen'),
      detail: copy('Carry it into resume and plan.', 'Resume aur plan ko usi se jodiye.'),
      complete: !!selectedRole,
      href: '/results',
    },
    {
      id: 'resume',
      title: copy('Build your resume draft', 'Resume draft banaiye'),
      detail: copy('Turn your role fit into a sharper story.', 'Role fit ko ek spasht kahani banaiye.'),
      complete: hasResume,
      href: '/resume',
    },
    {
      id: 'plan',
      title: copy('Start weekly plan', 'Weekly plan shuru karein'),
      detail: copy('Focus on the highest-leverage work first.', 'Sabse upyogi kaam par dhyan rakhein.'),
      complete: hasPlan,
      href: '/plan',
    },
    {
      id: 'applications',
      title: copy('Track real applications', 'Vastavik applications track karein'),
      detail: copy('Make follow-through visible.', 'Agle steps ko visible rakhein.'),
      complete: hasApplications,
      href: '/applications',
    },
  ];

  const nextStep = !hasAssessment
    ? {
        eyebrow: copy('Next best step', 'Agla sabse upyogi kadam'),
        title: copy('Start your fit check and get a grounded direction.', 'Fit check shuru karke ek spasht direction paaiye.'),
        body: copy(
          'Five to seven minutes now unlocks your role matches, resume draft, weekly plan, and interview prep.',
          '5 se 7 minute ab lagane se aapke role matches, resume draft, weekly plan aur interview prep unlock ho jayenge.'
        ),
        primaryLabel: copy('Start fit check', 'Fit check shuru karein'),
        primaryHref: '/career-fit-check',
        secondaryLabel: copy('See landing page', 'Landing page dekhein'),
        secondaryHref: '/',
      }
    : !hasResume
      ? {
          eyebrow: copy('Next best step', 'Agla sabse upyogi kadam'),
          title: copy('Turn your selected role into a resume draft.', 'Apni chuni hui role ko resume draft mein badaliye.'),
          body: copy(
            'Your top role is ready. The fastest progress now is writing a role-aware resume before random applications start.',
            'Aapki top role taiyar hai. Ab sabse tez progress ek role-aware resume likhne se aayegi.'
          ),
          primaryLabel: copy('Open resume workspace', 'Resume workspace kholiye'),
          primaryHref: '/resume',
          secondaryLabel: copy('Review role matches', 'Role matches dekhein'),
          secondaryHref: '/results',
        }
      : !hasPlan
        ? {
            eyebrow: copy('Next best step', 'Agla sabse upyogi kadam'),
            title: copy('Set this week up before the search gets noisy.', 'Is hafte ko set karein, phir search ko aage badhaiye.'),
            body: copy(
              'Your resume is underway. Add a weekly plan so the next actions stay visible and realistic.',
              'Resume progress mein hai. Ab weekly plan jodiye taaki agle kadam visible aur realistic rahein.'
            ),
            primaryLabel: copy('View weekly plan', 'Weekly plan dekhein'),
            primaryHref: '/plan',
            secondaryLabel: copy('Open resume workspace', 'Resume workspace kholiye'),
            secondaryHref: '/resume',
          }
        : !hasApplications
          ? {
              eyebrow: copy('Next best step', 'Agla sabse upyogi kadam'),
              title: copy('Log the first real applications this week.', 'Is hafte pehle real applications log karein.'),
              body: copy(
                'The prep work is taking shape. Tracking applications now will keep momentum honest instead of fuzzy.',
                'Preparation shape le rahi hai. Ab applications track karne se momentum spasht rahega.'
              ),
              primaryLabel: copy('Track applications', 'Applications track karein'),
              primaryHref: '/applications',
              secondaryLabel: copy('Refine weekly plan', 'Weekly plan sudhariye'),
              secondaryHref: '/plan',
            }
          : {
              eyebrow: copy('Next best step', 'Agla sabse upyogi kadam'),
              title: copy('Keep the system moving with one focused session.', 'Ek focused session se poori system ko aage badhaiye.'),
              body: copy(
                'You already have the core pieces in place. Use today to close one plan task, update one application, and rehearse one interview story.',
                'Core pieces jagah par hain. Aaj ek plan task poora kijiye, ek application update kijiye aur ek interview story rehearse kijiye.'
              ),
              primaryLabel: copy('Open weekly plan', 'Weekly plan kholiye'),
              primaryHref: '/plan',
              secondaryLabel: copy('Open interview prep', 'Interview prep kholiye'),
              secondaryHref: '/interview',
            };

  const metrics = [
    {
      label: copy('Journey done', 'Journey poori hui'),
      value: `${completedJourneySteps}/5`,
      detail: copy('Core steps unlocked', 'Zaroori steps unlock hue'),
      icon: MapPin,
      active: completedJourneySteps > 0,
      done: completedJourneySteps === 5,
    },
    {
      label: copy('Resume', 'Resume'),
      value: hasResume ? copy('Ready', 'Ready') : copy('Start', 'Start'),
      detail: hasResume
        ? copy('Draft in workspace', 'Draft workspace mein hai')
        : copy('Needs first pass', 'Pehla pass baaki hai'),
      icon: FileText,
      active: hasResume,
      done: hasResume,
    },
    {
      label: copy('Applications', 'Applications'),
      value: String(snapshot?.applications?.length || 0),
      detail: copy('Visible follow-through', 'Follow-through saaf dikhega'),
      icon: Briefcase,
      active: (snapshot?.applications?.length || 0) > 0,
      done: false,
    },
    {
      label: copy('This week', 'Is hafte'),
      value: totalTasks ? `${completedTasks}/${totalTasks}` : '0',
      detail: copy('Tasks completed', 'Tasks poore hue'),
      icon: CheckSquare,
      active: completedTasks > 0,
      done: totalTasks > 0 && completedTasks === totalTasks,
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <FullPageLoader
        eyebrow="Personal workspace"
        title="Redirecting to sign in..."
        message="Your dashboard is protected, so we're taking you back to your account flow."
      />
    );
  }

  if (snapshot !== null && !hasAssessment) {
    return (
      <main className="section-shell">
        <div className="container-main space-y-5">
          <section className="workspace-hero">
            <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
              <div>
                <p className="eyebrow-copy">{copy('Personal workspace', 'Aapka workspace')}</p>
                <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                  {copy(
                    `Welcome, ${firstName}. Let's build your direction step by step.`,
                    `Swagat hai, ${firstName}. Chaliye aapki direction step by step banate hain.`
                  )}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                  {copy(
                    'This workspace becomes useful quickly once you finish the fit check. It will anchor your role direction, resume, weekly plan, and applications in one place.',
                    'Fit check poori hote hi yeh workspace kaafi upyogi ho jata hai. Isi se aapki role direction, resume, weekly plan aur applications ek jagah judte hain.'
                  )}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link className="btn-primary" href="/career-fit-check">
                    {copy('Start career fit check', 'Career fit check shuru karein')}
                  </Link>
                  <Link className="btn-outline" href="/">
                    {copy('Back to landing', 'Landing par wapas')}
                  </Link>
                </div>
              </div>

              <div className="route-shell bg-white/90">
                <p className="eyebrow-copy">{copy('What unlocks next', 'Aage kya unlock hoga')}</p>
                <div className="mt-5 space-y-3">
                  {journeySteps.map((step, index) => (
                    <div className="workspace-row flex items-start gap-4" key={step.id}>
                      <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-ink)] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="font-semibold text-[var(--ink-strong)]">{step.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="section-shell">
      <div className="container-main space-y-5">
        <section className="workspace-hero">
          <div className="grid gap-5 xl:grid-cols-[1.25fr,0.75fr]">
            <div className="space-y-5">
              <div>
                <p className="eyebrow-copy">{copy('Personal workspace', 'Aapka workspace')}</p>
                <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-strong)] sm:text-5xl">
                  {copy(
                    `Hi ${firstName}, your search now has one working home base.`,
                    `Namaste ${firstName}, ab aapki search ka ek working home base hai.`
                  )}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
                  {copy(
                    'Role direction, resume progress, weekly plan, reminders, and applications now move together instead of living in separate tabs.',
                    'Role direction, resume progress, weekly plan, reminders aur applications ab alag-alag tabs mein bikharne ke bajay ek saath move karte hain.'
                  )}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {roleChips.length ? (
                    roleChips.map((match) => (
                      <span className="accent-chip" key={match.roleId}>
                        {getLocaleValue(match.role.shortLabel, locale)}
                      </span>
                    ))
                  ) : (
                    <span className="accent-chip">{copy('Role direction pending', 'Role direction pending')}</span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      className={`metric-tile p-4 transition ${metric.done ? 'ring-1 ring-[var(--accent-ink)]/20' : ''}`}
                      key={metric.label}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                          {metric.label}
                        </p>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${metric.done ? 'bg-[var(--accent-ink)]/10 text-[var(--accent-ink)]' : metric.active ? 'bg-[var(--accent-saffron)]/12 text-[var(--accent-saffron)]' : 'bg-[var(--wash-forest)] text-[var(--ink-muted)]'}`}>
                          <Icon size={14} aria-hidden="true" />
                        </span>
                      </div>
                      <p className={`mt-3 text-3xl font-semibold ${metric.done ? 'text-[var(--accent-ink)]' : metric.active ? 'text-[var(--accent-saffron)]' : 'text-[var(--ink-muted)]'}`}>
                        {metric.value}
                      </p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">{metric.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="route-shell bg-white/92">
                <p className="eyebrow-copy">{nextStep.eyebrow}</p>
                <h2 className="mt-3 text-3xl leading-tight text-[var(--ink-strong)]">{nextStep.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{nextStep.body}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="btn-primary" href={nextStep.primaryHref}>
                    {nextStep.primaryLabel}
                  </Link>
                  <Link className="btn-outline" href={nextStep.secondaryHref}>
                    {nextStep.secondaryLabel}
                  </Link>
                </div>
              </div>

              <div className="route-shell bg-[rgba(255,255,255,0.82)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow-copy">{copy('Plan progress', 'Plan ki progress')}</p>
                    <h2 className="mt-3 text-2xl text-[var(--ink-strong)]">
                      {copy('Keep the highest-leverage work moving.', 'Sabse upyogi kaam ko moving rakhiye.')}
                    </h2>
                  </div>
                  <div className="progress-orbit min-w-[9rem]" aria-label={`${planProgress}%`}>
                    <div
                      className="progress-orbit__ring"
                      style={{ '--progress': `${planProgress * 3.6}deg` } as CSSProperties}
                    >
                      <span>{planProgress}%</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                  {copy(
                    `${completedTasks} of ${totalTasks} tasks are already completed this week.`,
                    `Is hafte ${totalTasks} me se ${completedTasks} tasks poore ho chuke hain.`
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="route-shell bg-white/90">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow-copy">{copy('Journey checkpoint', 'Journey ka checkpoint')}</p>
                <h2 className="mt-3 text-3xl text-[var(--ink-strong)]">
                  {copy('See where you are, then move forward.', 'Apni progress dekhe, phir aage badhiye.')}
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  {copy(
                    `${completedJourneySteps} of ${journeySteps.length} milestones reached`,
                    `${journeySteps.length} me se ${completedJourneySteps} milestones poore`
                  )}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {journeySteps.map((step) => (
                <Link
                  className={`flex items-start gap-3 rounded-2xl px-4 py-3 transition hover:bg-[var(--wash-forest)] ${step.complete ? 'opacity-60' : ''}`}
                  href={step.href}
                  key={step.id}
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.complete ? 'bg-[var(--accent-ink)] text-white' : 'bg-[var(--border-soft)] text-[var(--ink-muted)]'}`}>
                    {step.complete ? '✓' : '·'}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${step.complete ? 'line-through text-[var(--ink-muted)]' : 'text-[var(--ink-strong)]'}`}>{step.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{step.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="route-shell">
            <p className="eyebrow-copy">
              {copy('Recent applications', 'हाल के आवेदन')}
            </p>
            {latestApplications.length ? (
              <div className="mt-5 space-y-3">
                {latestApplications.map((application) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--wash-forest)] px-4 py-3"
                    key={application.id}
                  >
                    <div>
                      <h3 className="font-semibold text-[var(--ink-strong)]">{application.companyName}</h3>
                      <p className="mt-0.5 text-sm text-[var(--ink-muted)]">{application.roleTitle}</p>
                    </div>
                    <span className="accent-chip">{application.status}</span>
                  </div>
                ))}
                <Link
                  className="mt-2 block text-center text-sm font-semibold text-[var(--accent-ink)]"
                  href="/applications"
                >
                  {copy('View all →', 'सभी देखें →')}
                </Link>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.4rem] bg-[var(--wash-forest)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
                {copy(
                  'No applications tracked yet. Start with 5 realistic openings tied to your selected role.',
                  'अभी कोई आवेदन दर्ज नहीं है। अपनी चुनी हुई भूमिका से जुड़े 5 उपयुक्त अवसरों से शुरुआत करें।'
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
