-- WerkOS: time entries (actual hours) + quote line estimated hours

alter table public.quote_lines
  add column if not exists estimated_minutes integer;

do $$ begin
  alter table public.quote_lines
    add constraint quote_lines_estimated_minutes_nonneg
    check (estimated_minutes is null or estimated_minutes >= 0);
exception when duplicate_object then null;
end $$;

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  work_item_id uuid not null references public.work_items (id) on delete cascade,
  work_order_id uuid references public.work_orders (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete restrict,
  work_date date not null default (timezone('europe/amsterdam', now()))::date,
  minutes integer not null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_minutes_positive check (minutes > 0)
);

create index if not exists time_entries_organization_id_idx
  on public.time_entries (organization_id);
create index if not exists time_entries_project_id_idx
  on public.time_entries (project_id);
create index if not exists time_entries_work_item_id_idx
  on public.time_entries (work_item_id);
create index if not exists time_entries_user_id_idx
  on public.time_entries (user_id);
create index if not exists time_entries_work_date_idx
  on public.time_entries (organization_id, work_date);

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

create or replace function public.enforce_time_entry_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  item_project uuid;
  item_is_group boolean;
  order_project uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'time_entry_project_org_mismatch';
  end if;

  select project_id, is_group into item_project, item_is_group
  from public.work_items
  where id = new.work_item_id;

  if item_project is null or item_project <> new.project_id then
    raise exception 'time_entry_work_item_project_mismatch';
  end if;

  if coalesce(item_is_group, false) then
    raise exception 'time_entry_on_group_not_allowed';
  end if;

  if new.work_order_id is not null then
    select project_id into order_project
    from public.work_orders
    where id = new.work_order_id;

    if order_project is null or order_project <> new.project_id then
      raise exception 'time_entry_work_order_project_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists time_entries_enforce_links on public.time_entries;
create trigger time_entries_enforce_links
  before insert or update of organization_id, project_id, work_item_id, work_order_id
  on public.time_entries
  for each row execute function public.enforce_time_entry_links();

alter table public.time_entries enable row level security;

drop policy if exists "time_entries_select_member" on public.time_entries;
create policy "time_entries_select_member"
  on public.time_entries for select
  using (public.is_org_member(organization_id));

drop policy if exists "time_entries_insert_staff" on public.time_entries;
create policy "time_entries_insert_staff"
  on public.time_entries for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "time_entries_update_staff" on public.time_entries;
create policy "time_entries_update_staff"
  on public.time_entries for update
  using (public.is_org_staff(organization_id));

drop policy if exists "time_entries_delete_staff" on public.time_entries;
create policy "time_entries_delete_staff"
  on public.time_entries for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.time_entries to authenticated;
grant all on table public.time_entries to service_role;
