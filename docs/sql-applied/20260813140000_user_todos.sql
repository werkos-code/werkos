-- WerkOS: personal dashboard to-dos (per user, per organisation)

create table if not exists public.user_todos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_todos_title_not_blank check (length(btrim(title)) > 0)
);

create index if not exists user_todos_user_open_idx
  on public.user_todos (organization_id, user_id, completed_at, sort_order, created_at);

drop trigger if exists user_todos_set_updated_at on public.user_todos;
create trigger user_todos_set_updated_at
  before update on public.user_todos
  for each row execute function public.set_updated_at();

alter table public.user_todos enable row level security;

drop policy if exists "user_todos_select_own" on public.user_todos;
create policy "user_todos_select_own"
  on public.user_todos for select
  using (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

drop policy if exists "user_todos_insert_own" on public.user_todos;
create policy "user_todos_insert_own"
  on public.user_todos for insert
  with check (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_todos_update_own" on public.user_todos;
create policy "user_todos_update_own"
  on public.user_todos for update
  using (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_todos_delete_own" on public.user_todos;
create policy "user_todos_delete_own"
  on public.user_todos for delete
  using (
    user_id = auth.uid()
    and public.is_org_staff(organization_id)
  );

drop policy if exists "user_todos_select_super_admin" on public.user_todos;
create policy "user_todos_select_super_admin"
  on public.user_todos for select
  using (public.is_super_admin());

grant select, insert, update, delete on table public.user_todos to authenticated;
grant all on table public.user_todos to service_role;
