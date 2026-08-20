# Open setup & acties

> Handmatige stappen die nog gedaan moeten worden. Agents: herinner de gebruiker hieraan bij relevant werk.

## Marketing attribution SQL — **gedaan**

`docs/sql-applied/20260820120000_marketing_attribution.sql` is gedraaid.

## Google Analytics (GA4) + Vercel env — **nog te doen**

Nog geen GA-account. Zonder env blijven business events in de DB-dedupe werken zodra SQL er is, maar GA4 ontvangt niets (Measurement Protocol skippt stil).

Als jullie klaar zijn (één property voor site + app):

1. [Google Analytics](https://analytics.google.com/) → account **WerkOS** → property **GA4**
2. Twee web data streams (of één stream + cross-domain linker — wij gebruiken linker op beide domeinen):
   - `werkos.nl`
   - `app.werkos.nl`
3. Noteer **Measurement ID** (`G-XXXXXXXX`)
4. In de stream: **Measurement Protocol API secrets** → secret aanmaken → `GA4_API_SECRET`
5. Zelfde `G-…` op **beide** Vercel-projecten:
   - App: `NEXT_PUBLIC_GA_MEASUREMENT_ID` + `GA4_API_SECRET`
   - Site: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (zoals de marketing-agent al verwacht)
6. Redeploy app + site

Zie [`ANALYTICS_ATTRIBUTION.md`](./ANALYTICS_ATTRIBUTION.md).

## Dashboard privé-notities SQL — **nog te doen**

Voor notities in de privé-werkruimte op het dashboard:

`docs/sql-applied/20260815220000_user_notes.sql`

Zonder deze tabel blijft notities fail-soft (foutmelding + geen opslag).

## Onboarding RPC — **nog te doen** (lost “Laden…” op team-stap op)

Zonder service-role in de app faalt provisioneren. Voer uit in Supabase SQL Editor:

`docs/sql-applied/20260815140000_complete_onboarding_rpc.sql`

Daarna opnieuw proberen op de team-stap. Lokaal: zet ook `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (zie `.env.example`) voor webhooks/admin.

## Stripe activeren voor abonnementen — **nog te doen** (vóór livegang)

De abonnementspagina (`/instellingen/abonnement/kiezen`) is klaar (maand/jaar + seats + Checkout-flow), maar **betalen werkt pas als Stripe live is gezet**.

Checklist:

1. Stripe product **WerkOS** met monthly prices (basis / kantoor / uitvoerend) — zie [`PHASE1_SETUP.md` §3](./PHASE1_SETUP.md)
2. **Yearly prices** toevoegen (basis €588, kantoor €240, uitvoerend €120) — zie [`BILLING_YEARLY_IMPLEMENTATION.md`](./BILLING_YEARLY_IMPLEMENTATION.md)
3. Env op Vercel + lokaal: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASE`, `STRIPE_PRICE_SEAT_OFFICE`, `STRIPE_PRICE_SEAT_FIELD`, plus `STRIPE_PRICE_BASE_YEARLY`, `STRIPE_PRICE_SEAT_OFFICE_YEARLY`, `STRIPE_PRICE_SEAT_FIELD_YEARLY` (zie `.env.example`)
4. Webhook endpoint: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Smoke-test: trial-org → abonnement kiezen → Checkout → status `active`

Zonder yearly price-ids faalt alleen de jaarlijkse Checkout; maandelijks kan al werken zodra de monthly ids + secret staan.

## Trial / paywall flow — **geen extra SQL**

Onboarding provisionneert direct een org met `subscriptions.status = trialing` + `trial_ends_at` (+14d). Stripe Checkout gebeurt pas op `/instellingen/abonnement/kiezen` (zie Stripe-sectie hierboven).

## Guided setup SQL — **nog te doen** (vóór eerste-stappen-gids)

Na deploy: in Supabase SQL Editor uitvoeren:

`docs/sql-applied/20260815100000_guided_setup.sql`

Zonder deze kolommen blijft de gids uit (fail-soft).

## Factuurinstellingen SQL — **nog te doen**

Voor factuurnummer-formaat, afzender-e-mail, standaard betaaltermijn/btw/notities:

`docs/sql-applied/20260815130000_invoice_settings.sql`

## Factuur-groepen SQL — **nog te doen**

Voor groepen + hiërarchie in de factuur-editor:

`docs/sql-applied/20260815110000_invoice_line_groups.sql`

## Factuur zonder project SQL — **nog te doen**

Voor facturen zonder project (alleen klant):

`docs/sql-applied/20260815120000_invoice_optional_project.sql`

## Jaarlijkse billing (vóór livegang) — **deels open**

App-UI (maand/jaar-switch + totalen) staat klaar op de abonnementspagina. **Nog open:** Stripe yearly prices + env-ids + webhook/DB `billing_interval` opslaan.

→ Volledige checklist (jij + agent): [`BILLING_YEARLY_IMPLEMENTATION.md`](./BILLING_YEARLY_IMPLEMENTATION.md)  
→ Bedragen / principes: [`PHASE1_SETUP.md` — Prijsmodel](./PHASE1_SETUP.md#prijsmodel)
→ Activeren: sectie **Stripe activeren voor abonnementen** hierboven

## 2BA catalogus activeren — **nog te doen**

De UI voor 2BA-zoeken staat klaar op `/materiaal/inkoop` en `/materiaal/artikelen`, maar de koppeling werkt pas na credentials.

1. Registreer WerkOS als softwarepartner bij [2BA webservices](https://www.2ba.nl/documentatie/webservices/introduction-webservices/)
2. Vraag `ClientId` + `ClientSecret` + 2BA-account aan
3. Zet in `.env.local` en Vercel Production/Preview (zie `.env.example`):

```env
TWOBA_CLIENT_ID=
TWOBA_CLIENT_SECRET=
TWOBA_USERNAME=
TWOBA_PASSWORD=
```

4. Redeploy / herstart dev-server
5. Test: `/materiaal/artikelen` → **2BA** → zoek op artikelnaam of EAN

Zonder deze vars blijven **Eigen catalogus** en **Handmatig** gewoon werken.
