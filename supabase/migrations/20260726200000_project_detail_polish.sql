-- WerkOS: project detail polish — favorites, cover, work-item activity types

-- Extra activity types (safe if already present)
do $$ begin
  alter type public.project_activity_type add value if not exists 'work_item_updated';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_activity_type add value if not exists 'work_item_completed';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.project_activity_type add value if not exists 'cover_updated';
exception when duplicate_object then null;
end $$;

-- Project cover (storage path relative to bucket project-covers)
alter table public.projects
  add column if not exists cover_path text;

-- Per-user favorites
create table if not exists public.project_favorites (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_favorites_user_id_idx
  on public.project_favorites (user_id);

create index if not exists project_favorites_organization_id_idx
  on public.project_favorites (organization_id);

create or replace function public.enforce_project_favorite_org()
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
    raise exception 'favorite must belong to the same organization as the project';
  end if;

  return new;
end;
$$;

drop trigger if exists project_favorites_enforce_org on public.project_favorites;
create trigger project_favorites_enforce_org
  before insert or update of project_id, organization_id on public.project_favorites
  for each row execute function public.enforce_project_favorite_org();

alter table public.project_favorites enable row level security;

drop policy if exists "project_favorites_select_own" on public.project_favorites;
create policy "project_favorites_select_own"
  on public.project_favorites for select
  using (
    public.is_org_member(organization_id)
    and user_id = auth.uid()
  );

drop policy if exists "project_favorites_insert_own" on public.project_favorites;
create policy "project_favorites_insert_own"
  on public.project_favorites for insert
  with check (
    public.is_org_staff(organization_id)
    and user_id = auth.uid()
  );

drop policy if exists "project_favorites_delete_own" on public.project_favorites;
create policy "project_favorites_delete_own"
  on public.project_favorites for delete
  using (
    public.is_org_staff(organization_id)
    and user_id = auth.uid()
  );

grant select, insert, delete on table public.project_favorites to authenticated;
grant all on table public.project_favorites to service_role;

-- Public cover images bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-covers',
  'project-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "project_covers_public_read" on storage.objects;
create policy "project_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'project-covers');

drop policy if exists "project_covers_staff_insert" on storage.objects;
create policy "project_covers_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project_covers_staff_update" on storage.objects;
create policy "project_covers_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project_covers_staff_delete" on storage.objects;
create policy "project_covers_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-covers'
    and auth.role() = 'authenticated'
  );
