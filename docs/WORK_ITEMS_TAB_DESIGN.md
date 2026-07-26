# Taken-tab — designinventaris

> Bron: mock projectdetail → tab **Taken** (WerkOS)  
> Vastgelegd: 2026-07-26  
> Doel: alle zichtbare UI-elementen documenteren als bouwreferentie.

## Context

De Taken-tab is het operationele hart van één project: een volwaardige projectmanagement-werkruimte *binnen* de projectdetailpagina. Klikken op een werkzaamheid opent een **rechter overlay** (subwerkruimte) met werkzaamheid-detail.

Sidebar (navy) en globale shell blijven ongewijzigd.

---

## 1. Projectheader (boven de tabs — relevant voor Taken)

| Element | Beschrijving |
| --- | --- |
| Cover / thumbnail | Vierkante afbeelding + bewerk-icoon |
| Projectnaam | Titel |
| Statusbadge | bijv. Voorbereiding |
| Favoriet (ster) | Toggle |
| Meer-menu `⋯` | Rij-acties |
| Projectnummer | `PRJ-YYYY-NNNN` |
| Klantlink | Naam + icoon |
| Datum | Startdatum / periode |
| Projectleider | User-icoon + naam |
| Labels | Pills + “+ Label toevoegen” |
| **KPI: Voortgang** | Ring + `%` + `x/y taken` |
| **KPI: Werkzaamheden** | Totaal + “x voltooid” |
| **KPI: Openstaand** | Aantal + “x te laat” (rood) |
| **KPI: Geschatte uren** | Totaal u + “Nog xu” |

> Opmerking: in de mock zitten deze KPI’s in de projectheader. Ze zijn afgeleid van werkzaamheden (geen fictieve financiën).

---

## 2. Tabs

Overzicht · Offertes (count) · Werkbonnen · Planning · **Taken (count)** · Bestanden · Financieel · Communicatie · Activiteit (count)

Actieve tab: blauwe underline.

---

## 3. Taken-layout (twee kolommen)

```
[ Toolbar + hiërarchische lijst/tabel ]  |  [ Rechter widgets ]
```

Responsive: widgets onder de lijst op smalle schermen.

---

## 4. Toolbar

| Element | Type | Notitie |
| --- | --- | --- |
| Lijst | View toggle (actief) | Primaire weergave |
| Boomstructuur | View toggle | Later |
| Kanban | View toggle | Later |
| Zoekveld | Input | “Zoek werkzaamheden…” |
| Status | Filter dropdown | |
| Toegewezen | Filter dropdown | Assignee |
| Categorie | Filter dropdown | |
| Meer filters | Button/dropdown | Later |
| + Toevoegen | Primary CTA (+ split) | Werkzaamheid / groep |

---

## 5. Lijst / tabel

### Kolommen

| Kolom | Inhoud |
| --- | --- |
| Checkbox | Multi-select |
| Werkzaamheid | Titel + optionele ondertitel/beschrijving |
| Categorie | Tekst/pill |
| Toegewezen | Avatar + naam |
| Status | Badge: Voltooid (groen), In uitvoering (blauw), Open (grijs); Te laat (rood) als afgeleide |
| Planning | Datum of range |
| Geschatte uren | bijv. `4u` |
| Rij-menu `⋯` | Contextacties |

### Groepen (hiërarchie)

- Groepskop: nummer + titel (bijv. `1. Voorbereiding`), aantal items, voortgangsbalk, `done/total`
- Expand/collapse
- Onder elke groep: werkzaamheden-rijen
- Onderaan groep: “+ Werkzaamheid toevoegen”
- Domeinmodel: **geen apart fase-object** — groepen = werkzaamheden met subwerkzaamheden (`parent_id`)

### Footer

- Totaal aantal werkzaamheden
- Som geschatte uren

---

## 6. Rechterkolom widgets

| Widget | Inhoud |
| --- | --- |
| Werkzaamheden overzicht | Totaal, Voltooid, In uitvoering, Openstaand, Te laat (rood) |
| Categorieën | Donut + legenda met % |
| Templates | Promo-card “Sla tijd met templates…” + CTA (later) |

---

## 7. Overlay werkzaamheid-detail

- Opent van rechts over de content
- Breedte: ruim (richting subwerkruimte, niet smalle drawer)
- v1: placeholder-inhoud (titel + “volgt”)
- Later: planning, uren, materiaal, checklist, bestanden, communicatie, enz. (zie IA)

---

## 8. Interacties (design)

- Klik rij → overlay open
- Checkbox → selectie (bulk later)
- Statusbadge klikbaar → status wisselen (v1 wenselijk)
- Expand groep
- + Toevoegen / + in groep
- Filters + zoeken client-side of server

---

## 9. Visuele tokens (bestaand systeem)

- PageCards, blauw primary, grijs canvas
- Geist typografie
- Status: success / primary / muted / destructive voor te laat
- Geen paarse AI-defaults; sidebar navy blijft
