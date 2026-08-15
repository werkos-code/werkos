-- WerkOS: organization invoice settings (number format, from-email, defaults)

alter table public.organizations
  add column if not exists invoice_number_prefix text not null default 'INV',
  add column if not exists invoice_number_include_year boolean not null default true,
  add column if not exists invoice_number_pad integer not null default 4,
  add column if not exists invoice_from_email text,
  add column if not exists invoice_default_payment_terms_days integer not null default 30,
  add column if not exists invoice_default_vat_rate_bps integer not null default 2100,
  add column if not exists invoice_default_notes text,
  add column if not exists invoice_reminder_days_after_due integer;

alter table public.organizations
  drop constraint if exists organizations_invoice_number_prefix_format;
alter table public.organizations
  add constraint organizations_invoice_number_prefix_format
  check (invoice_number_prefix ~ '^[A-Za-z0-9]{1,12}$');

alter table public.organizations
  drop constraint if exists organizations_invoice_number_pad_range;
alter table public.organizations
  add constraint organizations_invoice_number_pad_range
  check (invoice_number_pad between 2 and 8);

alter table public.organizations
  drop constraint if exists organizations_invoice_payment_terms_nonneg;
alter table public.organizations
  add constraint organizations_invoice_payment_terms_nonneg
  check (invoice_default_payment_terms_days >= 0);

alter table public.organizations
  drop constraint if exists organizations_invoice_vat_bps_range;
alter table public.organizations
  add constraint organizations_invoice_vat_bps_range
  check (invoice_default_vat_rate_bps in (0, 900, 2100));

alter table public.organizations
  drop constraint if exists organizations_invoice_reminder_days_nonneg;
alter table public.organizations
  add constraint organizations_invoice_reminder_days_nonneg
  check (
    invoice_reminder_days_after_due is null
    or invoice_reminder_days_after_due >= 0
  );

comment on column public.organizations.invoice_number_prefix is
  'Prefix for auto invoice numbers, e.g. INV or FACT.';
comment on column public.organizations.invoice_number_include_year is
  'When true, numbers look like PREFIX-YYYY-0001; otherwise PREFIX-0001.';
comment on column public.organizations.invoice_number_pad is
  'Zero-padding width for the numeric part of invoice numbers.';
comment on column public.organizations.invoice_from_email is
  'Sender address used when emailing invoices (display/settings; delivery wiring later).';
comment on column public.organizations.invoice_default_payment_terms_days is
  'Default net payment terms applied to new invoices without an explicit due date.';
comment on column public.organizations.invoice_default_vat_rate_bps is
  'Default VAT rate in basis points for new invoice lines (2100 = 21%).';
comment on column public.organizations.invoice_default_notes is
  'Default notes / payment footer copied onto new invoices when notes are empty.';
comment on column public.organizations.invoice_reminder_days_after_due is
  'Days after due date before a payment reminder is suggested (null = off).';

create or replace function public.next_invoice_number(org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr text := to_char(now() at time zone 'europe/amsterdam', 'YYYY');
  prefix_base text;
  include_year boolean;
  pad integer;
  prefix text;
  pattern text;
  max_n integer;
begin
  select
    coalesce(nullif(btrim(invoice_number_prefix), ''), 'INV'),
    coalesce(invoice_number_include_year, true),
    coalesce(invoice_number_pad, 4)
  into prefix_base, include_year, pad
  from public.organizations
  where id = org_id;

  if prefix_base is null then
    prefix_base := 'INV';
    include_year := true;
    pad := 4;
  end if;

  if include_year then
    prefix := prefix_base || '-' || yr || '-';
    pattern := '^' || prefix_base || '-' || yr || '-[0-9]+$';
  else
    prefix := prefix_base || '-';
    pattern := '^' || prefix_base || '-[0-9]+$';
  end if;

  select coalesce(max(
    nullif(regexp_replace(invoice_number, '^.*-', ''), '')::integer
  ), 0)
  into max_n
  from public.invoices
  where organization_id = org_id
    and invoice_number ~ pattern;

  return prefix || lpad((max_n + 1)::text, greatest(pad, length((max_n + 1)::text)), '0');
end;
$$;
