-- WerkOS: work orders (werkbonnen)

do $$ begin
  create type public.work_order_status as enum (
    'open',
    'planned',
    'in_progress',
    'done',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.work_order_priority as enum (
    'low',
    'normal',
    'high'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_order_number text not null,
  title text not null,
  description text,
  status public.work_order_status not null default 'open',
  priority public.work_order_priority not null default 'normal',
  work_type text,
  assignee_user_id uuid references auth.users (id) on delete set null,
  planned_start timestamptz,
  estimated_minutes integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_title_not_blank check (length(btrim(title)) > 0),
  constraint work_orders_estimated_minutes_nonneg
    check (estimated_minutes is null or estimated_minutes >= 0)
);

create unique index if not exists work_orders_org_number_uidx
  on public.work_orders (organization_id, work_order_number);

create index if not exists work_orders_organization_id_idx
  on public.work_orders (organization_id);

create index if not exists work_orders_project_id_idx
  on public.work_orders (project_id);

create index if not exists work_orders_assignee_user_id_idx
  on public.work_orders (assignee_user_id);

create index if not exists work_orders_status_idx
  on public.work_orders (organization_id, status);

drop trigger if exists work_orders_set_updated_at on public.work_orders;
create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

create or replace function public.next_work_order_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now() at time zone 'europe/amsterdam', 'YYYY');
  prefix text := 'WB-' || yr || '-';
  max_n integer;
begin
  select coalesce(max(
    nullif(regexp_replace(work_order_number, '^WB-[0-9]{4}-', ''), '')::integer
  ), 0)
  into max_n
  from public.work_orders
  where organization_id = org_id
    and work_order_number ~ ('^WB-' || yr || '-[0-9]+$');

  return prefix || lpad((max_n + 1)::text, 4, '0');
end;
$$;

create or replace function public.work_orders_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.work_order_number is null or btrim(new.work_order_number) = '' then
    new.work_order_number := public.next_work_order_number(new.organization_id);
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_assign_number on public.work_orders;
create trigger work_orders_assign_number
  before insert on public.work_orders
  for each row execute function public.work_orders_assign_number();

create or replace function public.enforce_work_order_project_org()
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
    raise exception 'project must belong to the same organization';
  end if;
  return new;
end;
$$;

drop trigger if exists work_orders_enforce_project_org on public.work_orders;
create trigger work_orders_enforce_project_org
  before insert or update of organization_id, project_id on public.work_orders
  for each row execute function public.enforce_work_order_project_org();

-- Checklist / subtaken on a work order
create table if not exists public.work_order_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint work_order_checklist_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists work_order_checklist_work_order_id_idx
  on public.work_order_checklist_items (work_order_id);

-- Optional M:N link to work items
create table if not exists public.work_order_work_items (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  primary key (work_order_id, work_item_id)
);

create index if not exists work_order_work_items_work_item_id_idx
  on public.work_order_work_items (work_item_id);

-- Optional appointment link (domain) — only if planning migration ran
do $$ begin
  if to_regclass('public.appointments') is not null then
    alter table public.appointments
      add column if not exists work_order_id uuid references public.work_orders (id) on delete set null;

    create index if not exists appointments_work_order_id_idx
      on public.appointments (work_order_id);
  end if;
end $$;

do $$ begin
  if to_regclass('public.appointments') is not null then
    create or replace function public.enforce_appointment_links()
    returns trigger
    language plpgsql
    as $fn$
    declare
      project_org uuid;
      item_org uuid;
      item_project uuid;
      order_org uuid;
      order_project uuid;
    begin
      if new.project_id is not null then
        select organization_id into project_org
        from public.projects
        where id = new.project_id;

        if project_org is null then
          raise exception 'project not found';
        end if;
        if project_org <> new.organization_id then
          raise exception 'project must belong to the same organization';
        end if;
      end if;

      if new.work_item_id is not null then
        select organization_id, project_id into item_org, item_project
        from public.work_items
        where id = new.work_item_id;

        if item_org is null then
          raise exception 'work item not found';
        end if;
        if item_org <> new.organization_id then
          raise exception 'work item must belong to the same organization';
        end if;
        if new.project_id is null then
          new.project_id := item_project;
        elsif new.project_id <> item_project then
          raise exception 'work item must belong to the selected project';
        end if;
      end if;

      if new.work_order_id is not null then
        select organization_id, project_id into order_org, order_project
        from public.work_orders
        where id = new.work_order_id;

        if order_org is null then
          raise exception 'work order not found';
        end if;
        if order_org <> new.organization_id then
          raise exception 'work order must belong to the same organization';
        end if;
        if new.project_id is null then
          new.project_id := order_project;
        elsif new.project_id <> order_project then
          raise exception 'work order must belong to the selected project';
        end if;
      end if;

      return new;
    end;
    $fn$;
  end if;
end $$;

alter table public.work_orders enable row level security;
alter table public.work_order_checklist_items enable row level security;
alter table public.work_order_work_items enable row level security;

drop policy if exists "work_orders_select_member" on public.work_orders;
create policy "work_orders_select_member"
  on public.work_orders for select
  using (public.is_org_member(organization_id));

drop policy if exists "work_orders_insert_staff" on public.work_orders;
create policy "work_orders_insert_staff"
  on public.work_orders for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "work_orders_update_staff" on public.work_orders;
create policy "work_orders_update_staff"
  on public.work_orders for update
  using (public.is_org_staff(organization_id));

drop policy if exists "work_orders_delete_staff" on public.work_orders;
create policy "work_orders_delete_staff"
  on public.work_orders for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "work_orders_select_super_admin" on public.work_orders;
create policy "work_orders_select_super_admin"
  on public.work_orders for select
  using (public.is_super_admin());

drop policy if exists "work_order_checklist_select_member" on public.work_order_checklist_items;
create policy "work_order_checklist_select_member"
  on public.work_order_checklist_items for select
  using (public.is_org_member(organization_id));

drop policy if exists "work_order_checklist_insert_staff" on public.work_order_checklist_items;
create policy "work_order_checklist_insert_staff"
  on public.work_order_checklist_items for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "work_order_checklist_update_staff" on public.work_order_checklist_items;
create policy "work_order_checklist_update_staff"
  on public.work_order_checklist_items for update
  using (public.is_org_staff(organization_id));

drop policy if exists "work_order_checklist_delete_staff" on public.work_order_checklist_items;
create policy "work_order_checklist_delete_staff"
  on public.work_order_checklist_items for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "work_order_work_items_select_member" on public.work_order_work_items;
create policy "work_order_work_items_select_member"
  on public.work_order_work_items for select
  using (public.is_org_member(organization_id));

drop policy if exists "work_order_work_items_insert_staff" on public.work_order_work_items;
create policy "work_order_work_items_insert_staff"
  on public.work_order_work_items for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "work_order_work_items_delete_staff" on public.work_order_work_items;
create policy "work_order_work_items_delete_staff"
  on public.work_order_work_items for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.work_orders to authenticated;
grant select, insert, update, delete on table public.work_order_checklist_items to authenticated;
grant select, insert, delete on table public.work_order_work_items to authenticated;
grant all on table public.work_orders to service_role;
grant all on table public.work_order_checklist_items to service_role;
grant all on table public.work_order_work_items to service_role;
