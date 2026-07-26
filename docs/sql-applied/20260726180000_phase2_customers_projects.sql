-- WerkOS Phase 2: customers + projects

do $$ begin
  create type public.project_status as enum (
    'preparation',
    'execution',
    'operationally_completed',
    'administratively_completed',
    'completed',
    'archived'
  );
exception when duplicate_object then null;
end $$;

-- Staff helper (owner / office / field) for write policies
create or replace function public.is_org_staff(org_id uuid)
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
      and m.role in ('owner', 'office_employee', 'field_employee')
  );
$$;

revoke all on function public.is_org_staff(uuid) from public;
grant execute on function public.is_org_staff(uuid) to authenticated;

-- Customers (klanten)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_organization_id_idx
  on public.customers (organization_id);

create index if not exists customers_organization_name_idx
  on public.customers (organization_id, name);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  name text not null,
  status public.project_status not null default 'preparation',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_customer_same_org check (true)
);

-- Ensure project customer belongs to same organization
create or replace function public.enforce_project_customer_org()
returns trigger
language plpgsql
as $$
declare
  customer_org uuid;
begin
  select organization_id into customer_org
  from public.customers
  where id = new.customer_id;

  if customer_org is null then
    raise exception 'customer not found';
  end if;

  if customer_org <> new.organization_id then
    raise exception 'customer must belong to the same organization as the project';
  end if;

  return new;
end;
$$;

drop trigger if exists projects_enforce_customer_org on public.projects;
create trigger projects_enforce_customer_org
  before insert or update of customer_id, organization_id on public.projects
  for each row execute function public.enforce_project_customer_org();

create index if not exists projects_organization_id_idx
  on public.projects (organization_id);

create index if not exists projects_organization_status_idx
  on public.projects (organization_id, status);

create index if not exists projects_customer_id_idx
  on public.projects (customer_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- RLS
alter table public.customers enable row level security;
alter table public.projects enable row level security;

drop policy if exists "customers_select_member" on public.customers;
create policy "customers_select_member"
  on public.customers for select
  using (public.is_org_member(organization_id));

drop policy if exists "customers_insert_staff" on public.customers;
create policy "customers_insert_staff"
  on public.customers for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "customers_update_staff" on public.customers;
create policy "customers_update_staff"
  on public.customers for update
  using (public.is_org_staff(organization_id));

drop policy if exists "customers_delete_staff" on public.customers;
create policy "customers_delete_staff"
  on public.customers for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member"
  on public.projects for select
  using (public.is_org_member(organization_id));

drop policy if exists "projects_insert_staff" on public.projects;
create policy "projects_insert_staff"
  on public.projects for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "projects_update_staff" on public.projects;
create policy "projects_update_staff"
  on public.projects for update
  using (public.is_org_staff(organization_id));

drop policy if exists "projects_delete_staff" on public.projects;
create policy "projects_delete_staff"
  on public.projects for delete
  using (public.is_org_staff(organization_id));

-- Super admin read access
drop policy if exists "customers_select_super_admin" on public.customers;
create policy "customers_select_super_admin"
  on public.customers for select
  using (public.is_super_admin());

drop policy if exists "projects_select_super_admin" on public.projects;
create policy "projects_select_super_admin"
  on public.projects for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant all on table public.customers to service_role;
grant all on table public.projects to service_role;
