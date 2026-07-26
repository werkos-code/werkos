# Facturen — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `20260726260000_invoices.sql`  
> UI: `/facturen` · `src/features/invoices/`

## Afgerond (v1)

- [x] `invoices` + nummering `INV-YYYY-NNNN` + `sequence_number` (#10021-stijl)
- [x] Optionele `quote_id` (factuur ↔ offerte)
- [x] `invoice_lines` (schema klaar voor latere editor)
- [x] Statussen: `draft | open | sent | paid` — **Vervallen** is display-only
- [x] Org-lijst: KPI’s, tabs, filters, tabel, paginatie
- [x] Rechter widgets: aging-donut, betaaltrend, top 5 openstaand
- [x] Detail-sheet + status wijzigen
- [x] + Nieuwe factuur (dialog, bedragen in euro → cents)

## Bewust later

- [ ] Volledige factuur-editor (regels, btw-tarieven, PDF)
- [ ] Aanmaken vanuit geaccepteerde offerte
- [ ] Herinneringen versturen (e-mail / portaal)
- [ ] Export / instellingen (nummerreeks, standaardtermijn)
- [ ] Projectdetail → tab Financieel (echte data)
- [ ] Betalingsregistratie / deelfacturen / termijnfacturen
- [ ] Koppeling boekhouding

## Migratie

Run in Supabase SQL Editor (ná projects + quotes):

`supabase/migrations/20260726260000_invoices.sql`
