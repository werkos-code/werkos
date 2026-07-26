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

Maak **één product** “WerkOS” met drie recurring monthly prices:

| Price | Bedrag | Env var |
| --- | --- | --- |
| Basis (incl. owner) | €59 | `STRIPE_PRICE_BASE` |
| Kantoorseat | €25 | `STRIPE_PRICE_SEAT_OFFICE` |
| Uitvoerend seat | €15 | `STRIPE_PRICE_SEAT_FIELD` |

Kopieer de `price_…` ids naar `.env.local` en Vercel env.

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
4. Je landt op provisioning → complete → Werk-shell
5. Wissel bewust naar **Bedrijf** en terug naar **Werk**
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

## Prijsformule

`totaal = €59 + (kantoor × €25) + (uitvoerend × €15)`  
Owner zit in de basis; tellers zijn alleen extra seats.  
Trial: 14 dagen, betaalmethode verplicht, €0 tijdens trial.
