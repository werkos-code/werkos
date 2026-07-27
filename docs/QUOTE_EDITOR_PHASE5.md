# Offerte-editor — Fase 5 (org-briefpapier)

> Laatst bijgewerkt: 2026-07-27  
> SQL: `docs/sql-applied/20260727370000_organization_letterhead.sql`

## Opgeleverd

- Letterhead-velden op `organizations`: adres, postcode, plaats, land, telefoon, e-mail, KvK, btw, IBAN
- Instellingen: **Bedrijf → Bedrijfsgegevens** (`/instellingen/bedrijf`)
- Offertevoorbeeld toont briefhoofd met die gegevens
- RLS update voor org-leden + API `GET/PATCH /api/organization`

## Actie

Run SQL in Supabase:

`20260727370000_organization_letterhead.sql`

## Bewust nog niet

- Logo-upload
- Factuur-preview hergebruik (zelfde letterhead klaar voor later)

## Volgende

- [x] Zelfde preview-patroon voor facturen → [`INVOICE_EDITOR_PHASE6.md`](./INVOICE_EDITOR_PHASE6.md)
- Logo op organisatie
- Header `⋯` (dupliceren) of bijlagen
