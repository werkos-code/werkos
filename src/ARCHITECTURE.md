/**

- Architecture map for WerkOS.
-
- src/
- ├── app/ Next.js App Router (routes, layouts, pages)
- ├── components/ Shared UI (shadcn in ui/, cross-feature components above)
- ├── config/ App constants (roles, site metadata)
- ├── features/ Domain modules (projects, planning, invoices, …)
- ├── hooks/ Shared React hooks
- ├── lib/ Infrastructure (env, supabase, utils)
- ├── providers/ App-wide client providers
- ├── services/ Shared server-side service layer (cross-feature)
- ├── types/ Shared TypeScript types
- └── utils/ Pure helpers (formatting, etc.)
-
- Rules of thumb:
- - Prefer feature modules over dumping logic into lib/
- - Everything business-related is organization-scoped
- - Server Components by default; Client Components only when needed
    */
