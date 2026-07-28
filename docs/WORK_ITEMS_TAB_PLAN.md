# Taken-tab — werkplan

> Doel: Taken-tab als operationele PM-werkruimte, conform design + domeinmodel.  
> Datum: 2026-07-26

## Principes

1. Bouw alleen wat het domein toelaat (hiërarchische werkzaamheden, geen apart “fase”-object).
2. Geen nepdata voor uren/voortgang — alleen echte of lege states.
3. Overlay detail = placeholder-shell nu; volledige detail later.
4. Design language van de app behouden (PageCard, tokens, sidebar).

## Fase A — Documentatie ✅

- [x] Designinventaris (`WORK_ITEMS_TAB_DESIGN.md`)
- [x] Dit werkplan
- [x] Backlog voor rest ([`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) §6)

## Fase B — Schema ✅

- [x] Uitbreiden `work_items` (parent, description, category, assignee, planning, uren)
- [x] Status: `open` | `in_progress` | `done`
- [x] Parent-org trigger
- [x] Types + loaders

## Fase C — API ✅

- [x] POST/PATCH/DELETE nieuwe velden + `parentId` / groep
- [x] Activiteitlog behouden

## Fase D — UI Taken-tab ✅

- [x] Workspace-component (lijstweergave)
- [x] Toolbar: Lijst actief; Boom/Kanban stub
- [x] Zoeken + filters
- [x] Hiërarchische groepen + rijen
- [x] Toevoegen werkzaamheid / groep
- [x] Status cyclen
- [x] Rechterkolom overzicht + categorieën; templates stub
- [x] Footer totalen
- [x] Projectheader-KPI’s
- [x] Rechter overlay placeholder

## Fase E — Integratie ✅

- [x] Overview compacte taken
- [x] i18n nl/en/de
- [x] PHASE1_SETUP migratienoot
- [x] Commit & push

## Rest

Zie [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§6 Werkzaamheden).
