-- WerkOS: invoices (facturen)

do $$ begin
  create type public.invoice_status as enum (
    'draft',
    'open',
    'sent',
    'paid'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_number text not null,
  sequence_number integer not null,
  title text not null,
  status public.invoice_status not null default 'draft',
  issue_date date not null default (timezone('europe/amsterdam', now()))::date,
  due_date date,
  paid_at timestamptz,
  subtotal_cents integer not null default 0,
  vat_cents integer not null default 0,
  total_cents integer not null default 0,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_title_not_blank check (length(btrim(title)) > 0),
  constraint invoices_money_nonneg check (
    subtotal_cents >= 0 and vat_cents >= 0 and total_cents >= 0
  )
);

create unique index if not exists invoices_org_number_uidx
  on public.invoices (organization_id, invoice_number);

create unique index if not exists invoices_org_sequence_uidx
  on public.invoices (organization_id, sequence_number);

create index if not exists invoices_organization_id_idx on public.invoices (organization_id);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists invoices_status_idx on public.invoices (organization_id, status);
create index if not exists invoices_due_date_idx on public.invoices (organization_id, due_date);

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create or replace function public.next_invoice_sequence(org_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  max_n integer;
begin
  select coalesce(max(sequence_number), 10000)
  into max_n
  from public.invoices
  where organization_id = org_id;

  return max_n + 1;
end;
$$;

create or replace function public.next_invoice_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now() at time zone 'europe/amsterdam', 'YYYY');
  prefix text := 'INV-' || yr || '-';
  max_n integer;
begin
  select coalesce(max(
    nullif(regexp_replace(invoice_number, '^INV-[0-9]{4}-', ''), '')::integer
  ), 0)
  into max_n
  from public.invoices
  where organization_id = org_id
    and invoice_number ~ ('^INV-' || yr || '-[0-9]+$');

  return prefix || lpad((max_n + 1)::text, 4, '0');
end;
$$;

create or replace function public.invoices_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or btrim(new.invoice_number) = '' then
    new.invoice_number := public.next_invoice_number(new.organization_id);
  end if;
  if new.sequence_number is null or new.sequence_number <= 0 then
    new.sequence_number := public.next_invoice_sequence(new.organization_id);
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_assign_number on public.invoices;
create trigger invoices_assign_number
  before insert on public.invoices
  for each row execute function public.invoices_assign_number();

create or replace function public.enforce_invoice_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  quote_org uuid;
  quote_project uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null then
    raise exception 'project not found';
  end if;
  if project_org <> new.organization_id then
    raise exception 'project must belong to the same organization';
  end if;

  if new.quote_id is not null then
    select organization_id, project_id into quote_org, quote_project
    from public.quotes
    where id = new.quote_id;

    if quote_org is null then
      raise exception 'quote not found';
    end if;
    if quote_org <> new.organization_id then
      raise exception 'quote must belong to the same organization';
    end if;
    if quote_project <> new.project_id then
      raise exception 'quote must belong to the selected project';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_enforce_links on public.invoices;
create trigger invoices_enforce_links
  before insert or update of organization_id, project_id, quote_id on public.invoices
  for each row execute function public.enforce_invoice_links();

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  parent_id uuid references public.invoice_lines (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  description text,
  quantity numeric(12, 3) not null default 1,
  unit text,
  unit_price_cents integer not null default 0,
  vat_rate_bps integer not null default 2100,
  discount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  constraint invoice_lines_title_not_blank check (length(btrim(title)) > 0),
  constraint invoice_lines_qty_nonneg check (quantity >= 0),
  constraint invoice_lines_money_nonneg check (
    unit_price_cents >= 0 and discount_cents >= 0 and vat_rate_bps >= 0
  )
);

create index if not exists invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

drop policy if exists "invoices_select_member" on public.invoices;
create policy "invoices_select_member"
  on public.invoices for select
  using (public.is_org_member(organization_id));

drop policy if exists "invoices_insert_staff" on public.invoices;
create policy "invoices_insert_staff"
  on public.invoices for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "invoices_update_staff" on public.invoices;
create policy "invoices_update_staff"
  on public.invoices for update
  using (public.is_org_staff(organization_id));

drop policy if exists "invoices_delete_staff" on public.invoices;
create policy "invoices_delete_staff"
  on public.invoices for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "invoices_select_super_admin" on public.invoices;
create policy "invoices_select_super_admin"
  on public.invoices for select
  using (public.is_super_admin());

drop policy if exists "invoice_lines_select_member" on public.invoice_lines;
create policy "invoice_lines_select_member"
  on public.invoice_lines for select
  using (public.is_org_member(organization_id));

drop policy if exists "invoice_lines_insert_staff" on public.invoice_lines;
create policy "invoice_lines_insert_staff"
  on public.invoice_lines for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "invoice_lines_update_staff" on public.invoice_lines;
create policy "invoice_lines_update_staff"
  on public.invoice_lines for update
  using (public.is_org_staff(organization_id));

drop policy if exists "invoice_lines_delete_staff" on public.invoice_lines;
create policy "invoice_lines_delete_staff"
  on public.invoice_lines for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.invoice_lines to authenticated;
grant all on table public.invoices to service_role;
grant all on table public.invoice_lines to service_role;
