-- WerkOS: personal dashboard notes (one row per user per organisation)

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notes_user_org_unique unique (organization_id, user_id)
);

create index if not exists user_notes_user_idx
  on public.user_notes (organization_id, user_id);

drop trigger if exists user_notes_set_updated_at on public.user_notes;
create trigger user_notes_set_updated_at
  before update on public.user_notes
  for each row execute function public.set_updated_at();

alter table public.user_notes enable row level security;

drop policy if exists "user_notes_select_own" on public.user_notes;
create policy "user_notes_select_own"
  on public.user_notes for select
  using (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

drop policy if exists "user_notes_insert_own" on public.user_notes;
create policy "user_notes_insert_own"
  on public.user_notes for insert
  with check (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_notes_update_own" on public.user_notes;
create policy "user_notes_update_own"
  on public.user_notes for update
  using (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_notes_delete_own" on public.user_notes;
create policy "user_notes_delete_own"
  on public.user_notes for delete
  using (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_notes_select_super_admin" on public.user_notes;
create policy "user_notes_select_super_admin"
  on public.user_notes for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.user_notes to authenticated;
grant all on table public.user_notes to service_role;
