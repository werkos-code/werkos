# DOMAIN_MODEL.md
DOMAIN_MODEL.md

Versie: 1.1
Status: Concept (Levend document) — gesynchroniseerd Phase 0
Project: WerkOS

⸻

Introductie

Dit document beschrijft het functionele domein van WerkOS.

Het is nadrukkelijk geen technisch document.

Er worden geen databases beschreven.
Er worden geen API’s beschreven.
Er worden geen schermen ontworpen.

Dit document beschrijft uitsluitend hoe WerkOS de werkelijkheid ziet.

Het vormt daarmee de fundering onder iedere ontwerpkeuze, database, API, interface en automatisering binnen het platform.

Wanneer ontwikkelaars twijfelen hoe iets gebouwd moet worden, hoort het antwoord uiteindelijk altijd terug te leiden zijn naar dit document.

⸻

Doel van WerkOS

WerkOS helpt projectbedrijven om hun dagelijkse operatie vanuit één centrale plek te organiseren.

WerkOS is geen verzameling losse modules.

Het is één operationeel systeem waarin alles rondom een project samenkomt.

Een ondernemer hoeft niet meer na te denken:

“Waar stond dat ook alweer?”

WerkOS probeert die vraag zoveel mogelijk te voorkomen.

⸻

Kernfilosofie

WerkOS volgt de werkelijkheid

Software hoort zich aan te passen aan bedrijven.

Niet andersom.

Daarom probeert WerkOS de werkelijkheid zo letterlijk mogelijk te modelleren.

Niet iedere ondernemer werkt hetzelfde.

Niet ieder project verloopt hetzelfde.

Niet iedere offerte wordt op dezelfde manier opgebouwd.

WerkOS ondersteunt verschillen, zonder de software ingewikkeld te maken.

⸻

Eenvoud is de standaard

Nieuwe gebruikers moeten binnen enkele minuten kunnen beginnen.

Daarom heeft iedere entiteit een minimale geldige vorm.

Voorbeeld:

Een project bestaat minimaal uit:

* opdrachtgever
* projectnaam

Meer is niet nodig.

Later kan hetzelfde project groeien.

Bijvoorbeeld met:

* offertes
* werkzaamheden
* planning
* communicatie
* documenten
* facturen

De ondernemer bepaalt wanneer dat nodig is.

⸻

Complexiteit is optioneel

WerkOS is ontworpen voor zowel een zelfstandige schilder als een bedrijf met honderd medewerkers.

Dat betekent niet dat beide bedrijven dezelfde interface krijgen.

WerkOS groeit mee.

De basis blijft altijd eenvoudig.

Geavanceerde mogelijkheden verschijnen pas wanneer een ondernemer daar behoefte aan heeft.

⸻

Slimme suggesties in plaats van verplichte automatisering

WerkOS automatiseert nooit zonder toestemming.

Voorbeeld:

Een offerte wordt geaccepteerd.

WerkOS maakt niet automatisch werkzaamheden aan.

WerkOS vraagt:

“Wil je werkzaamheden aanmaken op basis van deze offerte?”

De ondernemer houdt altijd controle.

⸻

Zo min mogelijk concepten

Nieuwe concepten maken software moeilijker.

Daarom probeert WerkOS bestaande concepten uit te breiden in plaats van nieuwe te introduceren.

Voorbeelden:

Geen:

* Deelproject
* Werkpakket
* Fase
* Activiteitengroep

Maar gewoon:

Werkzaamheid

Die werkzaamheden kan bevatten.

Hetzelfde geldt voor:

* offerteregels
* mappen
* locaties

Hiërarchie is krachtiger dan extra entiteiten.

⸻

Domeinoverzicht

WerkOS bestaat uit een beperkt aantal kernobjecten.

Deze objecten vormen samen het complete operationele model.

Bedrijf
│
├── Lidmaatschappen (gebruikers + rol)
│
├── Klanten
│
├── Projecten
│   │
│   ├── Offertes
│   │   └── Offerteregels
│   ├── Werkzaamheden
│   ├── Werkbonnen (optioneel)
│   ├── Afspraken (optioneel)
│   ├── Communicatie
│   ├── Bestanden
│   ├── Facturen
│   ├── Locaties
│   ├── Notities
│   └── Logboek
│
├── Afspraken (bedrijfsbreed, zonder project)
│
└── Instellingen

Vrijwel alles binnen de dagelijkse operatie van een opdracht bestaat uiteindelijk binnen de context van een project.

Afspraken kunnen uitzonderlijk ook bedrijfsbreed bestaan.

⸻

Bedrijf

Een bedrijf vertegenwoordigt één organisatie die WerkOS gebruikt.

Alle gegevens binnen WerkOS behoren altijd toe aan precies één bedrijf.

Bedrijven zijn volledig van elkaar gescheiden.

Een bedrijf bezit onder andere:

* gebruikers
* klanten
* projecten
* offertes
* werkzaamheden
* planning
* bestanden
* instellingen

WerkOS is daarmee volledig multi-tenant.

⸻

Gebruikers en lidmaatschappen

Een gebruiker is iemand met een account in WerkOS.

Toegang tot een bedrijf verloopt via een **lidmaatschap** (membership): gebruiker ↔ bedrijf + rol.

### Platformrol

**Super admin**

Een interne WerkOS-medewerker.

Geen lid van een klantbedrijf in de normale zin.

Heeft een eigen platformdashboard en kan ten behoeve van support inloggen bij bedrijven op het platform.

### Rollen binnen een bedrijf

**Eigenaar (`owner`)**

Ieder bedrijf heeft precies één eigenaar.

De eigenaar is verantwoordelijk voor:

* abonnement
* betalingen
* bedrijfsinstellingen
* uitnodigen van gebruikers
* hoogste rechten binnen dat bedrijf

Eén gebruiker mag **eigenaar zijn van meerdere bedrijven**.

⸻

**Kantoormedewerker (`office_employee`)**

Een administratieve gebruiker.

Voorbeelden:

* planner
* calculator
* projectleider
* administratie
* verkoop

Een kantoormedewerker gebruikt vrijwel alle onderdelen van WerkOS.

Personeel (kantoor én uitvoerend) hoort altijd bij **precies één bedrijf**.

⸻

**Uitvoerend medewerker (`field_employee`)**

Een uitvoerende medewerker werkt voornamelijk buiten.

Daarom is de interface veel eenvoudiger.

De focus ligt op:

* werkzaamheden
* werkbonnen
* planning
* foto’s
* uren
* materialen

Niet op administratie.

Ook uitvoerend personeel hoort bij precies één bedrijf.

⸻

**Klant (`customer`)**

Een klantgebruiker kan optioneel toegang krijgen tot projecten van één of meer bedrijven waar die persoon klant is.

De klant ziet uitsluitend informatie die relevant is voor de samenwerking.

Bijvoorbeeld:

* offertes
* planning
* documenten
* communicatie
* facturen

Per bedrijf geldt: één klantaccount per klantrelatie (zoals eerder vastgelegd).

Een persoon mag wel bij **meerdere bedrijven** als klant lid zijn.

Hoe een klant intern informatie deelt, is de verantwoordelijkheid van de klant zelf.

⸻

### Lidmaatschapsregels (samenvatting)

* Eigenaar: mag lid zijn van meerdere bedrijven (als eigenaar).
* Kantoormedewerker / uitvoerend medewerker: precies één bedrijf.
* Klantgebruiker: mag lid zijn van meerdere bedrijven (als klant).
* Super admin: platformniveau; geen gewone bedrijfsrol.
* Binnen één lidmaatschap heeft een gebruiker precies één rol.
* Ieder bedrijf heeft precies één eigenaar.

⸻

Klant

Een klant is de opdrachtgever.

Niet iedere klant is een particulier.

Een klant kan ook zijn:

* bedrijf
* vereniging
* stichting
* overheid
* woningcorporatie

Een klant kan meerdere projecten hebben.

Een project heeft altijd precies één opdrachtgever.

Een klant bevat bijvoorbeeld:

* naam
* adres
* contactgegevens
* factuurgegevens
* notities

De hoeveelheid informatie bepaalt de ondernemer zelf.

⸻

Project

Het project vormt het hart van WerkOS.

Vrijwel iedere operationele activiteit gebeurt binnen een project.

Een project ontstaat zodra een ondernemer besluit dat er werk uitgevoerd gaat worden.

In de meeste gevallen is dat wanneer een offerte wordt aangevraagd.

Een project heeft minimaal:

* opdrachtgever
* projectnaam

Meer is niet verplicht.

Een project kan vervolgens groeien.

Bijvoorbeeld met:

* offertes
* werkzaamheden
* planning
* documenten
* communicatie
* facturen
* logboek
* locaties
* notities

Niet ieder project hoeft alle onderdelen te gebruiken.

⸻

Status van een project

WerkOS kent een eenvoudige levenscyclus.

Voorbereiding

↓

Uitvoering

↓

Operationeel afgerond

↓

Administratief afgerond

↓

Afgerond

↓

Archief

Deze status helpt bij overzicht.

Hij bepaalt niet welke acties uitgevoerd mogen worden.

Een ondernemer kan altijd afwijken.

**Nieuwe aanvraag** is geen status.

Het is een weergave/filter over projecten in Voorbereiding (bijvoorbeeld zonder geaccepteerde offerte).

⸻

Projectpagina

Een project is geen verzameling losse modules.

Een project is één werkruimte.

Vanuit deze werkruimte werkt de ondernemer aan alles wat bij dat project hoort.

De projectpagina is daarom de belangrijkste pagina binnen WerkOS.

Alle informatie rondom een project komt hier samen.

⸻

Offerte

Een offerte is een voorstel.

Niet een PDF.

De PDF is slechts één mogelijke representatie.

De offerte zelf bestaat uit informatie.

Bijvoorbeeld:

* regels
* prijzen
* btw
* status
* geldigheid
* interne notities
* externe notities

Vanuit dezelfde offerte kunnen meerdere representaties ontstaan.

Bijvoorbeeld:

* PDF
* online offerte
* e-mail
* print

Daardoor blijft de offerte altijd de bron van waarheid.

⸻

Meerdere offertes

Een project kan meerdere offertes bevatten.

Bijvoorbeeld:

* eerste voorstel
* alternatief voorstel
* aanvullende offerte
* meerwerk

Meerdere offertes kunnen tegelijkertijd actief zijn.

De ondernemer bepaalt welke uiteindelijk geaccepteerd worden.

⸻
# Offerteregels

Een offerte bestaat uit één of meerdere offerteregels.

Een offerteregel vertegenwoordigt een onderdeel van het voorstel.

Dat kan bijvoorbeeld zijn:

- Arbeid
- Materialen
- Voorrijkosten
- Steigerhuur
- Schilderwerk
- Meerwerk

WerkOS schrijft niet voor hoe een offerte opgebouwd moet worden.

De ondernemer bepaalt de structuur.

---

## Hiërarchische offerteregels

Offerteregels kunnen andere offerteregels bevatten.

Hierdoor kan een offerte zowel eenvoudig als zeer uitgebreid zijn.

Voorbeeld:

Schilderwerk woning

- Begane grond
    - Woonkamer
    - Keuken
- Eerste verdieping
    - Slaapkamer
    - Badkamer

Of:

Schilderwerk woning

€4.250

Beide zijn volledig geldig.

WerkOS ondersteunt beide manieren.

---

## Eigenschappen van een offerteregel

Een offerteregel kan onder andere bevatten:

- titel
- omschrijving
- aantal
- eenheid
- prijs
- btw
- korting
- verwachte uren
- notities
- subtotaal
- subregels

Vrijwel alle eigenschappen zijn optioneel.

---

## Koppeling met werkzaamheden

Bij acceptatie van een offerte stelt WerkOS voor om werkzaamheden aan te maken.

Nooit automatisch zonder bevestiging.

Optioneel blijft een **blijvende koppeling** bestaan tussen offerteregel(s) en werkzaamheid(en).

Die koppeling ondersteunt calculatie: verwachting versus werkelijkheid.

---

# Werkzaamheden

Werkzaamheden vormen het uitvoerbare werk binnen een project.

Waar een offerte beschrijft **wat de klant koopt**, beschrijven werkzaamheden **wat uitgevoerd moet worden**.

Werkzaamheden kunnen bestaan zonder offerte.

Optioneel kunnen zij gekoppeld zijn aan offerteregels.

Een ondernemer mag:

- werkzaamheden handmatig maken
- werkzaamheden vanuit een offerte voorstellen
- werkzaamheden later toevoegen
- werkzaamheden verwijderen

WerkOS verplicht geen enkele werkwijze.

---

## Minimale werkzaamheid

Een werkzaamheid bestaat minimaal uit:

- titel

Meer is niet nodig.

Later kan dezelfde werkzaamheid uitgebreid worden.

Bijvoorbeeld met:

- planning
- medewerkers
- foto's
- uren
- materialen
- checklist
- opmerkingen
- documenten
- deadline
- locatie

**Uren:** een werkzaamheid kan een verwachting (begroot) dragen. Werkelijke uren zijn geen overschrijving van dat veld, maar een reeks boekingen (wie, welke dag, hoeveel). Groepen tonen alleen de som van hun kinderen.

**Materialen:** begroot via planregels (artikel uit catalogus of ad-hoc omschrijving); werkelijk via verbruikboekingen. Voorraad en artikelen zijn bedrijfsbreed; project/werkzaamheid trekt daaruit.

---

## Hiërarchische werkzaamheden

Werkzaamheden kunnen andere werkzaamheden bevatten.

Dit is één van de belangrijkste ontwerpkeuzes binnen WerkOS.

Daardoor zijn aparte concepten zoals:

- fases
- werkpakketten
- deelprojecten
- activiteitengroepen

niet nodig.

Voorbeeld:

Nieuwbouwwijk

- Woning 1
    - Kozijnen schilderen
    - Deuren schilderen
- Woning 2
    - Kozijnen schilderen
    - Deuren schilderen

Maar ook:

Badkamer

- Tegelen
- Kitten
- Afwerken

Of:

Complete woning schilderen

zonder subwerkzaamheden.

WerkOS ondersteunt beide.

---

## Status van werkzaamheden

Werkzaamheden kunnen bijvoorbeeld de volgende statussen hebben:

- Nog niet gestart
- Gepland
- Bezig
- Gepauzeerd
- Wacht op klant
- Afgerond

Deze statussen helpen bij overzicht.

Ze blokkeren nooit de ondernemer.

---

## Medewerkers

Een werkzaamheid kan aan één of meerdere medewerkers gekoppeld worden.

WerkOS ondersteunt zowel:

"Jan doet deze klus."

als:

"Jan en Piet doen deze klus."

---

## Deadline

Een werkzaamheid mag een deadline hebben.

Planning is daarvoor niet verplicht.

Een ondernemer kan dus zeggen:

"Dit moet vrijdag klaar zijn."

zonder eerst uren of dagen in te plannen.

---

## Materialen

Werkzaamheden kunnen materialen bevatten.

WerkOS schrijft niet voor hoe uitgebreid dit moet zijn.

Een ondernemer kan simpelweg noteren:

- 5 liter verf

Maar later kan dit uitgebreid worden met voorraadbeheer of artikelkoppelingen.

---

## Foto's

Werkzaamheden kunnen foto's bevatten.

Bijvoorbeeld:

- voor
- tijdens
- na

Deze foto's worden automatisch onderdeel van de projectbibliotheek.

---

## Checklist

Werkzaamheden kunnen een checklist bevatten.

Bijvoorbeeld:

☐ Schuren

☐ Afplakken

☐ Gronden

☐ Schilderen

☐ Opruimen

Checklists zijn volledig optioneel.

---

# Werkbonnen

Een werkbon is een optioneel uitvoeringsdocument.

Een werkbon behoort tot een project.

Een werkbon ondersteunt één of meerdere werkzaamheden.

Niet iedere werkzaamheid heeft een werkbon nodig.

WerkOS mag ondernemers nooit verplichten om werkbonnen te gebruiken.

De werkzaamheid blijft leidend.

De werkbon is hulpmiddel.

---

# Planning en afspraken

Planning beschrijft wanneer werk plaatsvindt.

Planning is geen verplicht onderdeel van een project.

Veel zelfstandigen plannen simpelweg in hun hoofd.

WerkOS ondersteunt dat.

---

## Afspraak

Een afspraak is een eigen domeinobject.

Een afspraak kan:

- bij een project horen;
- optioneel gekoppeld zijn aan een werkzaamheid of werkbon;
- of **bedrijfsbreed** bestaan zonder project (bijvoorbeeld intern overleg).

Een afspraak is dus niet hetzelfde als “een geplande werkzaamheid”.

Beide kunnen in de planning zichtbaar zijn.

---

## Bedrijfsplanning

Naast planning binnen projecten bestaat er één centrale planning.

Hier ziet de ondernemer:

- medewerkers
- werkzaamheden
- afspraken (projectgebonden en bedrijfsbreed)
- bezetting

De planning is daarmee een weergave van bestaande objecten.

Niet een aparte administratie met gedupliceerde gegevens.

---

## Planning is een weergave

Werkzaamheden en afspraken dragen de tijdsinformatie.

De centrale planning toont die informatie.

Hierdoor bestaat er nooit dubbele kerninformatie.

---

# Communicatie

Communicatie hoort altijd bij een project.

WerkOS kent drie vormen van communicatie.

---

## Projectgesprekken

Hier communiceren ondernemer en klant.

Bijvoorbeeld over:

- voortgang
- vragen
- wijzigingen
- documenten

---

## Interne communicatie

Ondernemers en medewerkers kunnen onderling communiceren.

Deze communicatie is niet zichtbaar voor klanten.

---

## Systeemnotificaties

WerkOS genereert notificaties.

Bijvoorbeeld:

- offerte verstuurd
- klant heeft geaccepteerd
- werkzaamheid afgerond
- factuur betaald

Notificaties zijn geen chat.

Ze informeren gebruikers.

---

# Bestanden

Ieder project beschikt over één centrale mediabibliotheek.

Alle bestanden komen uiteindelijk hier terecht.

Ongeacht waar ze geüpload worden.

Bijvoorbeeld vanuit:

- werkzaamheden
- offertes
- communicatie
- facturen

Er bestaat dus altijd één bron van waarheid.

---

## Mappen

Ondernemers bepalen zelf hun structuur.

Bijvoorbeeld:

Project

- Foto's
- Administratie
- Vergunningen
- Eerste verdieping

Of helemaal geen mappen.

WerkOS ondersteunt beide.

---

## Slimme mappen

Wanneer een foto wordt toegevoegd aan een werkzaamheid mag WerkOS voorstellen om automatisch een map met dezelfde naam te gebruiken.

Dit is uitsluitend een gebruiksgemak.

Geen verplichting.

---

# Facturen

Facturen vertegenwoordigen de financiële afhandeling van een project.

WerkOS schrijft niet voor hoe een factuur ontstaat.

Een factuur kan:

- handmatig gemaakt worden
- uit een offerte ontstaan
- uit meerwerk ontstaan

Een project kan meerdere facturen bevatten.

Bijvoorbeeld:

- aanbetaling
- termijnfactuur
- eindfactuur

---

# Locaties

Een project kan betrekking hebben op één of meerdere locaties.

Voorbeelden:

Eén woning.

Een appartementencomplex.

Een wijk.

Een gemeente.

WerkOS maakt hierin geen onderscheid.

Locaties zijn eenvoudig en flexibel gehouden.

Mocht later blijken dat locaties een grotere rol krijgen, dan kan dit model uitgebreid worden zonder bestaande projecten te breken.

---

# Notities

Notities zijn vrije informatie.

Ze horen altijd bij een project.

WerkOS stelt geen structuur verplicht.

Een notitie kan bijvoorbeeld bevatten:

- afspraak
- idee
- herinnering
- telefoongesprek

---

# Logboek

Het logboek is de geschiedenis van een project.

Het logboek wordt automatisch opgebouwd.

Voorbeelden:

- project aangemaakt
- offerte verstuurd
- werkzaamheid afgerond
- bestand toegevoegd
- factuur betaald

Het logboek is uitsluitend informatief.

Gebruikers werken niet vanuit het logboek.

---

# Zoeken

WerkOS beschikt over één universele zoekfunctie.

Gebruikers hoeven niet eerst te kiezen waarin ze zoeken.

WerkOS bepaalt zelf welke resultaten het meest relevant zijn.

Zoeken kan onder andere op:

- klantnaam
- adres
- postcode
- project
- werkzaamheid
- offerte
- factuur
- bestand
- telefoonnummer

Zoeken is contextbewust.

Een zoekopdracht op een postcode levert bijvoorbeeld eerder projecten en klanten op dan willekeurige PDF-bestanden.

---

# Relaties tussen domeinobjecten

Het domein van WerkOS kent bewust weinig relaties.

Bedrijf
└── Lidmaatschappen → Gebruikers (+ rol)

Bedrijf
└── Klanten

Klant
└── Projecten

Project
├── Offertes
├── Werkzaamheden
├── Werkbonnen
├── Afspraken
├── Communicatie
├── Bestanden
├── Facturen
├── Locaties
├── Notities
└── Logboek

Bedrijf
└── Afspraken (zonder project)

Offerte
└── Offerteregels

Werkzaamheid
└── Werkzaamheden

Offerteregel
└── Offerteregels

Offerteregel ←──optionele koppeling──→ Werkzaamheid

Werkbon
└── Werkzaamheden (één of meer)

Afspraak
├── optioneel → Project
├── optioneel → Werkzaamheid
└── optioneel → Werkbon

Deze structuur vormt de basis van vrijwel alle functionaliteit binnen WerkOS.

Nieuwe functionaliteiten horen bij voorkeur bestaande domeinobjecten uit te breiden in plaats van nieuwe concepten te introduceren.

---

# Samenvatting

Het domeinmodel van WerkOS is gebouwd rondom één centraal uitgangspunt:

> Een project is de plek waar de dagelijkse operatie samenkomt.

Daarom bestaat WerkOS uit een klein aantal krachtige domeinobjecten die eenvoudig beginnen, maar onbeperkt kunnen meegroeien.

Door hiërarchie, minimale invoer en optionele complexiteit blijft het systeem toegankelijk voor een zelfstandige ondernemer, terwijl dezelfde structuur ook geschikt is voor grotere projectorganisaties.

Dit document beschrijft **wat** WerkOS is.

# Domeinregels

Dit hoofdstuk beschrijft de functionele regels die altijd gelden binnen het domein van WerkOS.

Deze regels vormen de contracten van het domein. Ze beschrijven niet hoe iets technisch geïmplementeerd wordt, maar welke waarheden altijd van toepassing zijn.

---

# Algemene regels

- Alle bedrijfsgegevens behoren altijd tot precies één bedrijf.
- Bedrijven zijn volledig van elkaar gescheiden.
- Toegang tot een bedrijf verloopt via lidmaatschappen.
- Iedere entiteit heeft één eigenaar (bedrijf), tenzij expliciet anders (bijv. platform-super-admin).
- WerkOS probeert nooit gegevens te dupliceren wanneer een verwijzing voldoende is.
- WerkOS automatiseert nooit zonder expliciete bevestiging van de gebruiker.
- Iedere entiteit heeft een minimale geldige vorm.
- Complexiteit is altijd optioneel.

---

# Bedrijf

- Een bedrijf heeft precies één eigenaar.
- Een bedrijf kan meerdere gebruikers hebben via lidmaatschappen.
- Een bedrijf kan meerdere klanten hebben.
- Een bedrijf kan meerdere projecten hebben.
- Een bedrijf kan slechts één abonnement hebben.
- Alle bedrijfsdata binnen WerkOS behoort uiteindelijk toe aan één bedrijf.

---

# Gebruikers en lidmaatschappen

- Toegang tot een bedrijf verloopt via een lidmaatschap met precies één rol.
- Een eigenaar mag lid zijn van meerdere bedrijven (als eigenaar).
- Kantoormedewerkers en uitvoerende medewerkers horen bij precies één bedrijf.
- Een klantgebruiker mag lid zijn van meerdere bedrijven (als klant).
- Super admin is een platformrol, geen gewone bedrijfsrol.
- Een eigenaar van een bedrijf kan niet verwijderd worden zolang die de enige eigenaar is.
- Een klantaccount is geen medewerker.
- Een medewerker is geen klantaccount.

---

# Klanten

- Een klant (relatie) behoort altijd tot één bedrijf.
- Een klant kan meerdere projecten hebben.
- Een project heeft altijd precies één opdrachtgever.
- Een klantaccount is optioneel.
- Per bedrijf ondersteunt WerkOS één klantaccount per klantrelatie.

---

# Projecten

- Een project behoort altijd tot precies één klant.
- Een project behoort altijd tot precies één bedrijf.
- Een project heeft minimaal een naam.
- Een project heeft minimaal een opdrachtgever.
- Een project kan zonder offerte bestaan.
- Een project kan zonder planning bestaan.
- Een project kan zonder werkzaamheden bestaan.
- Een project kan meerdere offertes bevatten.
- Een project kan meerdere werkzaamheden bevatten.
- Een project kan meerdere werkbonnen bevatten.
- Een project kan meerdere afspraken bevatten.
- Een project kan meerdere facturen bevatten.
- Een project kan meerdere locaties bevatten.
- Een project kan meerdere documenten bevatten.
- Een project kan meerdere gesprekken bevatten.
- Een project kan meerdere notities bevatten.
- Domeinstatussen: Voorbereiding → Uitvoering → Operationeel afgerond → Administratief afgerond → Afgerond → Archief.
- “Nieuwe aanvraag” is een weergave, geen status.

---

# Offertes

- Een offerte behoort altijd tot één project.
- Een offerte kan nooit zonder project bestaan.
- Een project kan meerdere offertes bevatten.
- Een offerte bestaat uit één of meerdere offerteregels.
- Een offerte hoeft nooit een PDF te zijn.
- Een PDF is slechts een representatie van een offerte.
- Een offerte mag altijd aangepast worden zolang deze niet definitief is gemaakt.
- Een offerte mag gedupliceerd worden.
- Een offerte mag verwijderd worden.
- Een offerte kan meerdere keren verstuurd worden.
- Een project mag meerdere actieve offertes bevatten.
- Een geaccepteerde offerte maakt nooit automatisch werkzaamheden aan.

---

# Offerteregels

- Een offerteregel behoort altijd tot één offerte.
- Een offerteregel kan subregels bevatten.
- Subregels kunnen zelf weer subregels bevatten.
- Iedere offerteregel kan zelfstandig geprijsd worden.
- WerkOS legt geen maximale diepte op.
- Een offerteregel mag optioneel gekoppeld blijven aan één of meer werkzaamheden.

---

# Werkzaamheden

- Een werkzaamheid behoort altijd tot één project.
- Een werkzaamheid heeft minimaal een titel.
- Een werkzaamheid kan zonder planning bestaan.
- Een werkzaamheid kan zonder offerte bestaan.
- Een werkzaamheid kan meerdere medewerkers bevatten.
- Een werkzaamheid kan meerdere foto's bevatten.
- Een werkzaamheid kan meerdere bestanden bevatten.
- Een werkzaamheid kan meerdere checklists bevatten.
- Een werkzaamheid kan meerdere subwerkzaamheden bevatten.
- WerkOS legt geen maximale diepte op.

---

# Werkbonnen

- Een werkbon behoort altijd tot één project.
- Een werkbon is altijd optioneel.
- Een werkbon ondersteunt één of meerdere werkzaamheden.
- WerkOS mag werkbonnen nooit verplichten.

---

# Afspraken

- Een afspraak behoort tot een bedrijf.
- Een afspraak mag bij een project horen, maar dat is niet verplicht.
- Een afspraak mag optioneel gekoppeld zijn aan een werkzaamheid of werkbon.
- Afspraken en werkzaamheden worden niet gedupliceerd in de planningweergave.

---

# Planning

- Planning is altijd optioneel.
- Planning is een weergave van werkzaamheden en afspraken.
- Planning is geen aparte administratie.
- Een werkzaamheid hoeft niet gepland te zijn.

---

# Bestanden

- Alle projectbestanden behoren uiteindelijk tot het project.
- Bestanden kunnen vanuit meerdere onderdelen benaderd worden.
- Werkzaamheden bezitten bestanden niet.
- Offertes bezitten bestanden niet.
- Bestanden bestaan onafhankelijk van hun weergave.

---

# Communicatie

- Communicatie behoort altijd tot een project (tot nadere productuitwerking van contextthreads).
- Klanten zien uitsluitend externe communicatie.
- Interne communicatie is nooit zichtbaar voor klanten.
- Systeemnotificaties zijn geen gesprekken.

---

# Facturen

- Een factuur behoort altijd tot een project.
- Een project kan meerdere facturen bevatten.
- Een factuur hoeft niet uit een offerte te ontstaan.
- Een factuur kan handmatig gemaakt worden.

---

# Locaties

- Een project kan één locatie hebben.
- Een project kan meerdere locaties hebben.
- Locaties zijn optioneel.

---

# Logboek

- Het logboek wordt automatisch opgebouwd.
- Gebruikers kunnen logboekregels niet handmatig wijzigen.
- Logboekregels zijn historisch.
- Het logboek is uitsluitend informatief.

---

# Zoeken

- Zoeken is projectoverstijgend binnen het actieve bedrijf.
- Zoeken bepaalt automatisch de meest relevante resultaten.
- Resultaten kunnen uit meerdere domeinobjecten bestaan.

---

# Universele ontwerpregels

Binnen WerkOS gelden altijd de volgende ontwerpprincipes:

- De ondernemer bepaalt.
- Minimale invoer is de standaard.
- Complexiteit is optioneel.
- WerkOS ondersteunt processen, maar dwingt ze nooit af.
- WerkOS doet slimme suggesties, geen aannames.
- Bestaande concepten worden uitgebreid voordat nieuwe concepten worden toegevoegd.
- Iedere entiteit heeft een kleinst mogelijke geldige vorm.
- Het project vormt de centrale context van de dagelijkse operatie van een opdracht.
