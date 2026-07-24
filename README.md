# WerkOS

Operational platform for project-based companies. Everything revolves around the project.

**Stack:** Next.js · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase · Vercel

## Getting started

```bash
cp .env.example .env.local
# Fill in Supabase credentials from your project settings

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start development server (Turbopack) |
| `npm run build`     | Production build                     |
| `npm run start`     | Start production server              |
| `npm run lint`      | ESLint                               |
| `npm run format`    | Prettier write                       |
| `npm run typecheck` | TypeScript check                     |

## Architecture

See [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md).

```
src/
├── app/           # Routes (App Router)
├── components/ui/ # shadcn primitives
├── config/        # Roles, site config
├── features/      # Domain modules (empty for now)
├── hooks/         # Shared hooks
├── lib/           # Env + Supabase clients
├── providers/     # App-wide providers
├── services/      # Shared server services
├── types/         # Shared types
└── utils/         # Pure helpers
```

## Multi-tenancy & roles

Every customer company is an **organization**. Business data is organization-scoped via **memberships**.

| Role | Scope | Notes |
| --- | --- | --- |
| `super_admin` | Platform | WerkOS internal; can access orgs for support |
| `owner` | Organization | Exactly one per org; user may own multiple orgs |
| `office_employee` | Organization | Staff; exactly one organization |
| `field_employee` | Organization | Field staff; exactly one organization |
| `customer` | Organization | Portal; user may be customer of multiple orgs |

Product docs (source of truth for domain language): [`docs/`](docs/). Start with [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

## Environment

| Variable                        | Scope  | Purpose                       |
| ------------------------------- | ------ | ----------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Client | App URL                       |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client | Supabase project URL          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Anon key (RLS)                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server | Admin / bypass RLS            |
| `SKIP_ENV_VALIDATION`           | Either | Set to `1` to skip validation |

Validated via `@t3-oss/env-nextjs` in `src/lib/env.ts`.

## Current status

Phase 1 in progress: auth, multi-step onboarding, Stripe trial, Werk/Bedrijf shell.

Setup instructions: [`docs/PHASE1_SETUP.md`](docs/PHASE1_SETUP.md).

Live: [https://app.werkos.nl](https://app.werkos.nl) (default locale `/nl`).
