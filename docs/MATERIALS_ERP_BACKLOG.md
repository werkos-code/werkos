# Materiaal ERP — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `supabase/migrations/20260726290000_materials_erp.sql`  
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

## Volgende (fase D+)

- [ ] Leveranciersmodule + FK op `article_supplier_prices`
- [ ] UI leveranciersprijzen per artikel
- [ ] Min/max bewerken + alerts
- [ ] Inkoop: aanvraag → bestelbon → levernota
- [ ] Reserveringen (reserved_quantity echt gebruiken)
- [ ] Uitgifte vanaf werkzaamheid met stock-aftrek (`deductStock`)
- [ ] Werkbon-materiaal, scan/barcode, portaal
- [ ] 3-way match met facturen
- [ ] Catalogus-integraties (2BA e.d.)

## Migratie

Run in Supabase SQL Editor:

`supabase/migrations/20260726290000_materials_erp.sql`
