# Werkzaamheid-detail overlay — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `20260726230000_work_item_detail.sql` (priority + labels)  
> UI: `work-item-detail-sheet.tsx`

## Afgerond (v1)

- [x] Brede rechter overlay (subwerkruimte)
- [x] Header: titel (inline), status, groep, planning, geschatte uren, ⋯-menu
- [x] Tabs: Overzicht, Subtaken, Planning, Tijd & uren, Bestanden, Communicatie, Activiteit
- [x] Overzicht: beschrijving, categorie, status, prioriteit, uren, voortgang, labels
- [x] Planning bewerken (start/eind)
- [x] Subtaken toevoegen / status cyclen (child `work_items`)
- [x] Enkele assignee + activiteitfeed gefilterd op `work_item_id`
- [x] Placeholders voor modules die nog niet bestaan
- [x] Tab Tijd & uren: boekingen + verwacht vs werkelijk (zie TIME_BACKLOG)

## Wacht op andere modules

| Onderdeel | Afhankelijk van | Status |
| --- | --- | --- |
| Gerealiseerde uren + tab Tijd & uren | Urenregistratie / tijdmodule | **v1 klaar** — zie [`TIME_BACKLOG.md`](./TIME_BACKLOG.md) |
| Bestanden & foto’s op werkzaamheid | Bestanden-module | Placeholder (projectbestanden elders) |
| Communicatie-thread / berichten | Communicatie-module | Placeholder |
| Afspraken koppelen in Planning | Planning-module | Placeholder-tekst; datums werken al |
| Materiaalregistratie | Materiaal-module | Nog niet in mock-tabs; later |
| Checklist & formulieren | Formulieren-module | Later |

## Product / data later

- [ ] Meerdere assignees / rollen per werkzaamheid (nu: 1 assignee)
- [ ] Voortgang op basis van gerealiseerde/geschatte uren (nu: subtaken, anders status 0/50/100)
- [ ] Eigen hoofdroute “← Terug naar project” i.p.v. alleen overlay
- [ ] Rijkere statusset (gepland, gepauzeerd, wacht op klant, …)
- [ ] Categorie als beheerde taxonomie
- [ ] Subtaken zichtbaar genest in de Taken-lijst (nu vooral in overlay)

## Migratie

Run in Supabase SQL Editor:

`supabase/migrations/20260726230000_work_item_detail.sql`
