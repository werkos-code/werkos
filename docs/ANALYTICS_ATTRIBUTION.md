# Marketing attribution & conversion analytics (app)

> Scope: **app.werkos.nl only**. Marketing site (`werkos.nl`) is a separate repo.

## Funnel event taxonomy

Shared names with the marketing site (`ANALYTICS_EVENTS` in `src/lib/analytics/events.ts`):

| Event | Owner | When |
| --- | --- | --- |
| `page_view` | Site + App (client) | Route view |
| `cta_start_free` | Site | Start-gratis CTA click |
| `signup_started` | Site | Redirect to app signup URL (with attribution) |
| `sign_up` | **App** | Auth account created successfully (`signUpAction`) |
| `company_created` | **App** | Organization provisioned (`completeOnboardingAction` / checkout provision) |
| `first_project_created` | **App** | First project row for the org |
| `first_quote_created` | **App** | First quote row for the org |
| `subscription_started` | **App** | Subscription status becomes **`active`** (paid) |

Business events are **never** fired from button clicks alone — only after successful DB/backend actions.

## Architecture

```
werkos.nl ──(URL params)──► app.werkos.nl/onboarding/account
                                 │
                                 ├─ middleware cookie `werkos_ft` (90d, first-touch)
                                 ├─ client GA4 gtag (same Measurement ID + linker)
                                 └─ server Measurement Protocol (business events)
                                        │
                                        ├─ profiles.* attribution columns (first-touch)
                                        └─ analytics_event_log (idempotent dedupe)
```

### Client vs server

- **Client (gtag):** GA bootstrap, optional `page_view`, `user_id` linker after login.
- **Server (Measurement Protocol):** all business conversions. Webhooks and server actions cannot rely on `window.gtag`.

## Attribution handoff (from marketing site)

Marketing site (`WerkOS - Site`):

1. Captures `gclid` / `gbraid` / `wbraid` / `utm_*` in **sessionStorage** on werkos.nl.
2. On Start gratis: appends those params to  
   `https://app.werkos.nl/nl/onboarding/account?...`
3. Fires `cta_start_free` + `signup_started`.

App:

1. Middleware (`src/proxy.ts`) reads query params and merges into httpOnly cookie `werkos_ft` (**first-touch: never overwrite set fields**).
2. Cookie TTL: **90 days**.
3. On successful `sign_up`, values are copied to `profiles` once (`first_touch_at`). Later visits cannot overwrite.

Accepted query params (must match site `ATTRIBUTION_PARAMS`):

`gclid`, `gbraid`, `wbraid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`

## Persistence

### `profiles` (first-touch + milestones)

- `acquisition_source`, `utm_*`, `gclid`, `wbraid`, `gbraid`, `first_touch_at`
- Milestone timestamps: `signup_at`, `company_created_at`, `first_project_at`, `first_quote_at`, `subscription_started_at`

### `organizations.subscription_started_at`

Guards paid conversion idempotency across Stripe webhook retries.

### `analytics_event_log`

Unique `dedupe_key` per logical conversion, e.g.:

- `sign_up:{user_id}`
- `company_created:{organization_id}`
- `first_project_created:{organization_id}`
- `first_quote_created:{organization_id}`
- `subscription_started:{organization_id}`

## GA4

- **Measurement ID:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` — **same value as werkos.nl**.
- **API secret:** `GA4_API_SECRET` (server-only Measurement Protocol).
- Cross-domain linker: `werkos.nl` + `app.werkos.nl`.
- **user_id:** Supabase auth UUID only (never email/name/phone/company name).

### Params sent to GA4 (examples)

Safe: `method`, `company_id`, `project_id`, `quote_id`, `subscription_status`  
Never: email, name, phone, address, quote/project free text.

## Duplicate prevention

| Event | Guard |
| --- | --- |
| All business events | `analytics_event_log.dedupe_key` unique |
| First project / quote | DB count for org must be exactly `1` **and** claim |
| Subscription | `organizations.subscription_started_at` set only when null **and** claim; only when status `active` |

Trial (`trialing`) does **not** fire `subscription_started`. Renewals / upgrades do not re-fire it.

## Google Ads (later)

Primary conversion to import from GA4: **`subscription_started`**.  
Secondary: `sign_up`, `company_created`, `first_project_created`, `first_quote_created`.  
Offline Conversion API is **out of scope** for this iteration; gclid is stored on the profile for a future upload path.

## SQL to apply

`docs/sql-applied/20260820120000_marketing_attribution.sql`

## Env (Vercel)

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...   # identical to marketing site
GA4_API_SECRET=...                    # Measurement Protocol secret
```

## Trigger map (code)

| Event | File |
| --- | --- |
| Attribution cookie | `src/proxy.ts` |
| `sign_up` | `src/features/auth/actions.ts` → `signUpAction` |
| `company_created` | `src/features/onboarding/actions.ts`, `provision.ts` |
| `first_project_created` | `src/app/api/projects/route.ts`, `src/app/api/opdrachten/complete/route.ts` |
| `first_quote_created` | `src/app/api/quotes/route.ts`, `src/app/api/opdrachten/complete/route.ts` |
| `subscription_started` | `src/features/onboarding/provision.ts` (Stripe sync / activate) |
