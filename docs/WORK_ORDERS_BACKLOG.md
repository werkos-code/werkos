# Werkbonnen — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `20260726250000_work_orders.sql`  
> UI: `/werk/projecten/werkbonnen` · `src/features/work-orders/`

## Afgerond (v1)

- [x] `work_orders` + nummering `WB-YYYY-NNNN`
- [x] Checklist/subtaken (`work_order_checklist_items`)
- [x] Optionele M:N `work_order_work_items`
- [x] Optionele `appointments.work_order_id` (als Planning-migratie bestaat)
- [x] Org-lijst: KPI’s, filters, tabel, paginatie, detail-sheet
- [x] + Nieuwe werkbon (dialog)
- [x] Projectdetail-tab: compacte lijst + link naar module
- [x] Tab “Mijn werkbonnen” (filter op huidige user)

## Views later

- [ ] Kanban
- [ ] Planning-weergave binnen module
- [ ] Export

## Detail / execution later

- [ ] Volledige werkbon-pagina (“Werkbon openen”)
- [ ] Bijlagen / foto’s
- [ ] Meerdere uitvoerders + bel/bericht-acties
- [ ] Materialen & uren op werkbon
- [ ] PDF / print / handtekening
- [ ] Koppelen/ontkoppelen van werkzaamheden in UI
- [ ] Deep link vanuit Planning-afspraak

## Migratie

Run in Supabase SQL Editor (ná work_items / idealiter ná appointments):

`supabase/migrations/20260726250000_work_orders.sql`
