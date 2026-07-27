-- WerkOS: organization letterhead for quotes/invoices (fase 5)

alter table public.organizations
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists kvk_number text,
  add column if not exists vat_number text,
  add column if not exists iban text;

comment on column public.organizations.address is 'Street / address line for letterhead';
comment on column public.organizations.kvk_number is 'Chamber of Commerce (KvK) number';
comment on column public.organizations.vat_number is 'VAT / BTW identification number';
comment on column public.organizations.iban is 'Bank account for letterhead / invoices';

-- Members may update their own organization profile (letterhead + name/industry)
drop policy if exists "organizations_update_member" on public.organizations;
create policy "organizations_update_member"
  on public.organizations for update
  using (public.is_org_member(id))
  with check (public.is_org_member(id));

grant select, update on table public.organizations to authenticated;
