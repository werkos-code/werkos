-- WerkOS: project document library (folders + files)

create table if not exists public.file_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  parent_id uuid references public.file_folders (id) on delete cascade,
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint file_folders_name_not_blank check (length(btrim(name)) > 0)
);

create unique index if not exists file_folders_unique_name_uidx
  on public.file_folders (
    project_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );

create index if not exists file_folders_organization_id_idx
  on public.file_folders (organization_id);
create index if not exists file_folders_project_id_idx
  on public.file_folders (project_id);
create index if not exists file_folders_parent_id_idx
  on public.file_folders (parent_id);

drop trigger if exists file_folders_set_updated_at on public.file_folders;
create trigger file_folders_set_updated_at
  before update on public.file_folders
  for each row execute function public.set_updated_at();

create or replace function public.enforce_file_folder_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  parent_project uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'file_folder_project_org_mismatch';
  end if;

  if new.parent_id is not null then
    select project_id into parent_project
    from public.file_folders
    where id = new.parent_id;

    if parent_project is null or parent_project <> new.project_id then
      raise exception 'file_folder_parent_project_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists file_folders_enforce_links on public.file_folders;
create trigger file_folders_enforce_links
  before insert or update of organization_id, project_id, parent_id
  on public.file_folders
  for each row execute function public.enforce_file_folder_links();

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  folder_id uuid references public.file_folders (id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_files_name_not_blank check (length(btrim(name)) > 0),
  constraint project_files_size_nonneg check (size_bytes >= 0)
);

create index if not exists project_files_organization_id_idx
  on public.project_files (organization_id);
create index if not exists project_files_project_id_idx
  on public.project_files (project_id);
create index if not exists project_files_folder_id_idx
  on public.project_files (folder_id);

drop trigger if exists project_files_set_updated_at on public.project_files;
create trigger project_files_set_updated_at
  before update on public.project_files
  for each row execute function public.set_updated_at();

create or replace function public.enforce_project_file_links()
returns trigger
language plpgsql
as $$
declare
  project_org uuid;
  folder_project uuid;
begin
  select organization_id into project_org
  from public.projects
  where id = new.project_id;

  if project_org is null or project_org <> new.organization_id then
    raise exception 'project_file_project_org_mismatch';
  end if;

  if new.folder_id is not null then
    select project_id into folder_project
    from public.file_folders
    where id = new.folder_id;

    if folder_project is null or folder_project <> new.project_id then
      raise exception 'project_file_folder_project_mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists project_files_enforce_links on public.project_files;
create trigger project_files_enforce_links
  before insert or update of organization_id, project_id, folder_id
  on public.project_files
  for each row execute function public.enforce_project_file_links();

alter table public.file_folders enable row level security;
alter table public.project_files enable row level security;

drop policy if exists "file_folders_select_member" on public.file_folders;
create policy "file_folders_select_member"
  on public.file_folders for select
  using (public.is_org_member(organization_id));

drop policy if exists "file_folders_insert_staff" on public.file_folders;
create policy "file_folders_insert_staff"
  on public.file_folders for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "file_folders_update_staff" on public.file_folders;
create policy "file_folders_update_staff"
  on public.file_folders for update
  using (public.is_org_staff(organization_id));

drop policy if exists "file_folders_delete_staff" on public.file_folders;
create policy "file_folders_delete_staff"
  on public.file_folders for delete
  using (public.is_org_staff(organization_id));

drop policy if exists "project_files_select_member" on public.project_files;
create policy "project_files_select_member"
  on public.project_files for select
  using (public.is_org_member(organization_id));

drop policy if exists "project_files_insert_staff" on public.project_files;
create policy "project_files_insert_staff"
  on public.project_files for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "project_files_update_staff" on public.project_files;
create policy "project_files_update_staff"
  on public.project_files for update
  using (public.is_org_staff(organization_id));

drop policy if exists "project_files_delete_staff" on public.project_files;
create policy "project_files_delete_staff"
  on public.project_files for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.file_folders to authenticated;
grant all on table public.file_folders to service_role;
grant select, insert, update, delete on table public.project_files to authenticated;
grant all on table public.project_files to service_role;

-- Private document storage (served via signed URLs / service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "project_files_staff_select" on storage.objects;
create policy "project_files_staff_select"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project_files_staff_insert" on storage.objects;
create policy "project_files_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project_files_staff_update" on storage.objects;
create policy "project_files_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "project_files_staff_delete" on storage.objects;
create policy "project_files_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );
