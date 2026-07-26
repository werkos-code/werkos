-- WerkOS: project detail MVP — metadata, labels, activity feed

-- Activity types
do $$ begin
  create type public.project_activity_type as enum (
    'project_created',
    'project_updated',
    'status_changed',
    'quote_created',
    'quote_updated',
    'quote_sent',
    'quote_accepted',
    'quote_rejected',
    'quote_cancelled',
    'work_item_created',
    'note'
  );
exception when duplicate_object then null;
end $$;

-- Project metadata columns
alter table public.projects
  add column if not exists project_number text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists lead_user_id uuid references auth.users (id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

create unique index if not exists projects_org_number_uidx
  on public.projects (organization_id, project_number)
  where project_number is not null;

create index if not exists projects_lead_user_id_idx
  on public.projects (lead_user_id);

-- Auto project numbers: PRJ-YYYY-NNNN per organization
create or replace function public.next_project_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now() at time zone 'europe/amsterdam', 'YYYY');
  prefix text := 'PRJ-' || yr || '-';
  max_n integer;
begin
  select coalesce(max(
    nullif(regexp_replace(project_number, '^PRJ-[0-9]{4}-', ''), '')::integer
  ), 0)
  into max_n
  from public.projects
  where organization_id = org_id
    and project_number ~ ('^PRJ-' || yr || '-[0-9]+$');

  return prefix || lpad((max_n + 1)::text, 4, '0');
end;
$$;

create or replace function public.projects_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.project_number is null or btrim(new.project_number) = '' then
    new.project_number := public.next_project_number(new.organization_id);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_assign_number on public.projects;
create trigger projects_assign_number
  before insert on public.projects
  for each row execute function public.projects_assign_number();

-- Backfill numbers for existing rows
do $$
declare
  r record;
begin
  for r in
    select id, organization_id
    from public.projects
    where project_number is null
    order by created_at asc
  loop
    update public.projects
    set project_number = public.next_project_number(r.organization_id)
    where id = r.id;
  end loop;
end $$;

alter table public.projects
  alter column project_number set not null;

-- Labels
create table if not exists public.project_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint project_labels_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists project_labels_project_id_idx
  on public.project_labels (project_id);

create unique index if not exists project_labels_project_name_uidx
  on public.project_labels (project_id, lower(btrim(name)));

create or replace function public.enforce_project_label_org()
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
    raise exception 'label must belong to the same organization as the project';
  end if;

  new.name := btrim(new.name);
  return new;
end;
$$;

drop trigger if exists project_labels_enforce_org on public.project_labels;
create trigger project_labels_enforce_org
  before insert or update of project_id, organization_id, name on public.project_labels
  for each row execute function public.enforce_project_label_org();

-- Activities (logboek + notities)
create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  type public.project_activity_type not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_activities_project_created_idx
  on public.project_activities (project_id, created_at desc);

create index if not exists project_activities_organization_id_idx
  on public.project_activities (organization_id);

create or replace function public.enforce_project_activity_org()
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
    raise exception 'activity must belong to the same organization as the project';
  end if;

  return new;
end;
$$;

drop trigger if exists project_activities_enforce_org on public.project_activities;
create trigger project_activities_enforce_org
  before insert or update of project_id, organization_id on public.project_activities
  for each row execute function public.enforce_project_activity_org();

-- RLS
alter table public.project_labels enable row level security;
alter table public.project_activities enable row level security;

drop policy if exists "project_labels_select_member" on public.project_labels;
create policy "project_labels_select_member"
  on public.project_labels for select
  using (public.is_org_member(organization_id));

drop policy if exists "project_labels_write_staff" on public.project_labels;
create policy "project_labels_insert_staff"
  on public.project_labels for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "project_labels_update_staff" on public.project_labels;
create policy "project_labels_update_staff"
  on public.project_labels for update
  using (public.is_org_staff(organization_id));

drop policy if exists "project_labels_delete_staff" on public.project_labels;
create policy "project_labels_delete_staff"
  on public.project_labels for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "project_labels_select_super_admin" on public.project_labels;
create policy "project_labels_select_super_admin"
  on public.project_labels for select
  using (public.is_super_admin());

drop policy if exists "project_activities_select_member" on public.project_activities;
create policy "project_activities_select_member"
  on public.project_activities for select
  using (public.is_org_member(organization_id));

drop policy if exists "project_activities_insert_staff" on public.project_activities;
create policy "project_activities_insert_staff"
  on public.project_activities for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "project_activities_select_super_admin" on public.project_activities;
create policy "project_activities_select_super_admin"
  on public.project_activities for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.project_labels to authenticated;
grant select, insert on table public.project_activities to authenticated;
grant all on table public.project_labels to service_role;
grant all on table public.project_activities to service_role;

-- Backfill activities from existing projects + quotes (idempotent-ish: only if none exist)
insert into public.project_activities (
  organization_id, project_id, type, title, body, metadata, created_by, created_at
)
select
  p.organization_id,
  p.id,
  'project_created'::public.project_activity_type,
  'Project aangemaakt',
  p.name,
  jsonb_build_object('project_number', p.project_number),
  p.created_by,
  p.created_at
from public.projects p
where not exists (
  select 1 from public.project_activities a
  where a.project_id = p.id and a.type = 'project_created'
);

insert into public.project_activities (
  organization_id, project_id, type, title, body, metadata, created_by, created_at
)
select
  q.organization_id,
  q.project_id,
  'quote_created'::public.project_activity_type,
  'Offerte aangemaakt',
  q.title,
  jsonb_build_object('quote_id', q.id, 'status', q.status),
  q.created_by,
  q.created_at
from public.quotes q
where not exists (
  select 1 from public.project_activities a
  where a.project_id = q.project_id
    and a.type = 'quote_created'
    and a.metadata->>'quote_id' = q.id::text
);
