-- Platform admin foundation: audit log + manual operating costs

create table if not exists public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_audit_log_created_at_idx
  on public.platform_audit_log (created_at desc);

create index if not exists platform_audit_log_actor_idx
  on public.platform_audit_log (actor_user_id);

alter table public.platform_audit_log enable row level security;

drop policy if exists "platform_audit_log_select_super_admin" on public.platform_audit_log;
create policy "platform_audit_log_select_super_admin"
  on public.platform_audit_log for select
  using (public.is_super_admin());

-- Manual operating costs for platform administration (belasting / boekhouding)
do $$ begin
  create type public.platform_cost_category as enum (
    'software',
    'hosting',
    'marketing',
    'office',
    'professional_services',
    'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.platform_operating_costs (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  vendor text,
  category public.platform_cost_category not null default 'other',
  amount_cents integer not null check (amount_cents >= 0),
  vat_rate_bps integer not null default 2100
    check (vat_rate_bps >= 0 and vat_rate_bps <= 10000),
  invoice_date date not null,
  invoice_reference text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_operating_costs_invoice_date_idx
  on public.platform_operating_costs (invoice_date desc);

alter table public.platform_operating_costs enable row level security;

drop policy if exists "platform_operating_costs_select_super_admin" on public.platform_operating_costs;
create policy "platform_operating_costs_select_super_admin"
  on public.platform_operating_costs for select
  using (public.is_super_admin());

drop policy if exists "platform_operating_costs_insert_super_admin" on public.platform_operating_costs;
create policy "platform_operating_costs_insert_super_admin"
  on public.platform_operating_costs for insert
  with check (public.is_super_admin());

drop policy if exists "platform_operating_costs_update_super_admin" on public.platform_operating_costs;
create policy "platform_operating_costs_update_super_admin"
  on public.platform_operating_costs for update
  using (public.is_super_admin());

drop policy if exists "platform_operating_costs_delete_super_admin" on public.platform_operating_costs;
create policy "platform_operating_costs_delete_super_admin"
  on public.platform_operating_costs for delete
  using (public.is_super_admin());
