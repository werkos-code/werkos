# WerkOS Design System

> Version: 1.0
>
> Dit document beschrijft de ontwerpfilosofie en vaste ontwerpregels van WerkOS.
> Iedere nieuwe pagina, component of workflow moet voldoen aan deze richtlijnen.
>
> WerkOS is één product. Niet een verzameling losse schermen.
> Consistentie is belangrijker dan creativiteit.

---

# 1. Design Filosofie

WerkOS is gebouwd voor ondernemers in projectbedrijven.

Onze gebruikers brengen dagelijks vele uren door in de applicatie. Daarom staat rust, overzicht en betrouwbaarheid altijd boven visuele effecten.

WerkOS moet voelen als professionele bedrijfssoftware, zonder de complexiteit en rommeligheid van traditionele ERP-systemen.

Het ontwerp straalt uit:

- Rust
- Vertrouwen
- Professionaliteit
- Overzicht
- Focus

WerkOS probeert nooit indruk te maken met design.

WerkOS probeert het werk makkelijker te maken.

---

# 2. Algemene Ontwerpprincipes

## Minder is beter

Iedere pagina toont alleen wat op dat moment relevant is.

Nieuwe functionaliteit wordt niet toegevoegd omdat het "handig" is, maar omdat het de dagelijkse operatie daadwerkelijk ondersteunt.

---

## Rust boven informatie

Niet alle informatie hoeft direct zichtbaar te zijn.

Gebruik:

- uitklapbare secties
- dropdowns
- tooltips
- modals
- slide-overs

om complexiteit te verbergen totdat deze nodig is.

---

## Consistentie boven originaliteit

Wanneer er al een bestaand patroon bestaat binnen WerkOS, moet dit opnieuw gebruikt worden.

Nieuwe componenten of nieuwe interactiepatronen worden alleen geïntroduceerd wanneer bestaande patronen aantoonbaar niet voldoen.

---

## Kleur heeft betekenis

Kleur wordt nooit gebruikt als decoratie.

Kleur ondersteunt uitsluitend betekenis of focus.

---

# 3. Kleurgebruik

WerkOS gebruikt een rustige, lichte interface.

Vrijwel de volledige applicatie heeft een lichte achtergrond.

De donkere kleur wordt uitsluitend gebruikt voor de sidebar.

Blauw is de accentkleur van WerkOS.

Blauw wordt echter zeer spaarzaam gebruikt.

Gebruik blauw uitsluitend voor:

- primaire CTA's
- actieve selectie
- focus states
- interactieve elementen waar extra nadruk gewenst is

Gebruik géén gekleurde kaarten, achtergronden of decoratieve vlakken.

De interface moet voornamelijk bestaan uit:

- wit
- lichte grijstinten
- donkergrijze tekst
- subtiele borders

Hierdoor blijft blauw waardevol wanneer het daadwerkelijk gebruikt wordt.

### Technische ankers (implementatie)

| Token / waarde | Gebruik |
| --- | --- |
| Sidebar-achtergrond `#09133A` | Alleen de sidebar (niet wijzigen zonder apart besluit) |
| Accentblauw (primary, bijv. `#2563EB` / `#3B82F6`) | Primaire CTA's, focus, actieve tabs/selectie |
| App-canvas | Lichtgrijs (`--background`) — contentkaarten blijven wit (`--card`) |
| Borders | Subtiel, lage contrast (`border`) |

Exacte CSS-tokens leven in `src/app/globals.css` en het shadcn-thema. Wijzigingen aan kleuren gebeuren daar — niet ad hoc per pagina.

**Workspace-pagina's** (zoals de offerte-editor) mogen een dichtere layout hebben (meta-kaarten, tabs, totals-rail) zolang de sidebar, Geist, en spaarzaam blauw intact blijven. Uitgestelde editor-features: zie [`QUOTE_EDITOR_BACKLOG.md`](./QUOTE_EDITOR_BACKLOG.md). Uitgestelde projectenlijst-features: zie [`PROJECTS_PAGE_BACKLOG.md`](./PROJECTS_PAGE_BACKLOG.md).


---

# 4. Typografie

WerkOS gebruikt **Geist** als primair UI-lettertype (`next/font`, CSS-variabele `--font-sans`).

Voor code of technische weergave mag **Geist Mono** (`--font-geist-mono`) worden gebruikt.

Dit lettertype vormt onderdeel van de identiteit van de applicatie.

Typografie moet altijd rustig en goed leesbaar zijn.

Gebruik een duidelijke hiërarchie.

Voorkom overdreven grote titels of extreem kleine tekst.

---

# 5. Sidebar

De sidebar is het anker van WerkOS.

De sidebar is altijd zichtbaar.

Alleen de sidebar gebruikt een donkere achtergrond.

De rest van de applicatie blijft licht.

De sidebar bevat altijd:

- WerkOS logo
- Werk / Bedrijf switch
- Primaire CTA
- Navigatie
- Gebruikersprofiel

Gebruik:

- witte primaire tekst
- subtiele lichtblauwe/grijze secundaire tekst
- rustige hover states

Gebruik uitsluitend iconen op hoofdniveau.

Subnavigatie gebruikt geen iconen.

De sidebar krijgt afgeronde rechterhoeken.

---

# 6. Header

Iedere pagina gebruikt exact dezelfde header.

De header bevat:

Links:

- terugknop (indien relevant)
- paginatitel
- info-tooltip

Rechts:

- zoeken
- notificaties
- help

Onder de header bevindt zich altijd een subtiele divider.

Gebruik géén beschrijvende tekstblokken onder de paginatitel.

Informatie over de pagina wordt getoond via de tooltip.

---

# 7. Pagina-opbouw

Iedere pagina volgt dezelfde basisstructuur.

Header

↓

Divider

↓

Pagina-inhoud

De inhoud van de pagina mag verschillen.

De structuur van de pagina niet.

Gebruik overal dezelfde marges, padding en witruimte.

---

# 8. Paginatypes

WerkOS kent een beperkt aantal paginatypen.

Nieuwe pagina's moeten binnen één van deze categorieën vallen.

- Dashboard
- Lijstpagina
- Detailpagina
- Wizard
- Workspace
- Instellingen

Nieuwe paginatypen alleen toevoegen wanneer dit echt noodzakelijk is.

---

# 9. Componenten

WerkOS werkt met een vaste set componenten.

Bij voorkeur worden bestaande componenten hergebruikt.

Basis: shadcn/ui in `src/components/ui/`, aangevuld met productcomponenten in `src/features/`.

Belangrijkste componenten:

- Buttons
- Inputs
- Selects
- Tables
- Cards
- Tabs
- Tooltips
- Modals
- Slide-overs
- Empty States
- Status badges

Nieuwe componenten alleen wanneer bestaande componenten niet voldoen.

---

# 10. Tabellen

Tabellen zijn een belangrijk onderdeel van WerkOS.

Gebruik:

- veel witruimte
- rustige rijhoogtes
- subtiele hover states
- minimale borders

Voorkom visuele drukte.

Gebruik geen zware rasterlijnen.

---

# 11. Formulieren

Formulieren moeten eenvoudig aanvoelen.

Gebruik:

Label

Input

Helpertekst (indien nodig)

Validatie

Plaats niet te veel velden naast elkaar.

Gebruik voldoende witruimte.

---

# 12. Tooltips

Tooltips worden gebruikt om extra uitleg te geven zonder ruimte op de pagina in te nemen.

Tooltips zijn kort.

Gebruik maximaal enkele zinnen.

---

# 13. Empty States

Lege pagina's moeten nooit leeg aanvoelen.

Iedere empty state bevat:

- titel
- korte uitleg
- primaire actie

Gebruik een rustige illustratie wanneer passend.

---

# 14. Iconen

Gebruik uitsluitend Lucide Icons.

Iconen ondersteunen de interface.

Iconen vervangen nooit tekst.

---

# 15. Animaties

Animaties zijn subtiel.

Gebruik uitsluitend kleine overgangen.

Geen opvallende effecten.

Geen springende elementen.

Geen overbodige beweging.

---

# 16. Responsive

Desktop is leidend.

Tablet ondersteunt dezelfde ervaring.

Mobiel wordt aangepast waar nodig.

Functionaliteit blijft gelijk.

---

# 17. Ontwerpregel

Iedere nieuwe pagina moet aanvoelen alsof deze altijd onderdeel van WerkOS is geweest.

Wanneer een nieuwe pagina afwijkt van bestaande patronen, wordt eerst gekeken of het bestaande design system uitgebreid moet worden.

Niet de pagina.

Het design system is leidend.

---

# 18. Wat WerkOS niet is

WerkOS is geen ERP uit 2010.

WerkOS is geen startup-dashboard.

WerkOS is geen verzameling losse modules.

WerkOS is geen design showcase.

WerkOS is software die ondernemers dagelijks vertrouwen om hun bedrijf te runnen.

Iedere ontwerpbeslissing moet bijdragen aan:

- meer rust
- meer overzicht
- minder frictie

Wanneer een ontwerpkeuze hier niet aan bijdraagt, hoort deze niet thuis in WerkOS.
