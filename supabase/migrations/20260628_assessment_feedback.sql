alter table public.job_coach_assessments
  add column if not exists feedback text
  check (feedback in ('yes', 'somewhat', 'no'));

comment on column public.job_coach_assessments.feedback is
  'Candidate feedback on whether the fit-check result felt right.';
