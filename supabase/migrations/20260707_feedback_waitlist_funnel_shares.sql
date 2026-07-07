-- Sprint 1-2 tables: assessment feedback, D1 fake-door waitlist, funnel events, public share cards.
-- Split out of 20260602_product_recovery.sql, which had already been applied to production and
-- therefore would never re-run with these additions.

create table if not exists public.job_coach_assessment_feedback (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  assessment_id text not null references public.job_coach_assessments(id) on delete cascade,
  rating text not null check (rating in ('helpful', 'unhelpful')),
  comment text not null default '',
  locale text not null default 'en' check (locale in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_job_coach_assessment_feedback_user_assessment
  on public.job_coach_assessment_feedback (user_id, assessment_id);

create index if not exists idx_job_coach_assessment_feedback_user_created
  on public.job_coach_assessment_feedback (user_id, created_at desc);

create table if not exists public.job_coach_d1_waitlist (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  assessment_id text not null references public.job_coach_assessments(id) on delete cascade,
  selected_role_id text not null,
  contact_consent boolean not null default false,
  note text not null default '',
  locale text not null default 'en' check (locale in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_job_coach_d1_waitlist_user_assessment
  on public.job_coach_d1_waitlist (user_id, assessment_id);

create index if not exists idx_job_coach_d1_waitlist_user_created
  on public.job_coach_d1_waitlist (user_id, created_at desc);

create table if not exists public.job_coach_funnel_events (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  locale text not null default 'en' check (locale in ('en', 'hi')),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_coach_funnel_events_user_created
  on public.job_coach_funnel_events (user_id, created_at desc);

create index if not exists idx_job_coach_funnel_events_name_created
  on public.job_coach_funnel_events (event_name, created_at desc);

create table if not exists public.job_coach_public_shares (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  assessment_id text not null references public.job_coach_assessments(id) on delete cascade,
  public_id text not null unique,
  first_name text not null,
  locale text not null default 'en' check (locale in ('en', 'hi')),
  role_id text not null,
  role_name jsonb not null,
  role_summary jsonb not null,
  dimension_snapshot jsonb not null,
  confidence_band text not null check (confidence_band in ('low', 'medium', 'high')),
  visit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_visited_at timestamptz
);

create index if not exists idx_job_coach_public_shares_user_created
  on public.job_coach_public_shares (user_id, created_at desc);

create index if not exists idx_job_coach_public_shares_public_id
  on public.job_coach_public_shares (public_id);

create unique index if not exists idx_job_coach_public_shares_user_assessment
  on public.job_coach_public_shares (user_id, assessment_id);

alter table public.job_coach_assessment_feedback enable row level security;
alter table public.job_coach_d1_waitlist enable row level security;
alter table public.job_coach_funnel_events enable row level security;
alter table public.job_coach_public_shares enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'job_coach_assessment_feedback',
    'job_coach_d1_waitlist',
    'job_coach_funnel_events',
    'job_coach_public_shares'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = table_name and policyname = table_name || '_select_own'
    ) then
      execute format(
        'create policy %I on public.%I for select using (auth.uid()::text = user_id)',
        table_name || '_select_own',
        table_name
      );
    end if;
  end loop;
end $$;
