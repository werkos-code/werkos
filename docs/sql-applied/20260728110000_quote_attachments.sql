-- WerkOS: quote attachments (private storage)

create table if not exists public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_attachments_name_not_blank check (length(btrim(name)) > 0),
  constraint quote_attachments_size_nonneg check (size_bytes >= 0)
);

create index if not exists quote_attachments_organization_id_idx
  on public.quote_attachments (organization_id);
create index if not exists quote_attachments_quote_id_idx
  on public.quote_attachments (quote_id);

drop trigger if exists quote_attachments_set_updated_at on public.quote_attachments;
create trigger quote_attachments_set_updated_at
  before update on public.quote_attachments
  for each row execute function public.set_updated_at();

create or replace function public.enforce_quote_attachment_org()
returns trigger
language plpgsql
as $$
declare
  quote_org uuid;
begin
  select organization_id into quote_org
  from public.quotes
  where id = new.quote_id;

  if quote_org is null or quote_org <> new.organization_id then
    raise exception 'quote must belong to the same organization as the attachment';
  end if;

  return new;
end;
$$;

drop trigger if exists quote_attachments_enforce_org on public.quote_attachments;
create trigger quote_attachments_enforce_org
  before insert or update of quote_id, organization_id on public.quote_attachments
  for each row execute function public.enforce_quote_attachment_org();

alter table public.quote_attachments enable row level security;

drop policy if exists "quote_attachments_select_member" on public.quote_attachments;
create policy "quote_attachments_select_member"
  on public.quote_attachments for select
  using (public.is_org_member(organization_id));

drop policy if exists "quote_attachments_insert_staff" on public.quote_attachments;
create policy "quote_attachments_insert_staff"
  on public.quote_attachments for insert
  with check (public.is_org_staff(organization_id));

drop policy if exists "quote_attachments_update_staff" on public.quote_attachments;
create policy "quote_attachments_update_staff"
  on public.quote_attachments for update
  using (public.is_org_staff(organization_id));

drop policy if exists "quote_attachments_delete_staff" on public.quote_attachments;
create policy "quote_attachments_delete_staff"
  on public.quote_attachments for delete
  using (public.is_org_staff(organization_id));

grant select, insert, update, delete on table public.quote_attachments to authenticated;
grant all on table public.quote_attachments to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-files',
  'quote-files',
  false,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "quote_files_staff_select" on storage.objects;
create policy "quote_files_staff_select"
  on storage.objects for select
  using (
    bucket_id = 'quote-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "quote_files_staff_insert" on storage.objects;
create policy "quote_files_staff_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'quote-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "quote_files_staff_update" on storage.objects;
create policy "quote_files_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'quote-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "quote_files_staff_delete" on storage.objects;
create policy "quote_files_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'quote-files'
    and auth.role() = 'authenticated'
  );
