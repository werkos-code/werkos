# GLOSSARY.md

# WerkOS Glossary

Korte definities zodat product, design en engineering dezelfde taal spreken.

| Term (NL) | Code / EN | Betekenis |
| --- | --- | --- |
| Bedrijf | Organization | Tenant; alle data is bedrijfsscoped |
| Lidmaatschap | Membership | Koppeling gebruiker ↔ bedrijf + rol |
| Super admin | `super_admin` | Interne WerkOS-medewerker (platform) |
| Eigenaar | `owner` | Betaler/beheerder van een bedrijf; mag meerdere bedrijven hebben |
| Kantoormedewerker | `office_employee` | Administratief personeel; precies één bedrijf |
| Uitvoerend medewerker | `field_employee` | Uitvoerend personeel; precies één bedrijf |
| Klant (relatie) | Customer (record) | Opdrachtgever binnen een bedrijf |
| Klant (gebruiker) | `customer` | Portaalgebruiker; mag bij meerdere bedrijven klant zijn |
| Project | Project | Centrale operationele entiteit |
| Nieuwe opdracht | — | Intake-wizard `/opdrachten/nieuw`, geen domeinstatus |
| Voorbereiding … Archief | Project status | Domeinstatussen van een project |
| Offerte | Quote | Voorstel (data); PDF is slechts weergave |
| Offerteregel | Quote line | Onderdeel van een offerte; mag hiërarchisch zijn |
| Werkzaamheid | Work item | Uitvoerbaar werk; beantwoordt “wat moet er nog?” |
| Werkbon | Work order | Optioneel uitvoeringsdocument; ondersteunt werkzaamheden |
| Afspraak | Appointment | Eigen object; mag met of zonder project |
| Planning | Planning | Weergave van werkzaamheden + afspraken (geen dubbele admin) |
| Organisatie-switcher | Org switcher | Wisselen tussen organisaties (UI-klaar; multi-org later) |

## Bewust niet gebruiken

| Vermijden | Gebruik in plaats daarvan |
| --- | --- |
| Lead (als entiteit) | Project in Voorbereiding / filter “Nieuwe aanvraag” |
| Werkplan (als entiteit of UI-label) | Werkzaamheden |
| Task hierarchy / Service Order | Werkzaamheden / Werkbon |
| Gesplitste app-contexten | Eén navigatiestructuur |
| Modules als navigatiemodel | Werkruimtes / bestemmingen |
