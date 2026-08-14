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
| Sidebar | Vast tegen links/boven/onder; afronding alleen rechtsboven en rechtsonder (`rounded-3xl`); organisatie-switcher bovenaan; **inklappbare** sectiekoppen; Bedrijf default dicht; subtiele active state |
| Sidebar CTA | Alleen “Nieuwe opdracht”: lichte blauwe gradient `#2563EB` → `#60A5FA` — nergens anders hergebruiken |
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

### 4.2 Detailpagina (project)

Chrome-titel is de lijst (`Projecten`), niet de projectnaam — identity staat in de hero.

```
Cover-hero (foto of fallback `/brand/project-hero-fallback.jpg`)
Modus-chips: Overzicht · Werk · Offertes · Bestanden · Geld
  + link “Open in planning” rechts (geen tab)
Default Overzicht = 2-koloms cockpit
Diep werk = bestaande workspace / lijst / editor
```

1. Cover-hero `rounded-xl overflow-hidden`, overlay-gradient, witte tekst:
   - Achtergrond: projectcover, anders de navy/blauw fallback-graphic
   - Titel + status-pill · meta `PRJ-… · klant`
   - Dunne voortgangsbalk (echte % of muted leeg)
   - 3 eerlijke stats: werkzaamheden · offertes · gefactureerd — **geen** verzonnen bedragen
   - Primaire CTA + `⋯` **in** de hero, rechtsboven — niet op een volle regel erboven
2. Modus-chips: `rounded-lg border px-4 py-2.5` met icoon. Inactief `border-border bg-card text-foreground`; actief `border-primary bg-primary/10 text-primary`. Planning = blauwe link rechts, geen modus.
3. Overzicht-cockpit `grid xl:[minmax(0,1.6fr)_minmax(18rem,0.9fr)]`:
   - Links: Aandacht · Werk-preview · Recente activiteit
   - Rechts: Commercieel · Klant & locatie (Bel / Route)
4. Werk / Offertes / Bestanden / Geld hergebruiken bestaande panelen; werkzaamheden-detail blijft ~70vw sheet
5. Optioneel: vaste bottom-composer (notities)

**Canonical:** `src/features/projects/components/project-detail-workspace.tsx` · overview: `project-detail-overview.tsx`

### 4.3 Operationele workspace (lijst in context)

1. Toolbar: segmented view · zoek · filters · split primary-add
2. Hoofdlijst `PageCard p-0` (+ optionele rechterrail ~`17.5rem`)
3. Rijen: CSS-grid of tabel met rustige hover; hiërarchie via indent/groepen
4. Klik rij → **brede Sheet** (subwerkruimte, ~70vw). Geen underline-tabs en geen coming-soon-tabs.

```
Hero (titel + status · meta · dunne voortgang · stats · ⋯)
Modus-chips: Overzicht · Planning · Tijd & uren · Materiaal
Default Overzicht = 2-koloms cockpit
Diepe modi = bestaande panelen
```

   - Hero in de sheet: titel + status-pill, meta, dunne balk, 3 stats (uren · toegewezen · subtaken), `⋯` rechts
   - Modus-chips: zelfde classes als projectdetail (`rounded-lg border px-4 py-2.5`)
   - Overzicht-cockpit: links beschrijving + subtaken; rechts toegewezen · planning-samenvatting (link naar Planning) · gegevens · recente activiteit
   - Planning / uren / materiaal hergebruiken bestaande panelen

**Voorbeeld:** `project-work-items-workspace.tsx`, `work-item-detail-sheet.tsx`, `work-orders-workspace.tsx`, `invoices-workspace.tsx`  
Detail-sheets: altijd ~`70vw` (geen smalle 28rem-sidebar).  
Canonical overlay: `src/features/projects/components/work-item-detail-sheet.tsx`  
Detail-rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§7)

### 4.4 Kalender / Planning workspace

1. View-tabs (Dag/Week/Maand/Agenda) + datum-nav + primary “+ Nieuwe afspraak”
2. Filterbalk `PageCard p-3` (zoek + project/persoon/type/status)
3. Hoofdvlak: optionele “Niet gepland”-rail + week/tijdgrid in `PageCard p-0`
4. Eventblokken: zachte pastel (`planningColorForKey`), geen harde neon
5. Selectie → detailpaneel rechts (~22rem) met meta + bewerken
6. Planning is een **weergave** van `appointments` + geplande `work_items` — geen gedupliceerde administratie

**Voorbeeld:** `src/features/planning/components/planning-workspace.tsx`  
Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§8)

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
Open refine: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§2). Financiële planning: [`QUOTE_FINANCIAL_PLANNING.md`](./QUOTE_FINANCIAL_PLANNING.md). Afgeronde fases: `docs/archive/quote-editor-phases/`.

### 4.6 Coming soon / stub

`PageCard p-8` · icoon · `h3 text-sm font-medium` · één zin muted · optioneel outline-CTA.  
Geen nepcijfers.

### 4.7 Home / dashboard (uniek)

Landingspagina. Zelfde app-frame (sidebar + header), **geen** lijst/detail/workspace-recept.

```
Greeting in content (niet in de chrome)
3× PageCard: Aandacht · Vandaag · Mijn taken
grid xl:[minmax(0,1.7fr)_minmax(18rem,0.9fr)]
  ├─ Actieve projecten (tabel in PageCard)
  └─ rail: Financieel + Snelle acties
```

| Regel | Detail |
| --- | --- |
| Chrome-titel | `Dashboard` — groet staat in de content |
| Greeting | `text-2xl font-semibold tracking-tight` + datum `text-sm text-muted-foreground` |
| Widgets | Alleen `PageCard`; footer-link `text-sm text-primary` |
| Data | Echte signalen of lege state — geen nep-KPI’s |
| Snelle acties | Compacte tegels (icoon `bg-primary/10`); geen sidebar-CTA-gradient |

**Canonical:** `src/features/dashboard/components/dashboard-workspace.tsx`

### 4.8 Onboarding (centered, buiten de app-shell)

Full-bleed foto + navy overlay. Wit logo boven een groot gecentreerd formulierblok.

```
Foto (full-bleed) + overlay
logo-white + Website-knop
wit blok rounded-3xl, geen border, royale padding
```

1. Logo: `/brand/logo-white.svg` — **geen** achtergrond achter het logo
2. Achtergrondfoto: `/onboarding/solar-installer.png` (vervangbaar via `atmosphere.ts`)
3. Formulier in het witte blok; geen geneste cards
4. Progress: segmented bar — 6 stappen (account → bedrijf → team → betaling → inrichten → klaar). Geen welcome-stap.
5. Branche-chips: modus-chip classes; extra veld reserveert hoogte

**Canonical:** `src/features/onboarding/components/onboarding-shell.tsx`

### 4.9 Login & app-start (buiten de app-shell)

**Login:** full-bleed achtergrondfoto, navy overlay, groot wit centrumvak (`rounded-3xl`, geen border, royale padding). Volgorde in het vak: logo → titel → subtitel → velden → CTA → account-link → website-link.

**App-start:** gecentreerd frame via `AuthEntryShell` (logo, Website-knop, PageCard, USP’s).

**Canonical:** `src/features/auth/components/login-shell.tsx` · `login-card.tsx` · `src/app/[locale]/page.tsx`

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
| Mode chips | Projectdetail / module-sheets | `rounded-lg border px-4 py-2.5` · inactief `border-border bg-card` · actief `border-primary bg-primary/10 text-primary` |
| Underline | Editor | `border-b-2 border-primary text-primary` + count-pill |
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
- Detail-hero: cover-banner full-width; modus-chips wrappen op smal scherm
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
| Detail + cover-hero + modus-chips | `src/features/projects/components/project-detail-workspace.tsx` |
| Workspace-lijst | `src/features/projects/components/project-work-items-workspace.tsx` |
| Editor | `src/features/quotes/components/quote-editor.tsx` |
| Mega backlog (open + afgerond) | [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) |

---

## 12. Uitbreiden van dit systeem

1. Zoek of een recept/component al bestaat.
2. Zo niet: voeg het patroon hier toe (recept + canonical pad).
3. Bouw daarna het scherm.

De mega backlog ([`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md)) beschrijft *wat* later komt; dit document beschrijft *hoe* het eruitziet. Oude losse `*_BACKLOG.md`-bestanden staan in `docs/archive/backlogs/`.
