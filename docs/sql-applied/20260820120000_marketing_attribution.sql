-- WerkOS: marketing attribution + analytics event idempotency

-- First-touch attribution on profiles (never overwrite once set)
alter table public.profiles
  add column if not exists acquisition_source text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists wbraid text,
  add column if not exists gbraid text,
  add column if not exists first_touch_at timestamptz,
  add column if not exists signup_at timestamptz,
  add column if not exists company_created_at timestamptz,
  add column if not exists first_project_at timestamptz,
  add column if not exists first_quote_at timestamptz,
  add column if not exists subscription_started_at timestamptz;

comment on column public.profiles.acquisition_source is
  'First-touch acquisition channel (e.g. google, direct). Never overwrite once set.';
comment on column public.profiles.gclid is
  'First-touch Google Ads click id. Never overwrite once set.';

-- Org-level paid conversion timestamp (idempotent subscription_started)
alter table public.organizations
  add column if not exists subscription_started_at timestamptz;

-- Dedup log for GA4 / business events (unique per logical conversion)
create table if not exists public.analytics_event_log (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  dedupe_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint analytics_event_log_dedupe_unique unique (dedupe_key)
);

create index if not exists analytics_event_log_event_name_idx
  on public.analytics_event_log (event_name, created_at desc);

alter table public.analytics_event_log enable row level security;

drop policy if exists "analytics_event_log_select_super_admin" on public.analytics_event_log;
create policy "analytics_event_log_select_super_admin"
  on public.analytics_event_log for select
  using (public.is_super_admin());

-- Writes go through service role only
grant select on table public.analytics_event_log to authenticated;
grant all on table public.analytics_event_log to service_role;
