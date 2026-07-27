# Offerte-editor — uitgesteld (stubs)

> Laatst bijgewerkt: 2026-07-26  
> Context: UI-modernisering naar mock “Offerte bewerken”. Onderstaande items staan als **disabled stubs** in de UI of zijn bewust weggelaten tot schema/API klaar is.  
> **Niet vergeten:** wanneer je een stub activeert, haal hem hier weg en update `docs/DESIGN_SYSTEM.md` indien nodig.

## Beslissingen (vastgelegd)

1. **Opslaan:** expliciet (knop Opslaan). Waarschuwing bij navigatie/tab-sluiten als er niet-opgeslagen wijzigingen zijn.
2. **Notities:** in tabs (Voorwaarden = externe notities, Opmerkingen = interne notities; Informatie = titel/meta).
3. **App-UI:** één golf modernisering; **sidebar blijft** zoals nu; header-acties (zoeken, notificaties, help) blijven.
4. **Ontbrekende features:** disabled stubs + dit backlog-document.

## Stubs / later uitwerken

| Feature | UI nu | Nodig om te activeren |
| --- | --- | --- |
| Offertenummer (`OFF-…`) | Meta-kaart + header | ✅ `OFF-YYYY-NNNN` via DB-trigger |
| Voorbeeld (preview) | Voorbeeldpagina + Afdrukken/PDF | ✅ Fase 4 (browser-PDF; geen server-PDF) |
| Meer-opties `⋯` | Disabled | Dupliceren, annuleren-shortcuts, export, … |
| Tekstregel | Type `text` in type-select | ✅ Fase 1 (`line_type`) |
| Korting (regel- of offerte-niveau in toolbar) | Regel-korting in kolom; offerte-niveau later | Eventueel quote-level `discount`; toolbar-actie |
| Afbeelding op regel | Disabled in toolbar | Storage + `image_url` / attachment op `quote_lines` |
| Importeren | Disabled | Importflow (Excel/CSV) + mapping |
| Drag-and-drop herordenen | Root-niveau DnD | ✅ Fase 1 (child-DnD later) |
| Thumbnails op regels | Niet getoond | Zelfde als afbeeldingen |
| Bijlagen / dropzone | Disabled dropzone + lege bijlagenlijst | Storage bucket, `quote_attachments` (of generiek), RLS, upload API |
| Winstmarge-kaart | KPI toont % bij kostprijs-snapshot | ✅ Fase 2 |
| Betaaltermijn | Select 0–90 dagen op offerte | ✅ Fase 3 (`payment_terms_days`) |
| Betalingsvoorwaarden | Vrij tekstveld op offerte | ✅ Fase 3 (`payment_conditions`); catalogus later |
| Offerte-tips | Niet getoond | Content/CMS of vaste tips — alleen als het rust ondersteunt |
| Sneltoetsen-footer | Disabled / hint later | Keyboard map + docs |

## Bewust wél in v1 van de mock-UI

- Editor-layout (meta-kaarten, tabs, secties, totals-rail)
- Expliciet opslaan + leave-guard
- Statuspill, Versturen / Accepteren / Afwijzen / Annuleren
- Hiërarchische regels (sectie + subregel) met live totalen
- Tabs Informatie / Voorwaarden / Opmerkingen op bestaande velden
- Blauw accent + grijze canvas; Geist; sidebar ongewijzigd

## Afvinklijst (voor latere sprints)

- [x] Offertenummer (`OFF-YYYY-NNNN`)
- [x] Voorbeeld / PDF of online preview (fase 4 — browser print)
- [ ] Header `⋯` acties (o.a. dupliceren)
- [x] Tekstregel (`line_type = text`)
- [ ] Toolbar-korting (offerte-niveau)
- [ ] Regel-afbeeldingen + thumbnails
- [ ] Importeren
- [x] Drag-and-drop sort (root)
- [ ] Bijlagen upload + lijst
- [x] Winstmarge (kostprijs-snapshot op regels)
- [x] Betaaltermijn + betalingsvoorwaarden (fase 3)
- [ ] Sneltoetsen
- [x] Catalogus / Bereken prijzen (fase 2)
- [ ] Echte e-mailprovider / publieke klantlink
- [x] Org-briefpapier (KvK, adres, IBAN — fase 5; logo later)
- [ ] Org-logo upload
- [x] Factuur-voorbeeld (zelfde printpatroon — fase 6)
