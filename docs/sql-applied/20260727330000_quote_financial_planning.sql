-- WerkOS: offertenummer + financiële planning (billing phases)

-- Offertenummer OFF-YYYY-NNNN
alter table public.quotes
  add column if not exists quote_number text;

create unique index if not exists quotes_org_number_uidx
  on public.quotes (organization_id, quote_number)
  where quote_number is not null;

create or replace function public.next_quote_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now() at time zone 'europe/amsterdam', 'YYYY');
  prefix text := 'OFF-' || yr || '-';
  max_n integer;
begin
  select coalesce(max(
    nullif(regexp_replace(quote_number, '^OFF-[0-9]{4}-', ''), '')::integer
  ), 0)
  into max_n
  from public.quotes
  where organization_id = org_id
    and quote_number ~ ('^OFF-' || yr || '-[0-9]+$');

  return prefix || lpad((max_n + 1)::text, 4, '0');
end;
$$;

create or replace function public.quotes_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.quote_number is null or btrim(new.quote_number) = '' then
    new.quote_number := public.next_quote_number(new.organization_id);
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_assign_number on public.quotes;
create trigger quotes_assign_number
  before insert on public.quotes
  for each row execute function public.quotes_assign_number();

-- Backfill bestaande offertes zonder nummer
update public.quotes q
set quote_number = public.next_quote_number(q.organization_id)
where q.quote_number is null;

-- Billing phases
do $$ begin
  create type public.quote_billing_phase_kind as enum ('standard', 'final');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.quote_billing_amount_type as enum ('percent', 'fixed_cents');
exception when duplicate_object then null;
end $$;

create table if not exists public.quote_billing_phases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  kind public.quote_billing_phase_kind not null default 'standard',
  amount_type public.quote_billing_amount_type not null default 'percent',
  amount_value integer not null default 0,
  invoice_id uuid references public.invoices (id) on delete set null,
  invoiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_billing_phases_title_not_blank check (length(btrim(title)) > 0),
  constraint quote_billing_phases_amount_nonneg check (amount_value >= 0)
);

create index if not exists quote_billing_phases_quote_id_idx
  on public.quote_billing_phases (quote_id);
create index if not exists quote_billing_phases_organization_id_idx
  on public.quote_billing_phases (organization_id);

drop trigger if exists quote_billing_phases_set_updated_at on public.quote_billing_phases;
create trigger quote_billing_phases_set_updated_at
  before update on public.quote_billing_phases
  for each row execute function public.set_updated_at();

create or replace function public.enforce_quote_billing_phase_org()
returns trigger
language plpgsql
as $$
declare
  quote_org uuid;
begin
  select organization_id into quote_org
  from public.quotes
  where id = new.quote_id;

  if quote_org is null then
    raise exception 'quote not found';
  end if;

  if quote_org <> new.organization_id then
    raise exception 'quote must belong to the same organization as the billing phase';
  end if;

  return new;
end;
$$;

drop trigger if exists quote_billing_phases_enforce_org on public.quote_billing_phases;
create trigger quote_billing_phases_enforce_org
  before insert or update of quote_id, organization_id on public.quote_billing_phases
  for each row execute function public.enforce_quote_billing_phase_org();

alter table public.quote_billing_phases enable row level security;

drop policy if exists "quote_billing_phases_select_member" on public.quote_billing_phases;
create policy "quote_billing_phases_select_member"
  on public.quote_billing_phases for select
  using (public.is_org_member(organization_id));

drop policy if exists "quote_billing_phases_insert_staff" on public.quote_billing_phases;
create policy "quote_billing_phases_insert_staff"
  on public.quote_billing_phases for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "quote_billing_phases_update_staff" on public.quote_billing_phases;
create policy "quote_billing_phases_update_staff"
  on public.quote_billing_phases for update
  using (public.is_org_staff(organization_id));

drop policy if exists "quote_billing_phases_delete_staff" on public.quote_billing_phases;
create policy "quote_billing_phases_delete_staff"
  on public.quote_billing_phases for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "quote_billing_phases_select_super_admin" on public.quote_billing_phases;
create policy "quote_billing_phases_select_super_admin"
  on public.quote_billing_phases for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.quote_billing_phases to authenticated;
grant all on table public.quote_billing_phases to service_role;
