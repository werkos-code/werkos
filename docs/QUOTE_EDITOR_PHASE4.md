# Offerte-editor — Fase 4 (voorbeeld / versturen)

> Laatst bijgewerkt: 2026-07-27  
> Geen nieuwe SQL.

## Opgeleverd

- Staff-voorbeeldpagina: `/projecten/[projectId]/offertes/[quoteId]/voorbeeld`
- Printbaar document (browser **Afdrukken / PDF**)
- Headerknop **Voorbeeld** opent het voorbeeld
- **Versturen** blijft status `sent`; bij klant-e-mail optioneel `mailto:` openen
- Voorbeeld toont org-naam, klant, regels, totalen, betaaltermijn/voorwaarden, externe notities

## Bewust nog niet

- Server-side PDF (react-pdf / puppeteer)
- Echte e-mailprovider (Resend e.d.)
- Publieke klantlink / portal
- Org-briefpapier (adres, KvK, logo)

## Volgende

- [x] Zelfde preview-patroon voor facturen → [`INVOICE_EDITOR_PHASE6.md`](./INVOICE_EDITOR_PHASE6.md)
- Optioneel: echte mail-integratie
- Logo-upload
