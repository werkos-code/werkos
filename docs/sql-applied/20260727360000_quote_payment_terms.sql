-- WerkOS: quote payment terms & conditions (fase 3)

alter table public.quotes
  add column if not exists payment_terms_days integer
    check (payment_terms_days is null or payment_terms_days >= 0);

alter table public.quotes
  add column if not exists payment_conditions text;

-- Match previous stub copy ("30 dagen") for existing drafts
update public.quotes
set payment_terms_days = 30
where payment_terms_days is null;

comment on column public.quotes.payment_terms_days is
  'Net payment days after invoice issue date; used for invoice due_date';

comment on column public.quotes.payment_conditions is
  'Short customer-facing payment conditions (separate from external_notes)';
