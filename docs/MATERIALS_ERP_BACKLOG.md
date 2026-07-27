# Materiaal ERP — backlog

> Laatst bijgewerkt: 2026-07-27  
> SQL: zie `docs/sql-applied/README.md`  
> Roadmap: `.cursor/plans/materiaal_registratie_v1_2f8a1c04.plan.md`

## Afgerond (fase A t/m D+)

Zie eerdere secties in git history — artikelen, voorraad, project BOM, leveranciers, inkoop, ontvangst, reserveringen.

## Afgerond (fase E — veld & koppelingen)

- [x] BOM-reserveringen op werkzaamheid (planregel → `stock_reservations` + project)
- [x] Barcode-zoeken in artikelen-workspace (Enter opent artikel)
- [x] Werkbon-materiaal: koppel werkzaamheden + rollup begroot/verbruik

## Afgerond (fase E+ — direct op werkbon)

- [x] Materiaal direct op werkbon boeken (zonder werkzaamheid)

## Volgende

- [ ] 3-way match met facturen
- [ ] Catalogus-integraties (2BA e.d.)
- [ ] Veld/portaal (scan + offline)

## Migratie

Fase E+ SQL staat in `docs/sql-applied/20260727300000_work_order_material_usages.sql` (reeds toegepast).
