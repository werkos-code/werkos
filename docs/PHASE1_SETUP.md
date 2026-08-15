# Phase 1 setup (PO runbook)

Handmatige stappen om auth, database en Stripe werkend te krijgen.

## 1. Supabase — database

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → je WerkOS-project
2. Ga naar **SQL Editor** → **New query**
3. Plak de volledige inhoud van:
   `supabase/migrations/20260724160000_phase1_auth_billing.sql`
4. Klik **Run**

## 2. Supabase — Auth-instellingen

1. **Authentication → Providers → Email** → enabled
2. **Authentication → Sign In / Providers** (of **Settings**):
   - Zet **Confirm email** tijdelijk **uit** voor soepele onboarding-tests  
     (anders moet elke signup eerst e-mail bevestigen)
3. **Authentication → URL Configuration**:
   - Site URL: `https://app.werkos.nl` (en lokaal `http://localhost:3000`)
   - Redirect URLs: voeg toe  
     `http://localhost:3000/**`  
     `https://app.werkos.nl/**`

## 3. Stripe — producten

Huidige implementatie: **één product** “WerkOS” met drie recurring **monthly** prices (jaarlijkse vooruitbetaling is commerciële keuze, nog niet in Stripe/code).

| Price | Bedrag | Env var |
| --- | --- | --- |
| Basis (incl. owner) | €59 | `STRIPE_PRICE_BASE` |
| Kantoorseat | €25 | `STRIPE_PRICE_SEAT_OFFICE` |
| Uitvoerend seat | €15 | `STRIPE_PRICE_SEAT_FIELD` |

Kopieer de `price_…` ids naar `.env.local` en Vercel env.

Commercieel model (bron van waarheid, ook jaarlijks): zie [Prijsmodel](#prijsmodel).

## 4. Stripe — webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://app.werkos.nl/api/stripe/webhook`
3. Events: `checkout.session.completed`
4. Kopieer **Signing secret** → `STRIPE_WEBHOOK_SECRET`

Lokaal testen (optioneel):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 5. Vercel environment variables

Zet dezelfde keys als in `.env.example` voor **Production** én **Preview**, daarna **Redeploy**.

## 6. Smoke test

1. Open `https://app.werkos.nl/nl/onboarding`
2. Doorloop account → bedrijf → team → betaling
3. Rond Stripe Checkout (testkaart `4242…`) af
4. Je landt op provisioning → complete → `/dashboard`
5. Controleer de sidebar: één navigatiestructuur + organisatie-switcher
6. Uitloggen / inloggen

## 7. Super Admin (platform)

Na de basis-migratie:

1. Open **SQL Editor** in Supabase
2. Plak en run de inhoud van:  
   `supabase/migrations/20260726170000_platform_super_admin.sql`
3. Dit doet o.a.:
   - kolom `profiles.platform_role`
   - helper `is_super_admin()` + RLS-select voor platformdata
   - promote van `e.jorissen@hotmail.nl` naar `super_admin` (als het account bestaat)
4. Log in op `https://app.werkos.nl` → in de sidebar verschijnt **Admin** (Dashboard, Gebruikers, Administratie)
5. Onder **Gebruikers** kun je testaccounts aanmaken zonder Stripe (owners krijgen een org met status `trialing`)

Handmatig een andere gebruiker promoten:

```sql
update public.profiles p
set platform_role = 'super_admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('jouw@email.nl');
```

## 8. Phase 2 — Klanten + Projecten

Na Phase 1 / Super Admin:

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726180000_phase2_customers_projects.sql`
3. Test:
   - Klanten → nieuwe klant
   - Nieuwe opdracht → intake-wizard op `/opdrachten/nieuw`
   - Projectdetail openen en status wijzigen

## 9. Phase 3 — Offertes

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726190000_phase3_quotes.sql`
3. Test:
   - Projectdetail → nieuwe offerte → regels (incl. subregel)
   - Versturen → Accepteren → werkzaamheden laten aanmaken

## 10. Projectdetail MVP — metadata + activiteit

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726195000_project_detail_mvp.sql`
3. Test:
   - Projectdetail: nummer, data, leider, contact, labels bewerken
   - Notitie plaatsen → verschijnt in Activiteit
   - Offerte aanmaken/wijzigen/accepteren → events in de feed
   - Voortgang alleen zichtbaar als er werkzaamheden zijn

## 11. Projectdetail polish — favoriet, cover, taken

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726200000_project_detail_polish.sql`
3. Test:
   - Ster favoriet toggelen
   - Delen → link kopiëren
   - Cover klikken → afbeelding uploaden
   - Taken toevoegen / afronden / bewerken
   - Activiteit filteren

## 12. Werkzaamheden PM — hiërarchie + Taken-tab

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726210000_work_items_pm.sql`
3. Test:
   - Projectdetail → Taken: groep + werkzaamheden
   - Filters / zoeken
   - Klik rij → rechter overlay (placeholder)
   - Status klikken (open → in uitvoering → voltooid)

## 13. Werkzaamheden interactief — groepen + drag-and-drop

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726220000_work_items_is_group.sql`
3. Test:
   - + Toevoegen (hoofd) / dropdown → Groep
   - Inline “+ Werkzaamheid toevoegen” in een groep
   - Sleep items tussen groepen en herorden
   - Verwijderknop op rij

## 14. Werkzaamheid-detail overlay

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726230000_work_item_detail.sql`
3. Test:
   - Taken → klik rij → brede overlay
   - Overzicht: beschrijving, prioriteit, labels, planning, subtaken
   - Tabs Tijd/Bestanden/Communicatie = placeholders
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§7 Werkzaamheid-detail)

## 15. Planning — centrale kalender

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726240000_appointments_planning.sql`
3. Test:
   - `/planning` weekweergave
   - + Nieuwe afspraak
   - Klik “Niet gepland” → werkzaamheid inplannen
   - Filters project / persoon
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§8 Planning)

## 16. Werkbonnen

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726250000_work_orders.sql`
3. Test:
   - `/werkbonnen` — KPI’s + tabel
   - + Nieuwe werkbon (met project + subtaken)
   - Klik rij → detail sheet
   - Projectdetail → tab Werkbonnen
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§9 Werkbonnen)

## 17. Facturen

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `supabase/migrations/20260726260000_invoices.sql`
3. Test:
   - `/facturen` — KPI’s + tabel + widgets
   - + Nieuwe factuur (project + bedrag)
   - Tabs Concepten / Herinneringen / Verzonden / Betaald
   - Klik rij → detail sheet + status wijzigen
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§3 Facturen)

## 18. Documenten (bestandenbibliotheek)

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `docs/sql-applied/20260726270000_project_files.sql`
3. Test:
   - `/documenten` — projectmappen → upload / submap
   - Projectdetail → tab Bestanden
4. Eerdere SQL staat in [`sql-applied/`](./sql-applied/) (niet opnieuw draaien op productie)
5. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§10 Documenten)

## 19. Uren (verwacht vs werkelijk)

1. Open **SQL Editor** in Supabase
2. Plak en run:  
   `docs/sql-applied/20260726280000_time_entries.sql`
3. Test:
   - Project → Taken → open blad-werkzaamheid → tab **Tijd & uren** → boek uren
   - Taken-lijst + project-KPI tonen verwacht / werkelijk
   - Offerte-editor: kolom **Uren** op regels; bij acceptatie kopie naar werkzaamheid
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§11 Uren)

## 20. Materiaal ERP (artikelen + voorraad + project)

1. Open **SQL Editor** in Supabase
2. Plak en run (indien nog niet gedaan):  
   `docs/sql-applied/20260726290000_materials_erp.sql`
3. Test:
   - `/materiaal/artikelen` — artikel aanmaken
   - `/materiaal/voorraad` — locatie + ontvangstmutatie
   - Project → Taken → werkzaamheid → tab **Materiaal** — begroot + verbruik (ad-hoc mag)
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§12 Materiaal)

## 21. Materiaal ERP fase D (leveranciers + inkoop)

1. Open **SQL Editor** in Supabase
2. Plak en run (indien nog niet gedaan):  
   `docs/sql-applied/20260727100000_materials_phase_d.sql`  
   en `docs/sql-applied/20260727110000_materials_phase_d_grants.sql`
3. Test:
   - `/leveranciers` — leverancier aanmaken
   - `/materiaal/artikelen` — artikel bewerken → leveranciersprijzen
   - `/materiaal/voorraad` — min/max op saldo
   - Werkzaamheid → tab **Materiaal** → verbruik met voorraad-aftrek
   - `/materiaal/inkoop` — inkooporder aanmaken
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§12 Materiaal)

## 22. Materiaal ERP fase D+ (ontvangst + reserveringen)

1. Open **SQL Editor** in Supabase
2. Plak en run (indien nog niet gedaan):  
   `docs/sql-applied/20260727200000_materials_phase_d_plus.sql`
3. Test:
   - `/materiaal/inkoop` — order versturen → **Ontvangen** → locatie + aantallen → voorraad stijgt
   - `/materiaal/voorraad` — **Reserveren** op saldo → actieve reserveringen → **Vrijgeven**
4. Rest: [`FOUNDATION_BACKLOG.md`](./FOUNDATION_BACKLOG.md) (§12 Materiaal)

## 23. Materiaal ERP fase E (werkbon + BOM-reserveringen)

Geen nieuwe SQL. Test:

- Project → werkzaamheid → tab **Materiaal** → **Reserveren** op planregel met artikel
- `/materiaal/artikelen` — barcodeveld, Enter opent artikel
- `/werkbonnen` — werkbon openen → **Materiaal** → werkzaamheid koppelen → overzicht

## 24. Materiaal ERP fase E+ (direct op werkbon)

1. Open **SQL Editor** in Supabase
2. Plak en run (indien nog niet gedaan):  
   `docs/sql-applied/20260727300000_work_order_material_usages.sql`
3. Test: `/werkbonnen` → werkbon → **Direct op werkbon** → verbruik boeken

## 25. Materiaal ERP fase F (3-way match)

1. Open **SQL Editor** in Supabase
2. Plak en run (indien nog niet gedaan):  
   `docs/sql-applied/20260727310000_supplier_invoices_3way_match.sql`
3. Test: `/materiaal/inkoop` → order ontvangen → **Factuur** → **3-way match**

## 26. Materiaal ERP fase G (2BA + handmatig in inkoop)

1. Run SQL (indien nog niet gedaan): `docs/sql-applied/20260727320000_articles_catalog_refs.sql`
2. Optioneel: zet `TWOBA_*` in `.env.local` / Vercel — zie [`PENDING_SETUP.md`](./PENDING_SETUP.md)
3. Test: `/materiaal/inkoop` en `/materiaal/artikelen` → **2BA**

## 27. Eerste-stappen-gids (guided setup)

1. Open **SQL Editor** in Supabase  
2. Plak en run: `docs/sql-applied/20260815100000_guided_setup.sql`  
3. Test: op Dashboard / Projecten / Planning e.d. → floating coach rechtsonder; Help → **Eerste stappen opnieuw**

## Prijsmodel

Bron van waarheid voor productstrategie en toekomstige billing. **Nog niet alles hiervan zit in Stripe/UI** — de live checkout volgt nog alleen het maandelijkse tarief (zie §3).

WerkOS heeft **geen** Business / Pro / Premium-tiers. Er is één compleet platform; alle modules en functionaliteit zitten in hetzelfde abonnement. De prijs hangt alleen af van:

1. Betaalfrequentie (maandelijks of jaarlijks)
2. Aantal gebruikers
3. Type gebruiker (kantoor vs uitvoerend)

De eigenaar zit in het basisbedrag. Extra medewerkers zijn seats.

### Maandelijks (maandelijks opzegbaar)

| Onderdeel | Prijs |
| --- | --- |
| WerkOS basis (incl. owner) | €59 / maand |
| Kantoormedewerker | €25 / gebruiker / maand |
| Uitvoerend medewerker | €15 / gebruiker / maand |

`maandbedrag = €59 + (kantoor × €25) + (uitvoerend × €15)`

### Jaarlijks (vooruitbetaling voor 12 maanden)

Geen 1-jarig contract waarin de klant maandelijks moet blijven betalen. De klant rekent **basis + alle seats** in één keer af voor 12 maanden gebruik. Daarna opnieuw kiezen: verlengen, overstappen naar maandelijks, of stoppen.

| Onderdeel | Maand-equivalent | Vooraf per jaar |
| --- | --- | --- |
| WerkOS basis (incl. owner) | €49 | €588 |
| Kantoormedewerker | €20 | €240 |
| Uitvoerend medewerker | €10 | €120 |

`jaarbedrag = €588 + (kantoor × €240) + (uitvoerend × €120)`

Voorbeeld — 1 basis + 2 kantoor + 5 uitvoerend:  
€588 + 2 × €240 + 5 × €120 = **€1.668** per jaar vooraf.

### Wat dit bewust niet is

- Geen 2-jarige contracten of andere looptijden
- Geen feature-locks per pakket
- Geen losse modules achter een duurder abonnement
- Geen discussie over “resterende maanden” bij stoppen: jaarlijks is al vooruitbetaald; maandelijks stopt na de lopende periode

Uitleg naar de klant: *“€59 per maand, of €49 per maand wanneer je jaarlijks betaalt. Je betaalt daarnaast alleen voor de gebruikers die met WerkOS werken.”*

### Huidige runtime (tot yearly is gebouwd)

Checkout en env-vars gebruiken alleen de maandelijkse prices uit §3.  
Trial: 14 dagen, betaalmethode verplicht, €0 tijdens trial.

**Open voor livegang:** yearly prices + onboarding-keuze — zie [`BILLING_YEARLY_IMPLEMENTATION.md`](./BILLING_YEARLY_IMPLEMENTATION.md) (status OPEN).
