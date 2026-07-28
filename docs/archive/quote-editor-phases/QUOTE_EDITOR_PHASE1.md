# Offerte-editor — Fase 1 (regelwerkplaats)

> Laatst bijgewerkt: 2026-07-27  
> SQL: `docs/sql-applied/20260727340000_quote_line_types.sql`

## Opgeleverd

- `quote_lines.line_type`: `article | hours | labor | text | section`
- Type-badges / type-select in de editor
- Toolbar: regel · groep · kopieer · verwijder (multi-select) · bereken prijzen (stub)
- Drag-and-drop herordenen op root-niveau
- Kolommen dichter bij mock: type · aantal · eenheid · prijs · korting · totaal
- Footer: totaal uren · totaal materiaal
- VAT-kolom uit hoofdgrid gehaald (blijft op regel in DB; later in instellingen/detail)

## Actie

Run SQL in Supabase vóór gebruik:

`20260727340000_quote_line_types.sql`

## Volgende (fase 2)

- [x] Artikel-picker uit catalogus → [`QUOTE_EDITOR_PHASE2.md`](./QUOTE_EDITOR_PHASE2.md)
- [x] Echte “Bereken prijzen”
- [x] Kostprijs → marge-KPI
