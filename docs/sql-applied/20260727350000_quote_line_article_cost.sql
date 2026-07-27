-- WerkOS: quote lines ↔ articles + cost snapshot (fase 2)

alter table public.quote_lines
  add column if not exists article_id uuid references public.articles (id) on delete set null;

alter table public.quote_lines
  add column if not exists cost_price_cents integer
    check (cost_price_cents is null or cost_price_cents >= 0);

create index if not exists quote_lines_article_id_idx
  on public.quote_lines (organization_id, article_id)
  where article_id is not null;

comment on column public.quote_lines.article_id is
  'Optional link to catalog article; sale/cost refreshed via Bereken prijzen';

comment on column public.quote_lines.cost_price_cents is
  'Snapshot unit cost (excl. VAT) at pick/recalculate time — for margin KPI';
