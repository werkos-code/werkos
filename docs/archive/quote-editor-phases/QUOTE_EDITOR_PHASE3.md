# Offerte-editor — Fase 3 (betaaltermijn & voorwaarden)

> Laatst bijgewerkt: 2026-07-27  
> SQL: `docs/sql-applied/20260727360000_quote_payment_terms.sql`

## Opgeleverd

- `quotes.payment_terms_days` (standaard 30) — nettodagen na factuurdatum
- `quotes.payment_conditions` — korte klanttekst (los van `external_notes`)
- Tab **Voorwaarden** + rail: echte velden i.p.v. stubs
- Factuur uit betalingsplanning krijgt `due_date = issue_date + payment_terms_days`

## Actie

Run SQL in Supabase:

`20260727360000_quote_payment_terms.sql`

## Volgende (fase 4)

- [x] PDF / voorbeeld / versturen → [`QUOTE_EDITOR_PHASE4.md`](./QUOTE_EDITOR_PHASE4.md)
- Org-defaults voor betaaltermijn
- Voorwaarden-catalogus (optioneel)
