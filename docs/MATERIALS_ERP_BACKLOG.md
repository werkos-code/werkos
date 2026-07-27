# Materiaal ERP — backlog

> Laatst bijgewerkt: 2026-07-27  
> SQL: zie `docs/sql-applied/README.md`  
> Roadmap: `.cursor/plans/materiaal_registratie_v1_2f8a1c04.plan.md`

## Afgerond (fase A t/m E+)

Artikelen, voorraad, project BOM, leveranciers, inkoop, ontvangst, reserveringen, werkbon-materiaal, direct boeken op werkbon.

## Afgerond (fase F — 3-way match)

- [x] Leveranciersfacturen gekoppeld aan inkooporderregels
- [x] Match-overzicht: besteld · ontvangen · gefactureerd + prijs
- [x] UI op `/materiaal/inkoop` (Factuur + 3-way match)

## Volgende

- [ ] Catalogus-integraties (2BA e.d.)
- [ ] Veld/portaal (scan + offline)

## Migratie

Fase F SQL: `docs/sql-applied/20260727310000_supplier_invoices_3way_match.sql` (toegepast).
