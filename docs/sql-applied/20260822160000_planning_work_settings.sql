-- Planning work-day settings per organization (run in Supabase SQL editor)

alter table public.organizations
  add column if not exists planning_work_days smallint[] not null default '{1,2,3,4,5}',
  add column if not exists planning_day_start_hour smallint not null default 7,
  add column if not exists planning_day_end_hour smallint not null default 17,
  add column if not exists planning_setup_completed_at timestamptz;

comment on column public.organizations.planning_work_days is
  'ISO weekdays with work: 1=Mon … 7=Sun';
comment on column public.organizations.planning_day_start_hour is
  'Inclusive start hour (0–23) for calendar grid and scheduling cap';
comment on column public.organizations.planning_day_end_hour is
  'Exclusive end hour (0–24) for calendar grid and scheduling cap';
comment on column public.organizations.planning_setup_completed_at is
  'Set when org completes first-time planning setup wizard';

alter table public.organizations
  drop constraint if exists organizations_planning_hours_check;

alter table public.organizations
  add constraint organizations_planning_hours_check
  check (
    planning_day_start_hour >= 0
    and planning_day_end_hour <= 24
    and planning_day_end_hour > planning_day_start_hour
  );
