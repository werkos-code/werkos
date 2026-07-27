# Open setup & acties

> Handmatige stappen die nog gedaan moeten worden. Agents: herinner de gebruiker hieraan bij materiaal/inkoop-werk.

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
