# Nieuwe opdracht — intake-wizard

> Laatst bijgewerkt: 2026-07-27  
> Route: `/opdrachten/nieuw` · API: `POST /api/opdrachten/complete`

## Filosofie

**Nieuwe opdracht** is de belangrijkste CTA van WerkOS. Iedere nieuwe klus begint hier.

Het doel is niet een leeg project aanmaken, maar zo snel mogelijk van eerste klantcontact naar een goede offerte — met daarna een **compleet project** (klant, intake, conceptofferte, tijdlijn).

De oude flow (`/aanvragen/nieuw` + simpel formulier) is vervangen door een **4-stappen wizard** met autosave in `localStorage`.

## Stappen

| Stap | Doel | Verplicht |
| --- | --- | --- |
| 1. Gegevens | Klant vastleggen (zoeken of nieuw) | Naam |
| 2. Aanvraag | Opdracht beschrijven | Projectnaam |
| 3. Calculatie | Prijsopbouw → conceptofferte | — (optioneel regels) |
| 4. Afronden | Overzicht + project aanmaken | — |

Progress indicator: **Gegevens → Aanvraag → Calculatie → Afronden**

## Wat wordt aangemaakt (stap 4)

Bij **Project openen** (`POST /api/opdrachten/complete`):

1. **Klant** — bestaande koppelen of nieuwe aanmaken
2. **Project** — status `preparation`, contactgegevens, interne notities
3. **Activiteit** — intake-notitie (locatie, wensen, bijzonderheden)
4. **Activiteit** — opdracht gestart
5. **Offerte** — concept (`draft`) met calculatieregels als `quote_lines`
6. **Activiteit** — conceptofferte aangemaakt (met totaal)

Redirect naar `/projecten/[id]`.

## Code

| Onderdeel | Pad |
| --- | --- |
| Wizard UI | `src/features/assignments/components/new-assignment-wizard.tsx` |
| State + autosave | `src/features/assignments/lib/wizard-state.ts` |
| Calculatie totals | `src/features/assignments/lib/calculation.ts` |
| Complete API | `src/app/api/opdrachten/complete/route.ts` |
| Klant zoeken | `GET /api/customers/search?q=` |
| Pagina | `src/app/[locale]/(app)/opdrachten/nieuw/page.tsx` |

## Calculatie (stap 3) — architectuur

Huidige MVP:

- Handmatige calculatieregels (omschrijving, eenheid, aantal, prijs)
- Marge % → aparte regel op offerte
- Totalen (subtotaal, btw, incl.)

Voorbereid voor uitbreiding:

- Materiaal uit catalogus / 2BA
- Uren en werkzaamheden
- Sjablonen en secties
- Marges per regel

De wizard-state en complete-API accepteren al een lijst `calculation.lines`; nieuwe brontypes kunnen daar worden toegevoegd zonder de wizard-flow te herschrijven.

## Naamgeving

| Oud | Nieuw |
| --- | --- |
| Nieuwe aanvraag | **Nieuwe opdracht** |
| `/aanvragen/nieuw` | `/opdrachten/nieuw` (redirect vanaf oud pad) |

Filter op projectenlijst **Nieuwe opdrachten** = projecten in `preparation` (technische key `new_requests` ongewijzigd).

## UX-richtlijnen

- Weinig velden per stap, veel witruimte
- Autosave tussen stappen
- Terug zonder gegevensverlies
- Geen popups voor nieuwe klant — inline in stap 1
- Sidebar CTA blijft gradient (design system)

Zie ook: `docs/OPERATIONAL_FLOW.md`, `docs/DESIGN_SYSTEM.md` (sidebar CTA).
