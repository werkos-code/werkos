import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

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

function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  // "", "nl", "rest"...
  if (parts.length >= 2 && routing.locales.includes(parts[1] as never)) {
    const rest = "/" + parts.slice(2).join("/");
    return rest === "/" ? "/" : rest.replace(/\/$/, "") || "/";
  }
  return pathname;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes must never get a locale redirect (Stripe webhooks cannot follow 307).
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const i18nResponse = handleI18n(request);
  const { response, user } = await updateSession(request, i18nResponse);

  const pathWithoutLocale = stripLocale(pathname);
  const locale =
    routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ??
    routing.defaultLocale;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );

  // Authenticated users hitting marketing home → app (org check happens in layouts)
  if (user && pathWithoutLocale === "/") {
    return NextResponse.redirect(new URL(`/${locale}/werk`, request.url));
  }

  // Protected app areas
  const isAppShell =
    pathWithoutLocale.startsWith("/werk") ||
    pathWithoutLocale.startsWith("/bedrijf") ||
    pathWithoutLocale.startsWith("/platform");

  if (isAppShell && !user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Logged-in users should not stay on login
  if (user && pathWithoutLocale === "/login") {
    return NextResponse.redirect(new URL(`/${locale}/werk`, request.url));
  }

  // Onboarding after account requires auth (except welcome + account)
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
