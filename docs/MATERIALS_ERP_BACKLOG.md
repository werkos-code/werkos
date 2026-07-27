# Materiaal ERP — backlog

> Laatst bijgewerkt: 2026-07-27  
> SQL: zie `docs/sql-applied/README.md`  
> Open setup: [`PENDING_SETUP.md`](./PENDING_SETUP.md)

## Afgerond (fase A t/m F)

Artikelen, voorraad, BOM, leveranciers, inkoop, ontvangst, reserveringen, werkbon-materiaal, 3-way match.

## Afgerond (fase G — catalogus + handmatig)

- [x] 2BA zoeken en importeren naar artikelen (via env-credentials)
- [x] Per inkoopregel: eigen catalogus · 2BA · handmatig
- [x] 2BA-import op `/materiaal/artikelen`

## Open

- [ ] **2BA credentials activeren** — zie [`PENDING_SETUP.md`](./PENDING_SETUP.md)

## Volgende

- [ ] Veld/portaal (scan + offline)
- [ ] 2BA: nettoprijzen / voorraad per leverancier (optioneel)

## Migratie

Fase G SQL: `docs/sql-applied/20260727320000_articles_catalog_refs.sql` (toegepast).
