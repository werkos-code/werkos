# Planning-module — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `20260726240000_appointments_planning.sql`  
> UI: `/werk/planning` · `src/features/planning/`

## Afgerond (v1)

- [x] Domein: `appointments` als eigen object (project / werkzaamheid optioneel)
- [x] Kalenderweergave = view over afspraken + datum-geplande werkzaamheden
- [x] Weekgrid (07:00–18:00), hele-dag rij, nu-lijn
- [x] “Niet gepland”-rail (open werkzaamheden zonder datum/afspraak)
- [x] Filters: zoeken, project, persoon, type, status
- [x] + Nieuwe afspraak / werkzaamheid inplannen (dialog)
- [x] Detailpaneel rechts (xl+)
- [x] Bij inplannen: sync `work_items.planned_start/end`

## Views later

- [ ] Dagweergave
- [ ] Maandweergave
- [ ] Agenda-lijst
- [ ] Datumkiezer in toolbar
- [ ] Opgeslagen filter-/weergavevoorkeuren

## Interactie later

- [ ] Drag-and-drop van “Niet gepland” naar tijdslot
- [ ] Sleep/resize bestaande blokken
- [ ] Dubbelklik-slot polished create
- [ ] Conflict-/overlap-waarschuwingen
- [ ] Meerdere deelnemers per afspraak

## Product / modules

- [ ] Projectdetail-tab Planning = gefilterde projectkalender
- [ ] Werkzaamheid-overlay: afspraken tonen/koppelen (nu placeholder)
- [ ] Resource-/personeelsbanen (“wie doet wat”) als apart view-mode
- [ ] Herhalende afspraken
- [ ] Instellingen (werktijden, weekstart, kleuren)

## Migratie

Run in Supabase SQL Editor:

`supabase/migrations/20260726240000_appointments_planning.sql`
