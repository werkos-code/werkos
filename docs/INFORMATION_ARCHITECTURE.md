# INFORMATION_ARCHITECTURE.md

# Informatiearchitectuur

## Doel

Dit document beschrijft hoe informatie binnen WerkOS wordt georganiseerd en hoe gebruikers zich door de applicatie bewegen.

Het gaat nadrukkelijk niet over schermontwerpen of technische implementatie.

Het doel is om een consistente gebruikerservaring te creëren waarin ondernemers altijd begrijpen waar zij zijn, wat zij kunnen doen en hoe zij terug kunnen keren naar hun werk.

---

# Uitgangspunt

WerkOS is geen verzameling losse modules.

WerkOS bestaat uit een beperkt aantal werkruimtes waarin de dagelijkse operatie plaatsvindt.

Iedere werkruimte heeft een duidelijke verantwoordelijkheid.

De gebruiker wisselt bewust tussen werkruimtes, maar blijft daarbinnen zoveel mogelijk in dezelfde context.

---

# Navigatiestructuur

WerkOS is **één Operating System**.

Er is geen scheiding tussen “Werk” en “Bedrijf”.

De gebruiker denkt alleen:

> Waar wil ik naartoe?

## Dagelijkse operatie

- Dashboard
- Projecten
- Planning
- Werkzaamheden

## Documenten

- Facturen
- Werkbonnen
- Documenten (mediabibliotheek)

## Relaties & middelen

- Klanten
- Leveranciers
- Onderaannemers
- Materieel

## Bedrijf

- Rapportages
- Personeel

## Communicatie

- Inbox
- Notificaties

## Platform

- Admin (alleen super admins)

Organisatiewissel gebeurt via de organisatie-switcher bovenin de sidebar.

Sectiekoppen in de sidebar zijn inklaptbaar, behalve **Operatie** (altijd open). **Bedrijf** en **Communicatie** starten standaard ingeklapt.

---

# Werkruimtes

WerkOS is opgebouwd uit hoofdwerkruimtes.

Een hoofdwerkruimte vertegenwoordigt een belangrijk onderdeel van de dagelijkse operatie.

Voorbeelden:

- Dashboard
- Projecten
- Planning
- Werkzaamheden
- Werkbonnen
- Facturen
- Klanten
- Inbox
- Rapportages

Een hoofdwerkruimte wordt altijd geopend als volledige pagina.

---

# Projecten

Projecten vormen het hart van WerkOS.

Vrijwel alle operationele informatie komt uiteindelijk samen binnen een project.

De projectenpagina beantwoordt de vraag:

> Aan welke projecten werk ik?

Vanuit hier opent de gebruiker een project.

---

# Projectdetail

Een projectdetail is een volwaardige hoofdwerkruimte.

Dit is het operationele controlecentrum van één project.

Gedurende de volledige levenscyclus van een project werkt de ondernemer vrijwel uitsluitend vanuit deze pagina.

Tijdens de verschillende fases van een project wordt deze pagina gebruikt voor:

- Werkzaamheden beheren
- Planning bekijken
- Materialen registreren
- Uren registreren
- Communicatie voeren
- Bestanden beheren
- Calculeren
- Nacalculeren
- Factureren

De projectdetailpagina geeft antwoord op één centrale vraag:

> Hoe krijg ik dit project succesvol afgerond?

---

# Subwerkruimtes

Binnen een hoofdwerkruimte kunnen onderdelen worden geopend als subwerkruimte.

Een subwerkruimte wordt weergegeven als een grote overlay.

Deze overlay gebruikt ongeveer driekwart van de beschikbare schermbreedte.

Een subwerkruimte voelt als een aparte pagina, maar de gebruiker blijft binnen dezelfde werkruimte.

Voorbeelden binnen een project:

- Calculatie
- Communicatie
- Bestanden
- Materialen
- Planning
- Facturatie

Na het sluiten van een subwerkruimte wordt de hoofdwerkruimte direct bijgewerkt.

Hierdoor blijft de gebruiker in dezelfde context.

---

# Werkzaamheden

Werkzaamheden vormen een uitzondering.

Een Werkzaamheid is een belangrijk operationeel object en krijgt daarom een eigen pagina.

Een Werkzaamheid kan in de toekomst zeer uitgebreid worden en bevat onder andere:

- Planning
- Bestanden
- Foto's
- Communicatie
- Urenregistratie
- Materiaalregistratie
- Checklists
- Formulieren

Vanuit een Werkzaamheid kan opnieuw gebruik worden gemaakt van subwerkruimtes.

Hierdoor ontstaat een logische hiërarchie zonder onnodig diepe navigatie.

---

# Navigatie

WerkOS probeert de gebruiker zo lang mogelijk binnen dezelfde werkruimte te houden.

Navigatie volgt de belangrijkheid van de context.

Niet de hoeveelheid informatie.

Kleine contextwissels openen als subwerkruimte.

Grote contextwissels openen een nieuwe hoofdwerkruimte.

---

# Terug navigeren

WerkOS gebruikt geen traditionele breadcrumbs.

De huidige werkruimte geeft voldoende context.

Alleen wanneer een gebruiker zich binnen een Werkzaamheid bevindt, wordt een eenvoudige terugactie aangeboden.

Bijvoorbeeld:

← Terug naar Project Jansen

---

# Objecten

Elk object bestaat slechts één keer.

WerkOS kent één bron van waarheid.

Voorbeelden:

Een werkzaamheid kan zichtbaar zijn binnen:

- Het projectoverzicht van werkzaamheden
- Planning
- Zoekresultaten
- Facturatie
- Dashboard

Het blijft altijd dezelfde werkzaamheid.

Hetzelfde geldt voor:

- Werkbonnen
- Afspraken
- Bestanden
- Facturen
- Offertes

WerkOS maakt geen kopieën van informatie.

---

# Zoeken

WerkOS beschikt over één centrale zoekfunctie.

De zoekfunctie doorzoekt meerdere objecten tegelijkertijd.

Onder andere:

- Projecten
- Klanten
- Werkzaamheden
- Bestanden
- Offertes
- Facturen

Zoeken is bedoeld als snelle navigatie naar de juiste context.

Niet als vervanging van de normale navigatie.

---

# Acties

Acties horen altijd bij de context waarin zij plaatsvinden.

WerkOS gebruikt daarom geen centrale knop om nieuwe objecten aan te maken.

Voorbeelden:

Projecten

+ Nieuw project

Werkzaamheden (binnen een project)

+ Nieuwe werkzaamheid

Planning

+ Nieuwe afspraak

Klanten

+ Nieuwe klant

Hierdoor sluit iedere actie logisch aan op de huidige werkruimte.

---

# Planning

Planning is een eigen hoofdwerkruimte.

Planning organiseert wanneer werk plaatsvindt.

Planning is gebaseerd op een kalenderweergave.

Planning is verantwoordelijk voor de vraag:

> Wie doet wat en wanneer?

Planning toont onder andere:

- geplande werkzaamheden;
- afspraken gekoppeld aan een project;
- bedrijfsbrede afspraken zonder project.

Planning is geen alternatieve projectweergave.

Planning ondersteunt projecten en de dagelijkse agenda van het bedrijf.

---

# Tijd

Tijd is geen navigatieconcept.

WerkOS organiseert informatie niet op basis van "Vandaag", "Deze week" of "Volgende week".

Tijd wordt gebruikt waar dit logisch is.

Bijvoorbeeld:

- Planning
- Deadlines
- Levermomenten
- Herinneringen

---

# Mobiele ervaring

De mobiele ervaring is geen verkleinde desktopversie.

Iedere gebruikersgroep krijgt een ervaring die aansluit op zijn werkzaamheden.

## Ondernemer

Focus op:

- Overzicht
- Projectstatus
- Communicatie
- Snelle acties

---

## Medewerker

Focus op:

- Werkbonnen
- Werkzaamheden
- Urenregistratie
- Materialen
- Foto's

---

## Klant

Focus op:

- Projectvoortgang
- Communicatie
- Documenten
- Inzicht in zichtbare werkzaamheden

---

# Ontwerpprincipes

## Werkruimtes boven modules

WerkOS bestaat uit werkruimtes, niet uit losse modules.

## Eén applicatie-context

WerkOS heeft één navigatiestructuur. Geen dual-context switch.

## Context behouden

De gebruiker blijft zoveel mogelijk binnen dezelfde werkruimte.

## Duidelijke bestemmingen

Navigatie beantwoordt “waar wil ik naartoe?”, niet “in welke context zit ik?”.

## Eén bron van waarheid

Objecten bestaan slechts één keer.

## Acties horen bij de context

Nieuwe objecten worden aangemaakt vanuit de werkruimte waarin zij thuishoren.

## Projecten vormen het operationele hart

Vrijwel alle dagelijkse werkzaamheden komen uiteindelijk samen binnen een project.

## De projectdetailpagina is het operationele controlecentrum

Alles wat nodig is om een project succesvol af te ronden moet vanuit deze pagina bereikbaar zijn.
