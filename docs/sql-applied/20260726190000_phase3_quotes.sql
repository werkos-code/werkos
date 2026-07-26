-- WerkOS Phase 3: quotes, quote lines, minimal work items

do $$ begin
  create type public.quote_status as enum (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_item_status as enum (
    'open',
    'done'
  );
exception when duplicate_object then null;
end $$;

-- Quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  status public.quote_status not null default 'draft',
  valid_until date,
  internal_notes text,
  external_notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_organization_id_idx on public.quotes (organization_id);
create index if not exists quotes_project_id_idx on public.quotes (project_id);
create index if not exists quotes_organization_status_idx on public.quotes (organization_id, status);

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

create or replace function public.enforce_quote_project_org()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null then
    raise exception 'project not found';
  end if;

  if project_org <> new.organization_id then
    raise exception 'project must belong to the same organization as the quote';
  end if;

  return new;
end;
$$;

drop trigger if exists quotes_enforce_project_org on public.quotes;
create trigger quotes_enforce_project_org
  before insert or update of project_id, organization_id on public.quotes
  for each row execute function public.enforce_quote_project_org();

-- Quote lines (hierarchical)
create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  parent_id uuid references public.quote_lines (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null default '',
  description text,
  quantity numeric(12, 3),
  unit text,
  unit_price_cents integer,
  vat_rate_bps integer not null default 2100,
  discount_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_lines_quote_id_idx on public.quote_lines (quote_id);
create index if not exists quote_lines_parent_id_idx on public.quote_lines (parent_id);
create index if not exists quote_lines_organization_id_idx on public.quote_lines (organization_id);

drop trigger if exists quote_lines_set_updated_at on public.quote_lines;
create trigger quote_lines_set_updated_at
  before update on public.quote_lines
  for each row execute function public.set_updated_at();

create or replace function public.enforce_quote_line_org()
returns trigger
language plpgsql
as $$
declare
  quote_org uuid;
  parent_quote uuid;
begin
  select organization_id into quote_org
  from public.quotes
  where id = new.quote_id;

  if quote_org is null then
    raise exception 'quote not found';
  end if;

  if quote_org <> new.organization_id then
    raise exception 'quote must belong to the same organization as the line';
  end if;

  if new.parent_id is not null then
    select quote_id into parent_quote
    from public.quote_lines
    where id = new.parent_id;

    if parent_quote is null then
      raise exception 'parent line not found';
    end if;

    if parent_quote <> new.quote_id then
      raise exception 'parent line must belong to the same quote';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists quote_lines_enforce_org on public.quote_lines;
create trigger quote_lines_enforce_org
  before insert or update of quote_id, organization_id, parent_id on public.quote_lines
  for each row execute function public.enforce_quote_line_org();

-- Minimal work items (Phase 4 expands)
create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  status public.work_item_status not null default 'open',
  quote_line_id uuid references public.quote_lines (id) on delete set null,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_items_organization_id_idx on public.work_items (organization_id);
create index if not exists work_items_project_id_idx on public.work_items (project_id);
create index if not exists work_items_quote_line_id_idx on public.work_items (quote_line_id);

drop trigger if exists work_items_set_updated_at on public.work_items;
create trigger work_items_set_updated_at
  before update on public.work_items
  for each row execute function public.set_updated_at();

create or replace function public.enforce_work_item_project_org()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null then
    raise exception 'project not found';
  end if;

  if project_org <> new.organization_id then
    raise exception 'project must belong to the same organization as the work item';
  end if;

  return new;
end;
$$;

drop trigger if exists work_items_enforce_project_org on public.work_items;
create trigger work_items_enforce_project_org
  before insert or update of project_id, organization_id on public.work_items
  for each row execute function public.enforce_work_item_project_org();

-- RLS
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.work_items enable row level security;

drop policy if exists "quotes_select_member" on public.quotes;
create policy "quotes_select_member"
  on public.quotes for select
  using (public.is_org_member(organization_id));

drop policy if exists "quotes_insert_staff" on public.quotes;
create policy "quotes_insert_staff"
  on public.quotes for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "quotes_update_staff" on public.quotes;
create policy "quotes_update_staff"
  on public.quotes for update
  using (public.is_org_staff(organization_id));

drop policy if exists "quotes_delete_staff" on public.quotes;
create policy "quotes_delete_staff"
  on public.quotes for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "quotes_select_super_admin" on public.quotes;
create policy "quotes_select_super_admin"
  on public.quotes for select
  using (public.is_super_admin());

drop policy if exists "quote_lines_select_member" on public.quote_lines;
create policy "quote_lines_select_member"
  on public.quote_lines for select
  using (public.is_org_member(organization_id));

drop policy if exists "quote_lines_insert_staff" on public.quote_lines;
create policy "quote_lines_insert_staff"
  on public.quote_lines for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "quote_lines_update_staff" on public.quote_lines;
create policy "quote_lines_update_staff"
  on public.quote_lines for update
  using (public.is_org_staff(organization_id));

drop policy if exists "quote_lines_delete_staff" on public.quote_lines;
create policy "quote_lines_delete_staff"
  on public.quote_lines for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "quote_lines_select_super_admin" on public.quote_lines;
create policy "quote_lines_select_super_admin"
  on public.quote_lines for select
  using (public.is_super_admin());

drop policy if exists "work_items_select_member" on public.work_items;
create policy "work_items_select_member"
  on public.work_items for select
  using (public.is_org_member(organization_id));

drop policy if exists "work_items_insert_staff" on public.work_items;
create policy "work_items_insert_staff"
  on public.work_items for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "work_items_update_staff" on public.work_items;
create policy "work_items_update_staff"
  on public.work_items for update
  using (public.is_org_staff(organization_id));

drop policy if exists "work_items_delete_staff" on public.work_items;
create policy "work_items_delete_staff"
  on public.work_items for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "work_items_select_super_admin" on public.work_items;
create policy "work_items_select_super_admin"
  on public.work_items for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.quotes to authenticated;
grant select, insert, update, delete on table public.quote_lines to authenticated;
grant select, insert, update, delete on table public.work_items to authenticated;
grant all on table public.quotes to service_role;
grant all on table public.quote_lines to service_role;
grant all on table public.work_items to service_role;
