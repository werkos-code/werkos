# Financiële planning op offerte

> Laatst bijgewerkt: 2026-07-27  
> UI: tab **Financiële planning** in offerte-editor · API: `/api/quotes/[quoteId]/billing-phases`

## Doel

Vanuit één offerte **meerdere facturen** plannen en aanmaken — voorschot, fasen (bijv. aanleg terras), slotfactuur.

De wizard blijft een snelle prijsindicatie; volledige offerte + betalingsplan leven in de **offerte-editor**.

## Benchmark

| Product | Patroon |
| --- | --- |
| Robaws | Tab financiële planning op offerte én project; schijven % of vast; factureren → concept; slotfactuur trekt voorschotten af |
| Vastlegg / Vertuoza | Termijnfacturen, betaalstatus per schijf |
| Buildertrend | Draw schedule op vaste prijs; org-default template |

## Domeinmodel

### `quotes.quote_number`

Auto `OFF-YYYY-NNNN` per organisatie (zelfde patroon als `INV-` / `PRJ-`).

### `quote_billing_phases`

| Kolom | Type | Beschrijving |
| --- | --- | --- |
| `kind` | `standard` \| `final` | `final` = slotfactuur (resterend bedrag) |
| `amount_type` | `percent` \| `fixed_cents` | 2500 bps = 25% |
| `amount_value` | integer | bps of centen |
| `invoice_id` | uuid? | Gekoppelde factuur na factureren |
| `invoiced_at` | timestamptz? | |

### Facturatiestrategie (MVP)

- **Standaard schijf:** één factuurregel met omschrijving + bedrag (simpel, Robaws-strategie 1)
- **Slotfactuur:** resterend netto − reeds gefactureerde schijven; één regel “Slotfactuur”
- **Cumulatief op PDF:** v2 (zie [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) §3 Facturen)

### Validatie

- Som `percent`-schijven (excl. `final`) ≤ 100%
- Max één `final`-schijf
- Schijf met `invoice_id` is niet bewerkbaar (alleen titel lezen)

## API

| Method | Route | Doel |
| --- | --- | --- |
| GET | `/api/quotes/[quoteId]/billing-phases` | Lijst + berekende bedragen |
| PUT | `/api/quotes/[quoteId]/billing-phases` | Vervang alle fases (concept-offerte) |
| POST | `/api/quotes/[quoteId]/billing-phases/[phaseId]/invoice` | Conceptfactuur aanmaken |

## UI (offerte-editor)

**Fase 0:** Betalingsplanning zit in de **rechter rail** (timeline), niet als primaire tab.
Volledige fase-tabel opent via **Planning bewerken** (dialog).

Rail-sectie:

- Timeline: titel · % · bedrag · status · Factureren
- Voortgang / 100%-totaal
- Knop “Termijn toevoegen” / standaardschema

Zie `QUOTE_EDITOR_PHASE0.md`.

## Roadmap

| Fase | Onderwerp |
| --- | --- |
| **MVP** (nu) | Schema + factureren simpel + offertenummer |
| v2 | Cumulatieve slotfactuur met regeloverzicht |
| v3 | Org-templates, sync naar project na acceptatie |
| v4 | Koppeling werkzaamheden / planning-item per schijf |

Zie ook: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§2 Offertes, §3 Facturen), `OPERATIONAL_FLOW.md`.
