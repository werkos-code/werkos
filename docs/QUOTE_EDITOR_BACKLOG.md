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
| Offertenummer (`OFF-…`) | Meta-kaart, disabled / “Nog niet toegekend” | Schema `quote_number` (+ generatie), API, copy-actie |
| Voorbeeld (preview) | Disabled knop in editor-header | PDF/online representatie (domain: aparte weergave, bron = offerte) |
| Meer-opties `⋯` | Disabled | Dupliceren, annuleren-shortcuts, export, … |
| Tekstregel | Disabled in toolbar | Line-type of flag “alleen tekst” zonder prijs |
| Korting (regel- of offerte-niveau in toolbar) | Disabled in toolbar; regel-korting blijft in rij | Eventueel quote-level `discount`; toolbar-actie |
| Afbeelding op regel | Disabled in toolbar | Storage + `image_url` / attachment op `quote_lines` |
| Importeren | Disabled | Importflow (Excel/CSV) + mapping |
| Drag-and-drop herordenen | Geen handle / later | `sort_order` updates via API + DnD lib |
| Thumbnails op regels | Niet getoond | Zelfde als afbeeldingen |
| Bijlagen / dropzone | Disabled dropzone + lege bijlagenlijst | Storage bucket, `quote_attachments` (of generiek), RLS, upload API |
| Winstmarge-kaart | Niet getoond (geen stub-ruis) | Kostprijs op regels/artikelen; berekening |
| Betaaltermijn | Disabled select | Veld op `quotes` of org-defaults |
| Betalingsvoorwaarden | Disabled select | Catalogus voorwaarden + koppeling |
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

- [ ] Offertenummer
- [ ] Voorbeeld / PDF of online preview
- [ ] Header `⋯` acties (o.a. dupliceren)
- [ ] Tekstregel
- [ ] Toolbar-korting (offerte-niveau)
- [ ] Regel-afbeeldingen + thumbnails
- [ ] Importeren
- [ ] Drag-and-drop sort
- [ ] Bijlagen upload + lijst
- [ ] Winstmarge (alleen met echte kostprijs)
- [ ] Betaaltermijn + betalingsvoorwaarden
- [ ] Sneltoetsen
