# WerkOS Design System

> Version: 2.0 — 2026-07-26  
> Bron van waarheid voor UI. Nieuwe pagina’s volgen dit document — geen screenshots nodig.  
> Tokens: `src/app/globals.css` · Surfaces: `PageCard` · Frame: `ShellPage`

WerkOS is één product. Consistentie is belangrijker dan creativiteit.  
Wanneer een scherm afwijkt: breid dit systeem uit, niet het scherm.

---

## 1. Filosofie

Gebouwd voor ondernemers in projectbedrijven die de app dagelijks uren gebruiken.

- Rust, overzicht, betrouwbaarheid boven visuele effecten
- Professionele bedrijfssoftware zonder ERP-rommel
- Minder is beter; kleur heeft betekenis, geen decoratie
- Bestaande patronen hergebruiken; nieuwe patterns alleen als het écht nodig is

**WerkOS is niet:** startup-dashboard, design-showcase, paarse marketing-UI, nep-KPI’s.

---

## 2. Visuele identiteit (vast)

| Element | Waarde | Regel |
| --- | --- | --- |
| Lettertype | Geist (`--font-sans`) | Geen Inter/Roboto/Arial/system als UI-font |
| Mono | Geist Mono | Geld, qty, technische velden |
| Iconen | Lucide | Geen andere icon set; iconen vervangen geen tekst |
| Primary | `#2563EB` (`--primary`) | Alleen CTA, focus, actieve selectie, soft chips |
| Ring | `#3B82F6` | Focus |
| Sidebar | `#09133A` (`--sidebar`) | Enige donkere chrome in de app |
| Canvas | koel lichtgrijs (`--background`) | Content op wit (`--card`) |
| Radius basis | `0.625rem` | Kaarten `rounded-xl`; pills `rounded-full` / badge `rounded-4xl` |
| Schaduw | 1px soft op `PageCard` | Geen multi-layer glow |

### Kleurgebruik

- Interface = wit + lichte grijstinten + donkergrijze tekst + subtiele borders
- Blauw spaarzaam: primaire knoppen, actieve tabs, focus, `bg-primary/10 text-primary` chips
- Success / destructive / amber alleen voor status en waarschuwing
- Geen gekleurde decoratieve kaarten of paarse/indigo gradients
- Geen cream+serif of krantachtige layouts

Wijzig kleuren alleen in `globals.css`, niet ad hoc per pagina.

---

## 3. App-frame (altijd)

```
AppShell (navy sidebar)
  └─ ShellPage
       ├─ AppPageHeader (titel · optional back · actions · zoek/bel/help)
       └─ content: px-6 py-6 lg:px-8 → mx-auto w-[90%]
```

| Regel | Detail |
| --- | --- |
| Header-titel | `text-base font-semibold tracking-tight` — geen grote hero in de chrome |
| Geen page-description | `description` op `ShellPage` wordt niet gerenderd; uitleg via tooltip of weglaten |
| Surfaces | Gebruik `PageCard` / `MetaStatCard` — niet shadcn `Card` in product-UI |
| Secties | `space-y-5` of `space-y-6` |
| Sidebar | Altijd zichtbaar; organisatie-switcher bovenaan; **inklappbare** sectiekoppen; Bedrijf default dicht; subtiele active state |
| Sidebar CTA | Alleen “Nieuwe opdracht”: gradient `#00b09b` → `#96c93d` — nergens anders hergebruiken |
| Eén app-context | Geen dual-context switch — één navigatiestructuur |

**Canonical:**  
`src/features/shell/components/{app-shell,app-sidebar,organization-switcher,shell-page,app-page-header,page-card}.tsx`

---

## 4. Paginarecepten

Nieuwe pagina’s vallen in één type. Kopieer het recept; verzin geen nieuwe layout-taal.

### 4.1 Lijstpagina

1. Optionele actierij (primair `+ Nieuw …`)
2. Optionele KPI-strip: grid van `PageCard p-4` (of `MetaStatCard`)
3. Filterbalk in `PageCard p-3` (zoek + selects)
4. Data in `PageCard overflow-hidden` + tabel/grid

**Voorbeeld:** `projects-workspace.tsx`, `customers-table.tsx`, `quotes-list.tsx`

### 4.2 Detailpagina

1. Hero `PageCard p-5` op één compositie:
   - Links: cover/thumbnail · titel · status-badge · favoriet · meta-rij · labels
   - Rechts (zelfde rij op `xl`): KPI’s (ring + metrics) — **niet** op een aparte regel onder de identity
   - Acties (Delen / Bewerken) **in** de hero-card, rechtsboven — niet op een volle regel erboven
2. Underline-tabs onder de hero
3. Tab-body: `PageCard`-panelen; 1–2 kolommen waar nodig
4. Optioneel: vaste bottom-composer (notities)

**Voorbeeld:** `project-detail-workspace.tsx`

### 4.3 Operationele workspace (lijst in context)

1. Toolbar: segmented view · zoek · filters · split primary-add
2. Hoofdlijst `PageCard p-0` (+ optionele rechterrail ~`17.5rem`)
3. Rijen: CSS-grid of tabel met rustige hover; hiërarchie via indent/groepen
4. Klik rij → **brede Sheet** (subwerkruimte, ~70vw): hero + underline-tabs + 2-koloms overzicht

**Voorbeeld:** `project-work-items-workspace.tsx`, `work-item-detail-sheet.tsx`, `work-orders-workspace.tsx`, `invoices-workspace.tsx`  
Detail-sheets: altijd ~`70vw` (geen smalle 28rem-sidebar).  
Detail-rest: [`WORK_ITEM_DETAIL_BACKLOG.md`](./WORK_ITEM_DETAIL_BACKLOG.md)

### 4.4 Kalender / Planning workspace

1. View-tabs (Dag/Week/Maand/Agenda) + datum-nav + primary “+ Nieuwe afspraak”
2. Filterbalk `PageCard p-3` (zoek + project/persoon/type/status)
3. Hoofdvlak: optionele “Niet gepland”-rail + week/tijdgrid in `PageCard p-0`
4. Eventblokken: zachte pastel (`planningColorForKey`), geen harde neon
5. Selectie → detailpaneel rechts (~22rem) met meta + bewerken
6. Planning is een **weergave** van `appointments` + geplande `work_items` — geen gedupliceerde administratie

**Voorbeeld:** `src/features/planning/components/planning-workspace.tsx`  
Rest: [`PLANNING_BACKLOG.md`](./PLANNING_BACKLOG.md)

### 4.5 Offerte-editor (workspace-dicht)

```
Header (titel · OFF-nummer · status · save-indicator · Acties / Voorbeeld / Verzenden)
KPI-strip: 4× MetaStatCard (excl · btw · incl · marge)
Underline-tabs: Overzicht · Offerte editor · Voorwaarden · Bijlagen · Opmerkingen · Activiteiten
grid xl:[minmax(0,1fr)_20rem]
  ├─ Main PageCard (tab-body; editor = regels + toolbar)
  └─ Sticky rail PageCard
       sub-tabs: Samenvatting | Offerte instellingen
       Samenvatting: totalen · betalingsvoorwaarden · betalingsplanning-timeline · concept-banner
```

| Regel | Detail |
| --- | --- |
| Financiële planning | In de **rail**, niet als primaire tab |
| Marge-KPI | Alleen met echte kostprijs; anders `—` |
| Actieve tab | `border-b-2 border-primary text-primary` |
| Rail-breedte | `20rem` sticky `top-20` |

**Canonical:** `src/features/quotes/components/quote-editor.tsx`  
Fase-0 / backlog: [`QUOTE_EDITOR_PHASE0.md`](./QUOTE_EDITOR_PHASE0.md), [`QUOTE_FINANCIAL_PLANNING.md`](./QUOTE_FINANCIAL_PLANNING.md)

### 4.6 Coming soon / stub

`PageCard p-8` · icoon · `h3 text-sm font-medium` · één zin muted · optioneel outline-CTA.  
Geen nepcijfers.

---

## 5. Typografie-schaal

| Rol | Classes |
| --- | --- |
| Shell-titel | `text-base font-semibold tracking-tight` |
| Entity-titel (detail) | `text-xl font-semibold tracking-tight sm:text-2xl` |
| Sectietitel | `text-sm font-medium` |
| KPI-waarde | `text-xl` / `text-2xl font-semibold tabular-nums` |
| KPI- / meta-label | `text-[11px] font-medium tracking-wide text-muted-foreground uppercase` |
| Body / tabel | `text-sm` |
| Meta / timestamps | `text-xs text-muted-foreground` |
| Tab-count pill | `text-[10px] font-medium` |

---

## 6. Componentrecepten

### Buttons

- shadcn `Button`: `default` (primary) · `outline` · `ghost` · `destructive`
- Hoogtes: default `h-8`, `sm` `h-7`, icon `icon-sm`
- Split-add: twee knoppen aan elkaar (`rounded-r-none` / `rounded-l-none`)

### Badges / status

- Pill `Badge`; projectstatus: uitvoering/voltooid → `success`, voorbereiding → `default`, gearchiveerd → `outline`
- Soft label-chips: `bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium`

### Tabs

| Variant | Gebruik | Patroon |
| --- | --- | --- |
| Underline | Pagina-secties (detail) | `border-b-2 border-primary text-primary` + count-pill |
| Segmented | View-switch (lijst/boom/kanban) | `rounded-lg border bg-card p-0.5` · actief `bg-primary/10 text-primary` |
| Card-top | Editor-secties | `border-b-2` op tab binnen card |

### Tabellen / grid-lijsten

- Header: `bg-muted/40`, vaak `text-[11px] uppercase tracking-wide text-muted-foreground`
- Rijen: `border-b border-border/70`, `hover:bg-muted/30`, cellen `px-4 py-3 text-sm`
- Geen zware rasterlijnen

### Filters / toolbar

- Zoek: `Input h-9` + Lucide `Search` links
- Native of shadcn select: `h-9 rounded-lg border … text-sm`
- Toolbar in `PageCard p-3`

### Overlays

- Detail/side panel: Sheet rechts, korte fade/slide, lichte overlay
- Bevestigen: Dialog
- Geen grote entrance-animaties

### Empty states

Minimaal: muted zin in de card.  
Rijker: titel + korte uitleg + primaire actie. Nooit een “lege” dode pagina.

### KPI’s / MetaStat

- `MetaStatCard` voor compacte meta
- Hero-KPI’s: label uppercase 11px · grote `tabular-nums` waarde · hint 11px (danger = `text-destructive`)
- Ontbrekende data: `—` of muted `opacity-70` — **nooit** verzonnen getallen

---

## 7. Data-eerlijkheid

- Voortgang, uren, openstaand, financials: alleen echte data of lege state
- Coming-soon modules: stub-copy, geen fake dashboards
- Zie ook: `WORK_ITEMS_TAB_PLAN.md`, project-/quote-backlogs

---

## 8. Motion

- Alleen `transition-colors` / `opacity` / korte sheet-slide (`duration-100`–`200`)
- Header/composer: `backdrop-blur-sm` is ok
- Geen springs, glow-pulses, of decorative motion

---

## 9. Responsive

- Desktop leidend; tablet zelfde recept
- Detail-hero: identity + KPI’s stacken onder `xl`; op `xl` één rij
- Functionaliteit blijft gelijk op kleinere breakpoints

---

## 10. Do / Don’t

### Do

- `ShellPage` + `PageCard` / `MetaStatCard`
- Navy sidebar als enige dark chrome
- Blauw spaarzaam; soft primary chips voor labels/actief
- Recept 4.x volgen voor nieuwe schermen
- i18n (`messages/{nl,en,de}.json`) voor alle user-facing strings
- Canonical componenten hergebruiken vóór iets nieuws bouwen

### Don’t

- Screenshot 1:1 nabootsen met een nieuw layout-idioom
- Acties op een volle regel boven de hero als ze in de card horen
- KPI’s onder de identity forceren terwijl ze naast elkaar horen
- shadcn `Card` i.p.v. `PageCard`
- Paars/indigo, cream+serif, emoji-decoratie, multi-shadow glow
- Nep-KPI’s of marketing-stat strips
- Nieuwe fonts of icon libraries
- Page-description onder de shell-titel

---

## 11. Canonical bestanden

| Onderwerp | Pad |
| --- | --- |
| Tokens | `src/app/globals.css` |
| Shell / header / breedte | `src/features/shell/components/` |
| Surfaces | `page-card.tsx` |
| UI primitives | `src/components/ui/` |
| Lijst + KPI’s | `src/features/projects/components/projects-workspace.tsx` |
| Detail + tabs + hero | `src/features/projects/components/project-detail-workspace.tsx` |
| Workspace-lijst | `src/features/projects/components/project-work-items-workspace.tsx` |
| Editor | `src/features/quotes/components/quote-editor.tsx` |

---

## 12. Uitbreiden van dit systeem

1. Zoek of een recept/component al bestaat.
2. Zo niet: voeg het patroon hier toe (recept + canonical pad).
3. Bouw daarna het scherm.

Feature-backlogs (`*_BACKLOG.md`) beschrijven *wat* later komt; dit document beschrijft *hoe* het eruitziet.
