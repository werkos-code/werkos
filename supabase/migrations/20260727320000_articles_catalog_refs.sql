-- WerkOS Materiaal fase G: 2BA-catalogusreferenties op artikelen

alter table public.articles
  add column if not exists catalog_source text,
  add column if not exists catalog_supplier_gln text,
  add column if not exists catalog_trade_item_id text;

create unique index if not exists articles_org_catalog_uidx
  on public.articles (
    organization_id,
    catalog_source,
    catalog_supplier_gln,
    catalog_trade_item_id
  )
  where catalog_source is not null
    and catalog_supplier_gln is not null
    and catalog_trade_item_id is not null;
