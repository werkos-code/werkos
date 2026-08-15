# Jaarlijkse billing — implementatie (vóór livegang)

> Status: **OPEN** — app-keuze maand/jaar staat op `/instellingen/abonnement/kiezen`; **Stripe yearly prices + env + DB-interval nog activeren**.  
> Productregels (bedragen, principes): [`PHASE1_SETUP.md` — Prijsmodel](./PHASE1_SETUP.md#prijsmodel).  
> Handmatige activering ook in [`PENDING_SETUP.md`](./PENDING_SETUP.md) (§ Stripe activeren).

Laatst bijgewerkt: 2026-08-15

---

## Doel

Klant kiest bij abonnement (en later evt. onboarding) tussen:

| Frequentie | Wat Stripe doet | Klant ziet |
| --- | --- | --- |
| Maandelijks | Recurring `month` | €59 + seats / maand, maandelijks opzegbaar |
| Jaarlijks | Recurring `year`, 1× per 12 maanden | €588 + seats vooraf; maand-equivalent €49 / €20 / €10 |

Jaarlijks = **vooruitbetaling voor 12 maanden gebruik**, geen “1-jarig contract met maandelijkse facturen”.

Trial: 14 dagen blijft; na trial de eerste charge volgens het gekozen interval.

---

## Stripe-bedragen (yearly prices)

| Onderdeel | Yearly price (eenmalig per jaar) | Env var (nieuw) |
| --- | --- | --- |
| Basis (incl. owner) | €588 | `STRIPE_PRICE_BASE_YEARLY` |
| Kantoorseat | €240 | `STRIPE_PRICE_SEAT_OFFICE_YEARLY` |
| Uitvoerend seat | €120 | `STRIPE_PRICE_SEAT_FIELD_YEARLY` |

Bestaande maandelijkse prices blijven: `STRIPE_PRICE_BASE`, `STRIPE_PRICE_SEAT_OFFICE`, `STRIPE_PRICE_SEAT_FIELD`.

---

## Jij (handmatig) — vóór of parallel aan app-werk

- [ ] In Stripe (test + later live): **3 yearly prices** op product WerkOS (recurring, interval **Year**, bedragen hierboven)
- [ ] Price-ids zetten in `.env.local` én Vercel Production/Preview
- [ ] Redeploy na env-wijziging
- [ ] Optioneel: Customer Portal zo instellen dat interval/seats gewijzigd mogen worden
- [ ] Smoke-test na oplevering (zie onder)
- [ ] Marketing-site (`WerkOS - Site`): pricingtekst gelijk trekken — **aparte repo**

Zonder yearly price-ids faalt live Checkout voor de jaarlijkse optie.

---

## Agent / app — te bouwen

### Config & Stripe

- [ ] `src/config/pricing.ts` — yearly cents + `calculateYearlyTotalCents` (en evt. maand-equivalent helpers)
- [ ] `src/lib/env.ts` + `.env.example` — 3 nieuwe optionele/verplichte price env-vars
- [ ] `src/lib/stripe.ts` — yearly ids lezen; `assertStripePricesConfigured` uitbreiden wanneer yearly gekozen is

### Onboarding

- [ ] Keuze **Maandelijks / Jaarlijks** (team- of payment-stap)
- [ ] Draft opslaan: `billing_interval` (`month` \| `year`) — kolom op `onboarding_drafts` of equivalent
- [ ] Prijspreview: jaarbedrag + “€… per maand bij jaarlijks”
- [ ] `checkout-action.ts` — line items uit monthly of yearly price-ids; metadata `billing_interval`

### Provision / DB

- [ ] SQL: `subscriptions.billing_interval` (`month` \| `year`, default `month`) — bestand in `docs/sql-applied/`, door PO op Supabase draaien
- [ ] Webhook + `provision.ts` — interval uit metadata / Stripe subscription opslaan
- [ ] Types in `src/types/database.ts`

### App-UI na onboarding

- [ ] `/instellingen/abonnement` — interval tonen + juiste totalen (maand vs jaar)
- [ ] i18n `messages/{nl,en,de}.json`

### Docs na oplevering

- [ ] Dit document: status → **DONE** (datum)
- [ ] `PHASE1_SETUP.md` §3 + “Huidige runtime” bijwerken
- [ ] `PENDING_SETUP.md` — yearly-item afvinken

---

## Buiten scope (nu)

- Wijzigen van interval midden in een betaalde periode (portal mag later)
- 2-jarige contracten
- Feature-tiers / modules achter een duurder plan
- Automatische seat-sync vanuit personeelslijst naar Stripe (bestaat nu ook niet volledig)

---

## Smoke-test (als klaar)

1. Onboarding → kies **Jaarlijks** → seats 2 kantoor + 5 uitvoerend  
2. Checkout toont **€1.668** (of equivalent na trial-note)  
3. Na webhook: org + subscription met `billing_interval = year`  
4. `/instellingen/abonnement` toont jaarlijks + seats  
5. Herhaal met **Maandelijks** → €59 + seats / maand (regressie)

---

## Referenties in code (huidige maandelijkse flow)

| Onderdeel | Pad |
| --- | --- |
| Pricing constants | `src/config/pricing.ts` |
| Checkout | `src/features/onboarding/checkout-action.ts` |
| Team / payment UI | `src/features/onboarding/components/team-step-form.tsx`, `payment-step-form.tsx` |
| Webhook | `src/app/api/stripe/webhook/route.ts` |
| Provision | `src/features/onboarding/provision.ts` |
| Abonnement-scherm | `src/features/billing/` |
