-- WerkOS: first-run guided setup flags on profiles

alter table public.profiles
  add column if not exists guided_setup_intro_completed_at timestamptz,
  add column if not exists guided_setup_dismissed_at timestamptz;

comment on column public.profiles.guided_setup_intro_completed_at is
  'When the user finished or skipped the in-app first-steps intro sheet';
comment on column public.profiles.guided_setup_dismissed_at is
  'When the user hid the dashboard first-steps checklist';
