# Offerte-editor — fase 7: logo + dupliceren

> Datum: 2026-07-28  
> Scope: org-logo op briefpapier + header-actie **Dupliceren**

## Afgerond

- [x] `organizations.logo_path` + public bucket `organization-logos`
- [x] Upload/verwijderen via `/api/organization/logo` (FormData)
- [x] Bedrijfsgegevens-formulier: logo-sectie
- [x] Logo op offerte- en factuurvoorbeeld
- [x] Header `⋯` → dropdown met **Dupliceren**
- [x] `POST /api/quotes/[quoteId]/duplicate` (regels + billing phases, status concept)

## SQL (Supabase)

Voer uit: `docs/sql-applied/20260728100000_organization_logo.sql`

## Bewust nog niet

- Overige `⋯`-acties (annuleren-shortcut, export)
- Bijlagen, echte e-mailprovider
- Offerte-niveau korting

## Volgende

- Bijlagen upload op offerte, of factuur vanuit geaccepteerde offerte
