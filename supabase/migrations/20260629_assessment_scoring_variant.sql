alter table public.job_coach_assessments
  add column if not exists scoring_variant text;

comment on column public.job_coach_assessments.scoring_variant is
  'Experiment variant used for the deterministic scoring config on this assessment.';
