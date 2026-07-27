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

Zie analyse in chat + `QUOTE_FINANCIAL_PLANNING.md` / `QUOTE_EDITOR_BACKLOG.md`.
