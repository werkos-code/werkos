# OPERATIONAL_FLOW.md

# Operationele Flow

## Doel

Dit document beschrijft hoe werk door WerkOS stroomt.

Het richt zich niet op techniek of databases, maar op de dagelijkse operatie van een projectbedrijf.

De centrale vraag is:

> Hoe verloopt het werk van een ondernemer op een natuurlijke manier?

Elke toekomstige functie binnen WerkOS moet deze flow ondersteunen en mag geen alternatieve werkwijze introduceren.

---

# Kernprincipe

WerkOS draait om één centrale operationele entiteit:

**Project**

Alles wat tot de dagelijkse operatie van een opdracht behoort, leeft binnen een project.

Er bestaan geen losse entiteiten buiten die context, zoals een aparte Lead.

Offertes, werkzaamheden, werkbonnen, facturen en bestanden zijn onderdelen van een project — geen vervangers ervan.

Een project verandert gedurende zijn levenscyclus alleen van status.

Daardoor ontstaat één doorlopende tijdlijn: vanaf het eerste klantcontact tot en met de uiteindelijke betaling.

---

# Levenscyclus van een project

De **domeinstatussen** van een project zijn:

```
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
```

**Nieuwe aanvraag** is geen aparte status.

Het is een **UI-label / filter** voor projecten in Voorbereiding (bijvoorbeeld zonder geaccepteerde offerte).

Zo voelt het voor de ondernemer als een aanvraag, terwijl technisch hetzelfde project doorloopt.

---

# Voorbereiding (en de weergave “Nieuwe aanvraag”)

Een project ontstaat zodra de ondernemer begint met een klantaanvraag.

Technisch bestaat het project dus direct.

De status is **Voorbereiding**.

Voor de ondernemer voelt dit vaak nog niet als “het project”.

Daarom kan WerkOS deze projecten tonen als:

**Nieuwe aanvraag**

Binnen deze fase bevinden zich onder andere:

- Klantgegevens
- Notities
- Foto's
- Opnames
- Calculatie
- Offerte
- Offerterevisies
- Communicatie

Het doel van deze fase is eenvoudig:

> Een aanvraag omzetten naar een geaccepteerde offerte.

---

# De mentale overgang

Wanneer de offerte wordt geaccepteerd verandert er technisch niets aan het bestaan van het project.

Het project bestond immers al.

Alleen de beleving van de ondernemer verandert.

De weergave “Nieuwe aanvraag” wordt vanaf dat moment een lopend **project** in uitvoering.

WerkOS sluit hiermee aan op de natuurlijke manier waarop ondernemers denken.

---

# Uitvoering

Na akkoord op de offerte start de uitvoering.

Dit vormt het hart van WerkOS.

Niet de planning.

Niet de werkbon.

Maar de **Werkzaamheden**.

De werkzaamheden op een project geven samen antwoord op de vraag:

> Wat moet er nog gebeuren?

---

# Werkzaamheden

Een project bevat nul of meer werkzaamheden.

Werkzaamheden kunnen hiërarchisch zijn (subwerkzaamheden).

Voorbeelden:

- Opname uitvoeren
- Materialen bestellen
- Steiger plaatsen
- Dak vervangen
- Opleveren

Werkzaamheden kunnen:

- Handmatig worden aangemaakt
- Vanuit een template worden toegevoegd
- Op basis van een geaccepteerde offerte worden **voorgesteld** (nooit automatisch zonder bevestiging)

Optioneel kan een werkzaamheid gekoppeld blijven aan één of meer **offerteregels**, zodat verwachting en werkelijkheid vergelijkbaar blijven.

Iedere werkzaamheid beschikt over een eigen detailpagina.

Hier kunnen onder andere worden vastgelegd:

- Omschrijving
- Planning
- Toegewezen medewerkers
- Notities
- Bestanden
- Foto's
- Communicatie
- Urenregistratie
- Materiaalregistratie

Een werkzaamheid vertegenwoordigt daadwerkelijk werk.

Geen administratief document.

---

# Werkbonnen

Werkbonnen zijn optioneel.

Een werkbon is een uitvoeringsdocument.

Niet iedere werkzaamheid heeft een werkbon nodig.

Voorbeeld:

Werkzaamheid:

"Interieurdesigner bellen"

Hiervoor is geen werkbon nodig.

Werkzaamheid:

"Dak vervangen"

Hiervoor kan een werkbon worden aangemaakt.

Een werkbon ondersteunt de uitvoering van één of meerdere werkzaamheden.

WerkOS mag ondernemers nooit verplichten om werkbonnen te gebruiken.

---

# Planning en afspraken

Planning ondersteunt de uitvoering.

Planning vervangt nooit de werkzaamheden.

Werkzaamheden geven antwoord op:

> Wat moet er gebeuren?

Planning geeft antwoord op:

> Wanneer gebeurt het?

Een **afspraak** is een eigen object.

Een afspraak kan:

- bij een project horen;
- optioneel aan een werkzaamheid of werkbon gekoppeld zijn;
- of bedrijfsbreed bestaan zonder project (bijvoorbeeld intern overleg).

---

# Communicatie

Communicatie is een eerste klas onderdeel van WerkOS.

*(Product-UI voor communicatie volgt na de MVP; het domein en de infrastructuur moeten er wel op voorbereid zijn.)*

Communicatie is altijd gekoppeld aan een context.

Gesprekken bestaan nooit op zichzelf.

Voorbeelden:

- Algemene projectchat
- Offertechat
- Werkzaamheidschat
- Planningchat

Vanuit iedere relevante pagina kan direct een gesprek worden gestart.

Daarnaast beschikt WerkOS over een centrale pagina **Communicatie**.

Deze pagina fungeert als inbox waarin alle gesprekken overzichtelijk worden weergegeven.

De inbox is een overzicht.

De communicatie zelf blijft altijd gekoppeld aan het werk.

De ondernemer bepaalt welke gesprekken zichtbaar zijn voor de klant.

---

# Bestanden

Ieder project beschikt over een centrale bestandenbibliotheek.

Hier worden automatisch opgeslagen:

- Offertes
- Facturen
- Gegenereerde documenten
- Geüploade bestanden

Iedere werkzaamheid beschikt daarnaast over een weergave van relevante bestanden.

Bestanden die aan een werkzaamheid worden toegevoegd verschijnen automatisch ook binnen de algemene projectbibliotheek, gegroepeerd per werkzaamheid.

Een bestand bestaat altijd maar één keer.

WerkOS toont hetzelfde bestand op meerdere logische plekken zonder duplicaten te maken.

---

# Calculatie

Calculatie is geen losse module.

Calculatie loopt gedurende het volledige project.

WerkOS vergelijkt continu:

Verwachting

tegenover

Werkelijkheid.

Bijvoorbeeld:

- Begrote uren vs. werkelijke uren
- Begrote materialen vs. verbruikte materialen
- Offertebedrag vs. factuurbedrag
- Verwachte marge vs. gerealiseerde marge

WerkOS maakt deze verschillen inzichtelijk zonder extra administratie te creëren.

---

# Operationeel afgerond

De uitvoering is afgerond wanneer alle werkzaamheden van het project zijn voltooid.

Vanaf dat moment hoeft er buiten niets meer uitgevoerd te worden.

De administratieve afhandeling begint.

---

# Administratief afgerond

Een project is pas volledig afgerond wanneer ook alle administratieve werkzaamheden zijn voltooid.

Bijvoorbeeld:

- Nacalculatie
- Factuur verzonden
- Factuur betaald
- Laatste administratie afgerond

Pas daarna krijgt het project de status:

**Afgerond**

---

# Archief

Afgeronde projecten worden gearchiveerd.

Ze blijven volledig doorzoekbaar.

Ook vanuit een gearchiveerd project kan later nog terugkerend werk ontstaan.

---

# Terugkerend werk

Terugkerend werk is geen aparte module.

Het is een uitbreiding van een bestaand project.

*(Product-UI hiervoor volgt na de MVP; het domein moet er wel op voorbereid zijn.)*

Bij ieder project kan een terugkerend werkschema worden ingesteld.

Bijvoorbeeld:

- Jaarlijkse inspectie
- Periodiek onderhoud
- Seizoenswerk
- Terugkerende service

Binnen het projectenoverzicht is hiervoor een aparte weergave beschikbaar:

- Nieuwe aanvragen
- Lopende projecten
- Terugkerend werk
- Afgerond
- Archief

Hierdoor blijft terugkerend werk centraal beheersbaar zonder een aparte onderhoudsmodule te introduceren.

---

# Notificaties

Notificaties vertegenwoordigen betekenisvolle gebeurtenissen binnen de dagelijkse operatie.

Voorbeelden:

- Klant reageert
- Offerte geaccepteerd
- Werkzaamheid afgerond
- Planning gewijzigd
- Factuur betaald

WerkOS toont notificaties via:

- De notificatiebel
- Het notificatiecentrum

De homepage toont de huidige situatie.

Het notificatiecentrum laat zien wat er sinds de vorige keer is veranderd.

---

# Uitgangspunten

## Eén project als ruggengraat

Opdrachtgerelateerd werk behoort tot een project.

## Werkzaamheden beantwoorden “wat nog?”

Het overzicht van openstaande werkzaamheden is het hart van de uitvoering.

## Werkbonnen zijn optioneel

Nooit verplicht.

## Werk vóór administratie

WerkOS ondersteunt eerst het werk.

Administratie volgt vanzelf.

## Context boven modules

Alle informatie is gekoppeld aan de context waarin deze ontstaat.

## Eén bron van waarheid

Bestanden, gesprekken en informatie bestaan slechts één keer, maar kunnen vanuit meerdere plekken worden bekeken.

## Eén doorlopende flow

Een project vormt één ononderbroken reis: van eerste klantcontact tot en met de uiteindelijke betaling.
