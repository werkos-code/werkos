# Offerte-editor — fase 8: bijlagen + factuur vanuit offerte

> Datum: 2026-07-28  
> Scope: bijlagen-tab activeren + conceptfactuur vanuit geaccepteerde offerte

## Afgerond

### Bijlagen
- [x] Tabel `quote_attachments` + private bucket `quote-files`
- [x] API: list/upload `GET|POST /api/quotes/[quoteId]/attachments`
- [x] API: download/delete `GET|DELETE …/attachments/[attachmentId]`
- [x] Tab **Bijlagen** in offerte-editor (upload, dropzone, lijst, download, delete)
- [x] Alleen bewerkbaar bij status `draft`

### Factuur vanuit offerte
- [x] `POST /api/quotes/[quoteId]/create-invoice`
- [x] Alleen bij status `accepted`
- [x] Kopieert factureerbare regels (`article` / `hours` / `labor`), sectie als prefix in titel
- [x] Zet `quote_id` op factuur, betaaltermijn → vervaldatum, externe notities → factuurnotities
- [x] Acties `⋯` → **Factuur aanmaken**

## SQL (Supabase)

Voer uit: `docs/sql-applied/20260728110000_quote_attachments.sql`

## Bewust nog niet

- Bijlagen in printvoorbeeld / e-mail
- Selectieve regelkeuze bij factuur-vanuit-offerte (nu: alle billable leaves)
- Waarschuwing bij al gefactureerde termijnschijven

## Volgende

- Echte e-mail / publieke klantlink, of offerte-niveau korting
