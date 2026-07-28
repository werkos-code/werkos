# Basisvorm — open modules (foundation backlog)

> Laatst bijgewerkt: 2026-07-28  
> Doel: **eerste basisvorm** afronden. Routes bestaan vaak al als coming-soon stub; hier staat wat nog echt gebouwd moet worden.  
> Daarna: per module refinen tot professioneel niveau (aparte feature-backlogs).

## Statuslegenda

| Status | Betekenis |
| --- | --- |
| Stub | Route + nav/header aanwezig, alleen `ComingSoonPanel` |
| Partial | Deels werkend (andere context, of alleen icoon) |
| Open | Nog niet op feature-backlog / geen echte UI |

---

## Navigatiepagina’s (sidebar)

| Module | Route | Status | Feature-backlog / notities |
| --- | --- | --- | --- |
| Werkzaamheden (hoofdpagina) | `/werkzaamheden` | Stub | Alleen project-tab bestaat (`WORK_ITEMS_TAB_BACKLOG.md`). Org-brede lijstwerkruimte nog bouwen. |
| Onderaannemers | `/onderaannemers` | Stub | Nav-label: **Onderaannemers** (niet meer “/ ZZP'ers”). Geen dedicated backlog tot nu. |
| Materiaal → Installaties | `/materiaal/installaties` | Stub | Zie `MATERIALS_ERP_BACKLOG.md` (open item). |
| Bedrijf → Rapportages | `/rapportages` | Stub | Geen dedicated backlog tot nu. |
| Personeel | `/personeel` | Stub | Deels geraakt door `TIME_BACKLOG.md` / planning; geen org-HR-pagina. |
| Inbox | `/inbox` | Stub | Domein: `OPERATIONAL_FLOW.md` (communicatie). Geen feature-backlog tot nu. |
| Notificaties (pagina) | `/notificaties` | Stub | Domein: `OPERATIONAL_FLOW.md` / `DOMAIN_MODEL.md`. Geen feature-backlog tot nu. |

## Shell-header (rechtsboven)

| Element | Status | Notities |
| --- | --- | --- |
| Zoekfunctie | Partial | Icoon in `app-page-header.tsx`, geen actie/zoek-UI |
| Notificatie-icoon | Partial | Icoon aanwezig, geen panel/badge/lijst |
| Help-icoon | Partial | Icoon aanwezig, geen help-content |

## Account & abonnement

| Module | Route | Status | Notities |
| --- | --- | --- | --- |
| Account | `/instellingen/account` | Stub | Via accountmenu in sidebar |
| Abonnement en facturatie | `/instellingen/abonnement` | Stub | Via accountmenu; onboarding heeft al payment-stappen |

---

## Afvinklijst (basisvorm)

### Pagina’s
- [ ] Werkzaamheden hoofdpagina (`/werkzaamheden`) — org-breed overzicht, koppeling project-detail
- [ ] Onderaannemers (`/onderaannemers`) — lijst + detail (relaties, zoals klanten/leveranciers)
- [ ] Materiaal → Installaties (`/materiaal/installaties`)
- [ ] Rapportages (`/rapportages`) — eerste KPI/rapport-set
- [ ] Personeel (`/personeel`) — teamleden / rollen in org
- [ ] Inbox (`/inbox`) — gesprekken-overzicht (MVP)
- [ ] Notificaties-pagina (`/notificaties`) — voorkeuren + geschiedenis (MVP)

### Shell-chrome
- [ ] Globale zoekfunctie (header)
- [ ] Notificatie-icoon → panel / badge
- [ ] Help-icoon → help/docs overlay of link

### Instellingen
- [ ] Account (profiel, wachtwoord, voorkeuren)
- [ ] Abonnement en facturatie (plan, seats, facturen SaaS)

---

## Beslissing (product)

Als deze lijst werkt én de openstaande punten op bestaande feature-backlogs zijn opgepakt, is de **eerste basisvorm** klaar. Daarna per module refinements i.p.v. nieuwe stub-pagina’s.
