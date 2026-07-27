# Facturen — backlog

> Laatst bijgewerkt: 2026-07-27  
> SQL: `docs/sql-applied/20260726260000_invoices.sql`  
> UI: `/facturen` · `src/features/invoices/`

## Afgerond (v1)

- [x] `invoices` + nummering `INV-YYYY-NNNN` + `sequence_number` (#10021-stijl)
- [x] Optionele `quote_id` (factuur ↔ offerte)
- [x] `invoice_lines` (schema + CRUD API)
- [x] Statussen: `draft | open | sent | paid` — **Vervallen** is display-only
- [x] Org-lijst: KPI’s, tabs, filters, tabel, paginatie
- [x] Rechter widgets: aging-donut, betaaltrend, top 5 openstaand
- [x] Detail-sheet + status wijzigen
- [x] **Factuur-editor** (`/facturen/[id]`) — regels, totalen, notities, versturen/betaald
- [x] **Handmatig aanmaken** → direct naar editor (geen handmatig totaal meer)
- [x] **Vanuit project**: wizard uren + materiaal + werkzaamheden → conceptfactuur
- [x] Projectdetail → tab **Financieel** (facturenlijst + wizard)

## Bewust later

- [ ] Aanmaken vanuit geaccepteerde offerte (quote_lines kopiëren)
- [ ] PDF / voorbeeld / e-mail versturen
- [ ] Herinneringen (e-mail / portaal)
- [ ] Export / instellingen (nummerreeks, standaardtermijn, uurtarief org-default)
- [ ] Betalingsregistratie / deelfacturen / termijnfacturen
- [ ] `source_type` / `source_id` op regels (traceerbaarheid naar uren/materiaal)
- [ ] Koppeling boekhouding

## Routes & API

| Route | Doel |
| --- | --- |
| `/facturen` | Lijst + aanmaken |
| `/facturen/[invoiceId]` | Editor |
| `POST /api/invoices` | Header (`editorMode: true` voor leeg concept) |
| `*/api/invoices/[id]/lines` | Regel CRUD + herbereken totalen |
| `GET/POST /api/invoices/from-project` | Bronnen preview + factuur met geselecteerde regels |
