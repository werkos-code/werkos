"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/platform/admin", labelKey: "dashboard", exact: true },
  { href: "/platform/admin/accounts", labelKey: "accounts", exact: false },
  { href: "/platform/admin/gebruikers", labelKey: "users", exact: false },
  {
    href: "/platform/admin/administratie",
    labelKey: "administration",
    exact: false,
  },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminCockpitNav() {
  const pathname = usePathname();
  const t = useTranslations("platform.cockpit.nav");

  return (
    <nav
      className="flex max-w-full items-center gap-1 overflow-x-auto md:max-w-none"
      aria-label={t("aria")}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
              active
                ? "admin-cockpit-nav-active text-cyan-100"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {t(item.labelKey)}
            {active ? (
              <span
                className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 opacity-80"
                aria-hidden
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
