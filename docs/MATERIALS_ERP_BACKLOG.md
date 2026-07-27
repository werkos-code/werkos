# Materiaal ERP — backlog

> Laatst bijgewerkt: 2026-07-27  
> SQL fase A–C: `docs/sql-applied/20260726290000_materials_erp.sql`  
> SQL fase D: `supabase/migrations/20260727100000_materials_phase_d.sql`  
> Roadmap: `.cursor/plans/materiaal_registratie_v1_2f8a1c04.plan.md`

## Afgerond (fase A + B + C-kern)

- [x] Artikelmaster (`articles`) + leveranciersprijzen-tabel (`article_supplier_prices`)
- [x] UI `/materiaal/artikelen` — CRUD, zoeken, actief/voorraadplicht
- [x] Locaties (`stock_locations`: magazijn / bus / werf / overig)
- [x] Saldi + mutatieledger (`stock_balances`, `stock_movements`)
- [x] UI `/materiaal/voorraad` — locaties, saldi, ontvangst/uitgifte/overboeking
- [x] Project BOM + verbruik (`project_material_lines`, `material_usages`)
- [x] Werkzaamheid-tab **Materiaal**: begroot (artikel of ad-hoc) + verbruik (vrij toegestaan)
- [x] Ad-hoc regels zonder SKU toegestaan

## Afgerond (fase D — kern)

- [x] Leveranciersmodule (`suppliers`) + FK op `article_supplier_prices`
- [x] UI `/leveranciers` — CRUD
- [x] UI leveranciersprijzen per artikel (in artikel-editor)
- [x] Min/max bewerken op voorraadsaldi + KPI alerts
- [x] Uitgifte vanaf werkzaamheid met stock-aftrek (`deductStock`)
- [x] Inkoop basis: `purchase_orders` + `/materiaal/inkoop` (aanmaken + overzicht)

## Volgende (fase D+)

- [ ] Levernota / ontvangst tegen PO (partial receive)
- [ ] Reserveringen (reserved_quantity echt gebruiken)
- [ ] Werkbon-materiaal, scan/barcode, portaal
- [ ] 3-way match met facturen
- [ ] Catalogus-integraties (2BA e.d.)

## Migratie

Run in Supabase SQL Editor (na fase A–C):

`supabase/migrations/20260727100000_materials_phase_d.sql`
