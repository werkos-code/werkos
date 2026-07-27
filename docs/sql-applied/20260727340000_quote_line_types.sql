-- WerkOS: quote line types (article / hours / labor / text / section)

do $$ begin
  create type public.quote_line_type as enum (
    'article',
    'hours',
    'labor',
    'text',
    'section'
  );
exception when duplicate_object then null;
end $$;

alter table public.quote_lines
  add column if not exists line_type public.quote_line_type not null default 'article';

-- Backfill sections: null qty + null price (existing convention)
update public.quote_lines
set line_type = 'section'
where quantity is null
  and unit_price_cents is null
  and line_type = 'article';

comment on column public.quote_lines.line_type is
  'article | hours | labor | text | section — drives badges and field visibility';
