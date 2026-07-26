-- WerkOS: appointments for central Planning calendar

do $$ begin
  create type public.appointment_status as enum (
    'planned',
    'in_progress',
    'done',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.appointment_type as enum (
    'work',
    'meeting',
    'delivery',
    'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  status public.appointment_status not null default 'planned',
  type public.appointment_type not null default 'work',
  project_id uuid references public.projects (id) on delete set null,
  work_item_id uuid references public.work_items (id) on delete set null,
  assignee_user_id uuid references auth.users (id) on delete set null,
  location text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (ends_at > starts_at)
);

create index if not exists appointments_organization_starts_idx
  on public.appointments (organization_id, starts_at);

create index if not exists appointments_project_id_idx
  on public.appointments (project_id);

create index if not exists appointments_work_item_id_idx
  on public.appointments (work_item_id);

create index if not exists appointments_assignee_user_id_idx
  on public.appointments (assignee_user_id);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create or replace function public.enforce_appointment_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  item_org uuid;
  item_project uuid;
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

  return new;
end;
$$;

drop trigger if exists appointments_enforce_links on public.appointments;
create trigger appointments_enforce_links
  before insert or update of organization_id, project_id, work_item_id on public.appointments
  for each row execute function public.enforce_appointment_links();

alter table public.appointments enable row level security;

drop policy if exists "appointments_select_member" on public.appointments;
create policy "appointments_select_member"
  on public.appointments for select
  using (public.is_org_member(organization_id));

drop policy if exists "appointments_insert_staff" on public.appointments;
create policy "appointments_insert_staff"
  on public.appointments for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "appointments_update_staff" on public.appointments;
create policy "appointments_update_staff"
  on public.appointments for update
  using (public.is_org_staff(organization_id));

drop policy if exists "appointments_delete_staff" on public.appointments;
create policy "appointments_delete_staff"
  on public.appointments for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "appointments_select_super_admin" on public.appointments;
create policy "appointments_select_super_admin"
  on public.appointments for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.appointments to authenticated;
grant all on table public.appointments to service_role;
