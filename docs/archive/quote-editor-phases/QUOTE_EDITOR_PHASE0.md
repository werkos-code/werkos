# Offerte-editor — Fase 0 (shell)

> Laatst bijgewerkt: 2026-07-27  
> Doel: mock-layout zonder nieuw domein. Canonical: `quote-editor.tsx`

## Opbouw

```
QuoteEditor
├─ Header (titel · OFF-nummer · status · save · Acties/Voorbeeld/Verzenden)
├─ KPI-strip (excl · btw · incl · marge —)
├─ Underline-tabs
│    Overzicht · Offerte editor · Voorwaarden · Bijlagen · Opmerkingen · Activiteiten
└─ grid xl:[1fr_20rem]
     ├─ Main (tab-body)
     └─ Rail sticky (Samenvatting | Instellingen)
          ├─ Totalen
          ├─ Betalingsvoorwaarden (stub)
          ├─ Betalingsplanning (timeline)
          └─ Concept-banner
```

## Beslissingen Fase 0

- Financiële planning **niet** als primaire tab — in de rail als timeline
- KPI-marge toont `—` tot kostprijs bestaat (geen nep-%)
- Opslaan blijft expliciet (knop); indicator “Niet opgeslagen” / “Opgeslagen”
- Bijlagen / Activiteiten: lege staat (coming soon), geen dode disabled toolbar-knoppen in de editor-tab
- Volledige fase-tabel blijft bereikbaar via rail → “Planning bewerken”

## Volgende fases

- [x] Fase 1 — regelwerkplaats → [`QUOTE_EDITOR_PHASE1.md`](./QUOTE_EDITOR_PHASE1.md)
- [x] Fase 2 — catalogus & marge → [`QUOTE_EDITOR_PHASE2.md`](./QUOTE_EDITOR_PHASE2.md)
- [x] Fase 3 — betaaltermijn & voorwaarden → [`QUOTE_EDITOR_PHASE3.md`](./QUOTE_EDITOR_PHASE3.md)
- [x] Fase 4 — voorbeeld / versturen → [`QUOTE_EDITOR_PHASE4.md`](./QUOTE_EDITOR_PHASE4.md)
- [x] Fase 5 — org-briefpapier → [`QUOTE_EDITOR_PHASE5.md`](./QUOTE_EDITOR_PHASE5.md)
- Zie ook `QUOTE_FINANCIAL_PLANNING.md` / [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§2 Offertes).
