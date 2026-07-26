# Documenten — backlog

> Laatst bijgewerkt: 2026-07-26  
> SQL: `docs/sql-applied/20260726270000_project_files.sql`  
> UI: `/documenten` · projecttab Bestanden · `src/features/files/`

## Afgerond (v1)

- [x] `file_folders` + `project_files` (project-gebonden)
- [x] Private Storage-bucket `project-files` (max 50 MB)
- [x] Centrale bibliotheek: projecten als rootmappen
- [x] Submappen (aanmaken; verwijderen alleen als leeg)
- [x] Upload / download (signed URL) / verwijderen
- [x] Projectdetail → tab Bestanden = zelfde workspace
- [x] Nav: Documenten onder sectie Documenten

## Bewust later

- [ ] Slimme mappen (voorstel bij werkzaamheid)
- [ ] Weergave vanuit werkzaamheid / offerte / factuur (geen tweede opslag)
- [ ] Preview / PDF-viewer
- [ ] Hernoemen bestanden, slepen tussen mappen
- [ ] Versies / delen met klantportaal
- [ ] Bulk-zip download

## Migratie

Al toegepast (archief):

`docs/sql-applied/20260726270000_project_files.sql`

Eerdere migraties staan gearchiveerd in `docs/sql-applied/` (reeds op productie gedraaid).
