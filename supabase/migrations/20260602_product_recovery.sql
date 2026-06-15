create extension if not exists pgcrypto;

create table if not exists public.job_coach_users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_coach_assessments (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  selected_role text,
  role_scores jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('completed', 'in_progress')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_coach_assessments_user_created
  on public.job_coach_assessments (user_id, created_at desc);

create table if not exists public.job_coach_resumes (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  title text not null default '',
  summary text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_job_coach_resumes_user_unique
  on public.job_coach_resumes (user_id);

create table if not exists public.job_coach_applications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  company_name text not null,
  role_title text not null,
  status text not null default 'applied' check (status in ('applied', 'interview', 'offered', 'rejected')),
  application_date timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_coach_applications_user_created
  on public.job_coach_applications (user_id, created_at desc);

create table if not exists public.job_coach_action_plans (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  role_id text not null,
  week_number integer not null default 1,
  tasks jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_coach_action_plans_user_status
  on public.job_coach_action_plans (user_id, status, created_at desc);

create unique index if not exists idx_job_coach_action_plans_one_active
  on public.job_coach_action_plans (user_id)
  where status = 'active';

create table if not exists public.job_coach_nudges (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  role_id text,
  locale text not null default 'en' check (locale in ('en', 'hi')),
  title jsonb not null,
  body jsonb not null,
  tone text not null check (tone in ('info', 'action', 'celebration')),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_coach_nudges_user_created
  on public.job_coach_nudges (user_id, created_at desc);

create table if not exists public.job_coach_agent_messages (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  agent_type text not null check (agent_type in ('coach', 'assessment', 'resume', 'planner')),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  locale text not null default 'en' check (locale in ('en', 'hi')),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_coach_agent_messages_user_agent_created
  on public.job_coach_agent_messages (user_id, agent_type, created_at desc);

create table if not exists public.job_coach_agent_sessions (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.job_coach_users(id) on delete cascade,
  agent_type text not null check (agent_type in ('coach', 'assessment', 'resume', 'planner')),
  state jsonb not null default '{}'::jsonb,
  last_active_at timestamptz not null default now()
);

create unique index if not exists idx_job_coach_agent_sessions_user_agent
  on public.job_coach_agent_sessions (user_id, agent_type);

alter table public.job_coach_users enable row level security;
alter table public.job_coach_assessments enable row level security;
alter table public.job_coach_resumes enable row level security;
alter table public.job_coach_applications enable row level security;
alter table public.job_coach_action_plans enable row level security;
alter table public.job_coach_nudges enable row level security;
alter table public.job_coach_agent_messages enable row level security;
alter table public.job_coach_agent_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'job_coach_users' and policyname = 'job_coach_users_select_own'
  ) then
    create policy job_coach_users_select_own on public.job_coach_users
      for select using (auth.uid()::text = id);
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'job_coach_assessments',
    'job_coach_resumes',
    'job_coach_applications',
    'job_coach_action_plans',
    'job_coach_nudges',
    'job_coach_agent_messages',
    'job_coach_agent_sessions'
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
