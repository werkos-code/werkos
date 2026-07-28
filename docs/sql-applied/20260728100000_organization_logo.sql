-- WerkOS: organization logo for quote/invoice letterhead

alter table public.organizations
  add column if not exists logo_path text;

comment on column public.organizations.logo_path is
  'Storage path relative to bucket organization-logos';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "organization_logos_public_read" on storage.objects;
create policy "organization_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'organization-logos');

drop policy if exists "organization_logos_staff_insert" on storage.objects;
create policy "organization_logos_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'organization-logos'
    and auth.role() = 'authenticated'
  );

drop policy if exists "organization_logos_staff_update" on storage.objects;
create policy "organization_logos_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'organization-logos'
    and auth.role() = 'authenticated'
  );

drop policy if exists "organization_logos_staff_delete" on storage.objects;
create policy "organization_logos_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'organization-logos'
    and auth.role() = 'authenticated'
  );
