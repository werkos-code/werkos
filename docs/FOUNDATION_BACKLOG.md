# WerkOS — mega backlog

> Laatst bijgewerkt: 2026-07-28  
> Enige actieve backlog: stubs, basisvorm-pagina’s én openstaande/afgeronde feature-items.  
> Oude losse `*_BACKLOG.md`-bestanden: `docs/archive/backlogs/` (historisch).  
> UI-conventies: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) · Domein: [`OPERATIONAL_FLOW.md`](./OPERATIONAL_FLOW.md)

**Productbeslissing:** als de basisvorm-pagina’s werken én de openstaande punten hieronder zijn opgepakt, is de eerste basisvorm klaar. Daarna per module refinen tot professioneel niveau.

---

## Inhoud

1. [Basisvorm — stubs & shell](#1-basisvorm--stubs--shell)
2. [Offertes](#2-offertes)
3. [Facturen](#3-facturen)
4. [Projectenlijst](#4-projectenlijst)
5. [Projectdetail](#5-projectdetail)
6. [Werkzaamheden (project-tab)](#6-werkzaamheden-project-tab)
7. [Werkzaamheid-detail overlay](#7-werkzaamheid-detail-overlay)
8. [Planning](#8-planning)
9. [Werkbonnen](#9-werkbonnen)
10. [Documenten](#10-documenten)
11. [Uren & calculatie](#11-uren--calculatie)
12. [Materiaal ERP](#12-materiaal-erp)

---

## 1. Basisvorm — stubs & shell

> Routes bestaan vaak al als `ComingSoonPanel`; hier staat wat nog echt gebouwd moet worden.

### Statuslegenda

| Status | Betekenis |
| --- | --- |
| Stub | Route + nav/header aanwezig, alleen coming-soon |
| Partial | Deels werkend (andere context, of alleen icoon) |

### Navigatiepagina’s (sidebar)

| Module | Route | Status | Notities |
| --- | --- | --- | --- |
| Werkzaamheden (hoofdpagina) | `/werkzaamheden` | Done | Org-brede lijst + filters; rij → project `?tab=tasks` |
| Onderaannemers | `/onderaannemers` | Done | CRUD zoals klanten; SQL `20260728120000_subcontractors.sql` |
| Materiaal → Installaties | `/materiaal/installaties` | Parked | Uit sidebar gehaald; URL redirect naar voorraad tot we dit bouwen |
| Bedrijf → Rapportages | `/rapportages` | Done | KPI-strip + open projecten / te late werkzaamheden / openstaande facturen |
| Personeel | `/personeel` | Done | KPI’s, zoeken, invite (owner), rol wijzigen, verwijderen |
| Inbox | `/inbox` | Done | Interne gesprekken per project; thread + nieuw gesprek |
| Notificaties (pagina) | `/notificaties` | Done | Centrum + gelezen status; bel is live-klaar |

### Shell-header (rechtsboven)

| Element | Status | Notities |
| --- | --- | --- |
| Zoekfunctie | Done | ⌘K / header-icoon → globale zoekdialog |
| Notificatie-icoon | Done | Sheet + live badge + link naar `/notificaties` |
| Help-icoon | Done | Help-dialog met snelle links |

### Account & abonnement

| Module | Route | Status | Notities |
| --- | --- | --- | --- |
| Account | `/instellingen/account` | Done | Naam + wachtwoord wijzigen |
| Abonnement en facturatie | `/instellingen/abonnement` | Partial | Maandelijks live; **jaarlijks vóór livegang** — [`BILLING_YEARLY_IMPLEMENTATION.md`](./BILLING_YEARLY_IMPLEMENTATION.md) |

### Afvinklijst basisvorm

**Pagina’s**

- [x] Werkzaamheden hoofdpagina (`/werkzaamheden`) — org-breed overzicht, koppeling project-detail
- [x] Onderaannemers (`/onderaannemers`) — lijst + detail (zoals klanten/leveranciers)
- [ ] Materiaal → Installaties (`/materiaal/installaties`) — **geparkeerd** (niet in sidebar)
- [x] Rapportages (`/rapportages`) — eerste KPI/rapport-set
- [x] Personeel (`/personeel`) — teamleden / rollen in org (invite + beheer door owner)
- [x] Inbox (`/inbox`) — gesprekken-overzicht (MVP)
- [x] Notificaties-pagina (`/notificaties`) — geschiedenis + gelezen status

**Shell-chrome**

- [x] Globale zoekfunctie (header)
- [x] Notificatie-icoon → panel / badge
- [x] Help-icoon → help/docs overlay of link

**Instellingen**

- [x] Account (profiel, wachtwoord, voorkeuren)
- [x] Abonnement en facturatie (plan, seats, facturen SaaS)

---

## 2. Offertes

> UI: offerte-editor · financiële planning: [`QUOTE_FINANCIAL_PLANNING.md`](./QUOTE_FINANCIAL_PLANNING.md)  
> **MVP afgerond** (fases 0–8): shell, regels, catalogus/marge, voorwaarden, voorbeeld, briefpapier/logo, dupliceren, bijlagen, factuur-vanuit-offerte.  
> Historische fasenotes: `docs/archive/quote-editor-phases/`

### Beslissingen (vastgelegd)

1. **Opslaan:** expliciet (knop Opslaan). Waarschuwing bij navigatie/tab-sluiten als er niet-opgeslagen wijzigingen zijn.
2. **Notities:** in tabs (Voorwaarden = extern, Opmerkingen = intern).
3. **App-UI:** sidebar blijft; header-acties (zoeken, notificaties, help) blijven tot ze in §1 gebouwd zijn.
4. **Ontbrekende features:** stubs tot schema/API klaar is.

### Stubs / later

| Feature | UI nu | Nodig / status |
| --- | --- | --- |
| Offertenummer (`OFF-…`) | Meta + header | ✅ DB-trigger |
| Voorbeeld | Voorbeeldpagina + print | ✅ Fase 4 |
| Meer-opties `⋯` | Dropdown + dupliceren | ✅ Fase 7 (meer acties later) |
| Tekstregel | Type `text` | ✅ Fase 1 |
| Korting (offerte-niveau) | Regel-korting bestaat | Quote-level `discount` + toolbar |
| Afbeelding op regel | Disabled | Storage + `image_url` |
| Importeren | Disabled | Excel/CSV + mapping |
| Drag-and-drop | Root DnD | ✅ Fase 1 (child later) |
| Thumbnails | Niet | Zelfde als afbeeldingen |
| Bijlagen | Upload + lijst | ✅ Fase 8 |
| Winstmarge | KPI bij kostprijs | ✅ Fase 2 |
| Betaaltermijn / voorwaarden | Velden | ✅ Fase 3 (catalogus later) |
| Offerte-tips | Niet | Alleen als het rust ondersteunt |
| Sneltoetsen | Disabled | Keyboard map + docs |

### Afvinklijst

- [x] Offertenummer (`OFF-YYYY-NNNN`)
- [x] Voorbeeld / PDF (browser print)
- [x] Header `⋯` (dupliceren)
- [x] Tekstregel
- [ ] Toolbar-korting (offerte-niveau)
- [ ] Regel-afbeeldingen + thumbnails
- [ ] Importeren
- [x] Drag-and-drop sort (root)
- [x] Bijlagen upload + lijst
- [x] Winstmarge
- [x] Betaaltermijn + betalingsvoorwaarden
- [ ] Sneltoetsen
- [x] Catalogus / Bereken prijzen
- [ ] Echte e-mailprovider / publieke klantlink
- [x] Org-briefpapier + logo
- [x] Factuur-voorbeeld
- [x] Factuur vanuit geaccepteerde offerte

---

## 3. Facturen

> SQL: `docs/sql-applied/20260726260000_invoices.sql` · UI: `/facturen` · `src/features/invoices/`

### Afgerond (v1)

- [x] `invoices` + nummering `INV-YYYY-NNNN` + `sequence_number`
- [x] Optionele `quote_id`
- [x] `invoice_lines` + CRUD
- [x] Statussen: `draft | open | sent | paid` (Vervallen = display-only)
- [x] Org-lijst: KPI’s, tabs, filters, tabel, paginatie
- [x] Widgets: aging, betaaltrend, top 5 openstaand
- [x] Detail-sheet + status wijzigen
- [x] Factuur-editor
- [x] Handmatig aanmaken → editor
- [x] Vanuit project (uren + materiaal + werkzaamheden)
- [x] Projectdetail → tab Financieel
- [x] Vanuit geaccepteerde offerte (quote_lines)
- [x] Termijnfacturen (financiële planning)
- [x] Voorbeeld / Afdrukken-PDF + letterhead

### Open

- [ ] E-mail versturen / herinneringen
- [ ] Export / instellingen (nummerreeks, standaardtermijn, uurtarief org-default)
- [ ] Betalingsregistratie / cumulatieve slotfactuur
- [ ] `source_type` / `source_id` op regels
- [ ] Koppeling boekhouding

### Routes (referentie)

| Route | Doel |
| --- | --- |
| `/facturen` | Lijst + aanmaken |
| `/facturen/[invoiceId]` | Editor |
| `/facturen/[invoiceId]/voorbeeld` | Printbaar voorbeeld |
| `POST /api/invoices` | Header |
| `*/api/invoices/[id]/lines` | Regel CRUD |
| `GET/POST /api/invoices/from-project` | Vanuit project |
| `POST /api/quotes/[quoteId]/create-invoice` | Vanuit geaccepteerde offerte |

---

## 4. Projectenlijst

> UI: `/projecten` · mock “Alle projecten”

### Bewust wél in v1

- Header + CTA “Nieuwe opdracht”
- KPI-kaarten op echte projectcounts
- Zoeken, statusfilter, klantfilter, tabel, paginering
- PageCards + bestaande sidebar

### Open / stubs

| Feature | UI nu | Nodig |
| --- | --- | --- |
| Importeren | Disabled | Importflow + mapping |
| Filters opslaan | Disabled | Opgeslagen views |
| KPI-trends / omzet | “—” | Analytics + financials |
| Filter Projectleider | Disabled / deels klaar | Assignments |
| Filter Periode | Disabled / datums bestaan | UI-filter |
| Meer filters | Disabled | Extra velden |
| Grid-weergave | Disabled | Card-grid |
| Omzet per rij | “—” | Financiële aggregatie |
| Voortgang % | Stub / “—” | Werkzaamheden-progress |
| Bulk-acties | Selectie zonder acties | Bulk API |
| Rij-menu `⋯` | Disabled | Snelacties |

### Afvinklijst

- [ ] Importeren
- [ ] Filters opslaan / opgeslagen views
- [ ] KPI trends + omzet
- [ ] Projectleider-filter (kolom deels klaar)
- [ ] Periode-filter
- [ ] Meer filters
- [ ] Grid view
- [ ] Omzet + voortgang per project
- [ ] Bulk-acties + rij-menu

---

## 5. Projectdetail

> SQL: `20260726195000_project_detail_mvp.sql` + `20260726200000_project_detail_polish.sql`

### Afgerond

- [x] Projectnummer, start/eind, projectleider, contact, labels
- [x] Bewerkbare gegevens, activiteitfeed, notities
- [x] Voortgang op werkzaamheden, favoriet, delen, cover
- [x] Taken-tab (PM-werkruimte)
- [x] Werkbonnen-tab (compacte lijst v1)
- [x] Planning-tab (link naar module)
- [x] Bestanden-bibliotheek (v1)

### Open

- [ ] Financieel-tab echt (KPI’s / marge; facturenlijst bestaat)
- [ ] Communicatie-tab
- [ ] Omzet / marge / facturatiegraad

---

## 6. Werkzaamheden (project-tab)

> Design t.o.v. mock; org-pagina: zie [§1](#1-basisvorm--stubs--shell)

### Views

- [ ] Boomstructuur-weergave
- [ ] Kanban-weergave
- [ ] Opslaan / wisselen van weergavevoorkeur per user

### Filters & selectie

- [ ] “Meer filters” (deadline, te laat, zonder assignee, …)
- [ ] Bulkacties op checkbox-selectie
- [ ] Filter Projectleider / periode op projectniveau

### Werkzaamheid-data

- [x] Drag-and-drop sorteren / verplaatsen tussen groepen (v1)
- [ ] Meerdere assignees per werkzaamheid
- [ ] Rijkere statusset (gepland, gepauzeerd, wacht op klant, …)
- [ ] Inline bewerken van alle kolommen
- [ ] Diepere boom dan 1 groepniveau
- [ ] Categorie als beheerde taxonomie

### Overlay / modules (vanuit tab)

- [x] Detailwerkruimte v1 — zie [§7](#7-werkzaamheid-detail-overlay)
- [ ] Planning / afspraken koppelen
- [ ] Urenregistratie (module-koppeling in overlay)
- [ ] Materiaalregistratie
- [ ] Checklist & formulieren
- [ ] Bestanden & foto’s op werkzaamheid
- [ ] Communicatie-thread
- [ ] Terug-nav als eigen hoofdroute (IA)

### Widgets & product

- [ ] Templates voor terugkerend werk
- [ ] Interactieve donut (filter bij klik)
- [ ] Export / print werkzaamheden
- [x] Split-button “+ Toevoegen”
- [ ] Hero `⋯` meer-menu

### Org-brede hoofdpagina

- [x] `/werkzaamheden` als echte org-lijstwerkruimte — zie [§1](#1-basisvorm--stubs--shell)

---

## 7. Werkzaamheid-detail overlay

> SQL: `20260726230000_work_item_detail.sql` · UI: `work-item-detail-sheet.tsx`

### Afgerond (v1)

- [x] Brede rechter overlay + header + tabs
- [x] Overzicht, subtaken, planning-datums, labels, assignee, activiteit
- [x] Tab Tijd & uren (boekingen + verwacht vs werkelijk)
- [x] Verwachte uren bewerkbaar

### Wacht op / placeholder modules

| Onderdeel | Status |
| --- | --- |
| Bestanden & foto’s op werkzaamheid | Placeholder |
| Communicatie-thread | Placeholder |
| Afspraken koppelen in Planning-tab | Placeholder; datums werken |
| Materiaalregistratie | Kern materiaal-ERP elders; overlay-koppeling later |
| Checklist & formulieren | Later |

### Product later

- [ ] Meerdere assignees / rollen
- [ ] Voortgang op basis van gerealiseerde/geschatte uren
- [ ] Eigen hoofdroute i.p.v. alleen overlay
- [ ] Rijkere statusset
- [ ] Categorie-taxonomie
- [ ] Subtaken genest in Taken-lijst

---

## 8. Planning

> SQL: `20260726240000_appointments_planning.sql` · UI: `/planning`

### Afgerond (v1)

- [x] `appointments` + weekgrid + niet-gepland rail
- [x] Filters, nieuwe afspraak / inplannen, detailpaneel
- [x] Sync `work_items.planned_start/end`

### Views later

- [ ] Dagweergave
- [ ] Maandweergave
- [ ] Agenda-lijst
- [ ] Datumkiezer in toolbar
- [ ] Opgeslagen filter-/weergavevoorkeuren

### Interactie later

- [ ] Drag-and-drop van “Niet gepland” naar tijdslot
- [ ] Sleep/resize bestaande blokken
- [ ] Dubbelklik-slot create
- [ ] Conflict-/overlap-waarschuwingen
- [ ] Meerdere deelnemers per afspraak

### Product / modules

- [ ] Projectdetail-tab = gefilterde projectkalender
- [ ] Werkzaamheid-overlay: afspraken tonen/koppelen
- [ ] Resource-/personeelsbanen
- [ ] Herhalende afspraken
- [ ] Instellingen (werktijden, weekstart, kleuren)

---

## 9. Werkbonnen

> SQL: `20260726250000_work_orders.sql` · UI: `/werkbonnen`

### Afgerond (v1)

- [x] `work_orders` + `WB-YYYY-NNNN` + checklist + M:N work items
- [x] Org-lijst + detail-sheet + nieuwe werkbon
- [x] Projectdetail-tab + “Mijn werkbonnen”

### Views later

- [ ] Kanban
- [ ] Planning-weergave binnen module
- [ ] Export

### Detail / execution later

- [ ] Volledige werkbon-pagina
- [ ] Bijlagen / foto’s
- [ ] Meerdere uitvoerders + bel/bericht
- [ ] Materialen & uren op werkbon
- [ ] PDF / print / handtekening
- [ ] Koppelen/ontkoppelen werkzaamheden in UI
- [ ] Deep link vanuit Planning-afspraak

---

## 10. Documenten

> SQL: `docs/sql-applied/20260726270000_project_files.sql` · UI: `/documenten`

### Afgerond (v1)

- [x] Folders + `project_files` + private bucket
- [x] Centrale bibliotheek + projecttab
- [x] Upload / download / verwijderen / submappen

### Open

- [ ] Slimme mappen (voorstel bij werkzaamheid)
- [ ] Weergave vanuit werkzaamheid / offerte / factuur (geen tweede opslag)
- [ ] Preview / PDF-viewer
- [ ] Hernoemen bestanden, slepen tussen mappen
- [ ] Versies / delen met klantportaal
- [ ] Bulk-zip download

---

## 11. Uren & calculatie

> SQL: `docs/sql-applied/20260726280000_time_entries.sql` · UI: tab Tijd & uren

### Afgerond (v1)

- [x] `time_entries` + CRUD op blad-werkzaamheden
- [x] Verwachte uren + rollups + offerte `estimated_minutes`
- [x] Bij acceptatie: verwachte uren → werkzaamheid

### Open

- [ ] Personeelsportaal (zelfde entries, andere UI)
- [ ] Uurtarieven / kostprijs / billable / marge
- [ ] Timer start/stop
- [ ] Goedkeuring / correcties
- [ ] Werkbon: werkelijke uren via `work_order_id` of rollup
- [ ] Centrale uren-overzichtspagina (Rapportages)
- [ ] Materiaalregistratie (zelfde verwachting/werkelijkheid-patroon)
- [ ] Factureren van uren

---

## 12. Materiaal ERP

> SQL: `docs/sql-applied/README.md` · Setup: [`PENDING_SETUP.md`](./PENDING_SETUP.md)

### Afgerond

- [x] Fase A–F: artikelen, voorraad, BOM, leveranciers, inkoop, ontvangst, reserveringen, werkbon-materiaal, 3-way match
- [x] Fase G: 2BA zoeken/importeren + handmatig op inkoopregel + artikelenpagina

### Open

- [ ] **2BA credentials activeren** — zie `PENDING_SETUP.md`
- [ ] **Installaties** (`/materiaal/installaties`) — geparkeerd; uit sidebar, redirect naar voorraad
- [ ] Veld/portaal (scan + offline)
- [ ] 2BA: nettoprijzen / voorraad per leverancier (optioneel)

---

## Archief

Losse voorgangers van dit document (inhoud hierin samengevoegd):

`docs/archive/backlogs/`
