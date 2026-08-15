-- WerkOS: guided setup flags on profiles (floating coach)

alter table public.profiles
  add column if not exists guided_setup_intro_completed_at timestamptz,
  add column if not exists guided_setup_dismissed_at timestamptz;

comment on column public.profiles.guided_setup_intro_completed_at is
  'Legacy intro flag; set together with dismiss when the user hides the coach';
comment on column public.profiles.guided_setup_dismissed_at is
  'When the user chose “Don’t show again” on the guided-setup coach';
