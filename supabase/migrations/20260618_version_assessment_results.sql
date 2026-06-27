alter table public.job_coach_assessments
  add column if not exists result_snapshot jsonb,
  add column if not exists scoring_version text,
  add column if not exists catalog_version text;

comment on column public.job_coach_assessments.result_snapshot is
  'Immutable deterministic result returned when the assessment was completed.';
comment on column public.job_coach_assessments.scoring_version is
  'Version of the scoring formula used for result_snapshot.';
comment on column public.job_coach_assessments.catalog_version is
  'Version of the role policy catalog used for result_snapshot.';
