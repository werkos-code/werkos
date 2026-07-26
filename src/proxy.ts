import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { APP_HOME_HREF } from "@/features/shell/nav-config";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/onboarding/account",
  "/onboarding/company",
  "/onboarding/team",
  "/onboarding/payment",
  "/onboarding/provisioning",
  "/onboarding/complete",
];

/** Flat app-shell route prefixes (single context). */
const APP_SHELL_PREFIXES = [
  "/dashboard",
  "/projecten",
  "/planning",
  "/werkzaamheden",
  "/werkbonnen",
  "/facturen",
  "/offertes",
  "/klanten",
  "/personeel",
  "/leveranciers",
  "/onderaannemers",
  "/materiaal",
  "/inbox",
  "/rapportages",
  "/financien",
  "/instellingen",
  "/aanvragen",
  "/platform",
] as const;

/**
 * Legacy path redirects → flat app paths (bookmarks / deep links).
 */
const LEGACY_REDIRECTS: Array<{ from: RegExp; to: string | ((match: RegExpMatchArray) => string) }> = [
  { from: /^\/werk$/, to: APP_HOME_HREF },
  { from: /^\/bedrijf$/, to: APP_HOME_HREF },
  { from: /^\/werk\/projecten\/werkbonnen(.*)$/, to: "/werkbonnen$1" },
  { from: /^\/werk\/projecten\/facturen(.*)$/, to: "/facturen$1" },
  { from: /^\/werk\/projecten\/offertes(.*)$/, to: "/offertes$1" },
  { from: /^\/werk\/projecten(.*)$/, to: "/projecten$1" },
  { from: /^\/werk\/planning(.*)$/, to: "/planning$1" },
  { from: /^\/werk\/aanvragen(.*)$/, to: "/aanvragen$1" },
  { from: /^\/werk\/inbox(.*)$/, to: "/inbox$1" },
  { from: /^\/werk\/materiaal(.*)$/, to: "/materiaal$1" },
  { from: /^\/werk\/personen\/klanten(.*)$/, to: "/klanten$1" },
  { from: /^\/werk\/personen\/leveranciers(.*)$/, to: "/leveranciers$1" },
  { from: /^\/werk\/personen\/onderaannemers(.*)$/, to: "/onderaannemers$1" },
  { from: /^\/bedrijf\/klanten(.*)$/, to: "/klanten$1" },
  { from: /^\/bedrijf\/rapportages(.*)$/, to: "/rapportages$1" },
  { from: /^\/bedrijf\/financien(.*)$/, to: "/financien$1" },
  { from: /^\/bedrijf\/instellingen(.*)$/, to: "/instellingen$1" },
];

function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  if (parts.length >= 2 && routing.locales.includes(parts[1] as never)) {
    const rest = "/" + parts.slice(2).join("/");
    return rest === "/" ? "/" : rest.replace(/\/$/, "") || "/";
  }
  return pathname;
}

function isAppShellPath(pathWithoutLocale: string) {
  return APP_SHELL_PREFIXES.some(
    (prefix) =>
      pathWithoutLocale === prefix ||
      pathWithoutLocale.startsWith(`${prefix}/`),
  );
}

function legacyRedirectTarget(pathWithoutLocale: string): string | null {
  for (const rule of LEGACY_REDIRECTS) {
    const match = pathWithoutLocale.match(rule.from);
    if (!match) continue;
    if (typeof rule.to === "function") return rule.to(match);
    return pathWithoutLocale.replace(rule.from, rule.to);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isServerAction =
    request.method === "POST" &&
    (request.headers.has("next-action") ||
      request.headers.has("Next-Action"));
  if (isServerAction) {
    const { response } = await updateSession(request);
    return response;
  }

  const i18nResponse = handleI18n(request);
  const { response, user } = await updateSession(request, i18nResponse);

  const pathWithoutLocale = stripLocale(pathname);
  const locale =
    routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ??
    routing.defaultLocale;

  const legacyTarget = legacyRedirectTarget(pathWithoutLocale);
  if (legacyTarget) {
    return NextResponse.redirect(
      new URL(`/${locale}${legacyTarget}`, request.url),
    );
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  if (user && pathWithoutLocale === "/") {
    return NextResponse.redirect(
      new URL(`/${locale}${APP_HOME_HREF}`, request.url),
    );
  }

  const isAppShell = isAppShellPath(pathWithoutLocale);

  if (isAppShell && !user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (user && pathWithoutLocale === "/login") {
    return NextResponse.redirect(
      new URL(`/${locale}${APP_HOME_HREF}`, request.url),
    );
  }

  const onboardingNeedsAuth =
    pathWithoutLocale.startsWith("/onboarding/") &&
    pathWithoutLocale !== "/onboarding" &&
    pathWithoutLocale !== "/onboarding/account";

  if (onboardingNeedsAuth && !user) {
    return NextResponse.redirect(new URL(`/${locale}/onboarding/account`, request.url));
  }

  if (!isPublic && !isAppShell && !user) {
    // Unknown private routes
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
