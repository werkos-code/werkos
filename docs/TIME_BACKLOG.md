# Uren & calculatie — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `docs/sql-applied/20260726280000_time_entries.sql`  
> UI: werkzaamheid-tab **Tijd & uren** · Taken-lijst / project-KPI · offerte-uren · `src/features/time/`

## Afgerond (v1 — uren eerst)

- [x] `time_entries` (werkelijke uren als boekingen: wie, dag, minuten, notitie)
- [x] Boeken alleen op blad-werkzaamheden (geen groepen)
- [x] Tab Tijd & uren: verwacht vs werkelijk + CRUD boekingen
- [x] Rollups: Taken-lijst + project-KPI (verwacht / werkelijk)
- [x] `quote_lines.estimated_minutes` + veld in offerte-editor
- [x] Bij offerte-acceptatie: verwachte uren kopiëren naar werkzaamheid
- [x] Verwachte uren blijven op werkzaamheid / werkbon (bestaand)

## Bewust later

- [ ] Personeelsportaal (zelfde `time_entries`, andere UI)
- [ ] Uurtarieven / kostprijs / billable / marge
- [ ] Timer start/stop
- [ ] Goedkeuring / correcties
- [ ] Werkbon: werkelijke uren via `work_order_id` of rollup gekoppelde werkzaamheden
- [ ] Centrale uren-overzichtspagina (Rapportages)
- [ ] Materiaalregistratie (zelfde verwachting/werkelijkheid-patroon)
- [ ] Factureren van uren

## Migratie

Al toegepast (archief):

`docs/sql-applied/20260726280000_time_entries.sql`

Niet opnieuw draaien op productie. Eerdere migraties staan ook in `docs/sql-applied/`.
