# Offerte-editor — Fase 2 (catalogus & marge)

> Laatst bijgewerkt: 2026-07-27  
> SQL: `docs/sql-applied/20260727350000_quote_line_article_cost.sql`

## Opgeleverd

- `quote_lines.article_id` → catalogusartikel
- `quote_lines.cost_price_cents` → kostprijs-snapshot (excl. BTW)
- Artikel-picker op regels van type Artikel (verkoopprijs + kostprijs uit catalogus)
- **Bereken prijzen**: verkoop- en kostprijs van gekoppelde artikelen vernieuwen vanuit catalogus (optioneel alleen selectie)
- Marge-KPI: `%` over regels met bekende kostprijs; anders `—`

## Actie

Run SQL in Supabase vóór gebruik:

`20260727350000_quote_line_article_cost.sql`

## Volgende (fase 3+)

- Betalingstriggers / voorwaarden (niet stub)
- PDF / versturen (fase 4)
- Handmatige kostprijs op uren/arbeid
- 2BA-import direct in offerte-picker
