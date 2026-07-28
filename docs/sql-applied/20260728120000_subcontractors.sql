-- WerkOS: subcontractors (onderaannemers)

create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  kvk_number text,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subcontractors_name_not_blank check (length(btrim(name)) > 0)
);

create index if not exists subcontractors_organization_id_idx
  on public.subcontractors (organization_id);
create index if not exists subcontractors_organization_name_idx
  on public.subcontractors (organization_id, name);

drop trigger if exists subcontractors_set_updated_at on public.subcontractors;
create trigger subcontractors_set_updated_at
  before update on public.subcontractors
  for each row execute function public.set_updated_at();

alter table public.subcontractors enable row level security;

drop policy if exists "subcontractors_select_member" on public.subcontractors;
create policy "subcontractors_select_member"
  on public.subcontractors for select
  using (public.is_org_member(organization_id));

drop policy if exists "subcontractors_insert_staff" on public.subcontractors;
create policy "subcontractors_insert_staff"
  on public.subcontractors for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "subcontractors_update_staff" on public.subcontractors;
create policy "subcontractors_update_staff"
  on public.subcontractors for update
  using (public.is_org_staff(organization_id));

drop policy if exists "subcontractors_delete_staff" on public.subcontractors;
create policy "subcontractors_delete_staff"
  on public.subcontractors for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "subcontractors_select_super_admin" on public.subcontractors;
create policy "subcontractors_select_super_admin"
  on public.subcontractors for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.subcontractors to authenticated;
grant all on table public.subcontractors to service_role;
