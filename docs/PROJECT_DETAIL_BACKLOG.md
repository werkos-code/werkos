# Projectdetailpagina — uitgesteld (stubs)

> Laatst bijgewerkt: 2026-07-26  
> Context: UI naar mock projectdetail (belangrijkste pagina). Sidebar blijft.  
> **Niet vergeten:** stub activeren → hier afvinken.

## Bewust wél in v1

- Hero: naam, status, korte projectref, klantlink, aangemaakt
- Tabs: Overzicht, Offertes (echt), Taken/werkzaamheden (echt), overige tabs zichtbaar
- Projectinformatie: klantgegevens + projectvelden (bewerken via formulier)
- Voortgang: % op basis van werkzaamheden done/open (+ offerteteller)
- Tijdlijn: afgeleid uit project + offertes + werkzaamheden
- Binnenkort: open werkzaamheden
- Financieel / bestanden / notitiecomposer: zichtbaar als stub
- Blauw accent, PageCards

## Stubs / later

| Feature | UI nu | Nodig |
| --- | --- | --- |
| Delen | Disabled | Deellinks / rechten |
| Favoriet (ster) | Disabled | User preferences |
| Rij-menu `⋯` in hero | Disabled | Snelacties |
| Projectthumbnail | Placeholder | Media upload |
| Echte `PRJ-…` nummer | Afgeleid van uuid | `project_number` |
| Start-/einddatum | Start ≈ createdAt; eind “—” | Schema-velden |
| Projectleider | “—” | Assignment |
| Labels / tags | Stub pills + disabled toevoegen | `project_labels` |
| Omzet + % gefactureerd | “—” | Facturen |
| Winstmarge | “—” | Kostprijs |
| Tab Werkbonnen | Empty stub | Work orders Phase |
| Tab Planning | Empty stub | Planning |
| Tab Bestanden | Empty stub + laatste bestanden | Storage |
| Tab Financieel | Stub totalen | Invoices |
| Tab Communicatie | Empty stub | Inbox/comms |
| Tab Activiteit | Gedeeltelijk via tijdlijn | Event log |
| Contactpersoon | “—” | Customer contacts |
| Kans % | “—” | Pipeline field |
| Notitiecomposer onderaan | Disabled | Activity notes API |
| Circular progress “echte” modules | Deels werkzaamheden | Work orders/files counts |

## Afvinklijst

- [ ] Delen + favoriet
- [ ] Thumbnail + projectnummer
- [ ] Start/eind + projectleider
- [ ] Labels
- [ ] Omzet / marge / facturatiegraad
- [ ] Werkbonnen-tab
- [ ] Planning-tab + Binnenkort uit planning
- [ ] Bestanden
- [ ] Financieel echt
- [ ] Communicatie
- [ ] Volledige activiteitfeed
- [ ] Contactpersoon + kans
- [ ] Notitiecomposer
