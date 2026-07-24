-- WerkOS Phase 1 schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.organization_role as enum (
    'owner',
    'office_employee',
    'field_employee',
    'customer'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  );
exception when duplicate_object then null;
end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Memberships
create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Staff (office/field) may belong to exactly one organization
create unique index if not exists organization_memberships_staff_one_org
  on public.organization_memberships (user_id)
  where role in ('office_employee', 'field_employee');

-- Exactly one owner per organization
create unique index if not exists organization_memberships_one_owner
  on public.organization_memberships (organization_id)
  where role = 'owner';

-- Onboarding drafts
create table if not exists public.onboarding_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  step text not null default 'company',
  company_name text,
  industry text,
  industry_other text,
  office_seats integer not null default 0 check (office_seats >= 0),
  field_seats integer not null default 0 check (field_seats >= 0),
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status public.subscription_status not null default 'incomplete',
  trial_ends_at timestamptz,
  office_seats integer not null default 0 check (office_seats >= 0),
  field_seats integer not null default 0 check (field_seats >= 0),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists onboarding_drafts_set_updated_at on public.onboarding_drafts;
create trigger onboarding_drafts_set_updated_at
  before update on public.onboarding_drafts
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership helpers for RLS
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.user_has_organization()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.user_id = auth.uid()
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.onboarding_drafts enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Organizations
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  using (public.is_org_member(id));

-- Memberships
drop policy if exists "memberships_select_own_orgs" on public.organization_memberships;
create policy "memberships_select_own_orgs"
  on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
  );

-- Onboarding drafts
drop policy if exists "onboarding_select_own" on public.onboarding_drafts;
create policy "onboarding_select_own"
  on public.onboarding_drafts for select
  using (auth.uid() = user_id);

drop policy if exists "onboarding_insert_own" on public.onboarding_drafts;
create policy "onboarding_insert_own"
  on public.onboarding_drafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "onboarding_update_own" on public.onboarding_drafts;
create policy "onboarding_update_own"
  on public.onboarding_drafts for update
  using (auth.uid() = user_id);

drop policy if exists "onboarding_delete_own" on public.onboarding_drafts;
create policy "onboarding_delete_own"
  on public.onboarding_drafts for delete
  using (auth.uid() = user_id);

-- Subscriptions readable by org members
drop policy if exists "subscriptions_select_member" on public.subscriptions;
create policy "subscriptions_select_member"
  on public.subscriptions for select
  using (public.is_org_member(organization_id));

-- Privileges for PostgREST roles (RLS still applies)
grant usage on schema public to anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.organizations to authenticated;
grant select on table public.organization_memberships to authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.onboarding_drafts to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.organizations to service_role;
grant all on table public.organization_memberships to service_role;
grant all on table public.subscriptions to service_role;
grant all on table public.onboarding_drafts to service_role;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.user_has_organization() to authenticated;