import { getTranslations } from "next-intl/server";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  context: "werk" | "bedrijf";
  organizationName?: string | null;
};

export async function AppShell({
  children,
  context,
  organizationName,
}: AppShellProps) {
  const t = await getTranslations("shell");

  const werkLinks = [
    { href: "/werk" as const, label: t("dashboard") },
    { href: "/werk/projecten" as const, label: t("projects") },
    { href: "/werk/planning" as const, label: t("planning") },
  ];

  const bedrijfLinks = [
    { href: "/bedrijf" as const, label: t("dashboard") },
    { href: "/bedrijf/klanten" as const, label: t("customers") },
    { href: "/bedrijf/financien" as const, label: t("finance") },
    { href: "/bedrijf/instellingen" as const, label: t("settings") },
  ];

  const links = context === "werk" ? werkLinks : bedrijfLinks;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-tight">WerkOS</span>
            <nav className="flex rounded-full bg-muted p-1 text-sm">
              <Link
                href="/werk"
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  context === "werk"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("werk")}
              </Link>
              <Link
                href="/bedrijf"
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  context === "bedrijf"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("bedrijf")}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {organizationName ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {organizationName}
              </span>
            ) : null}
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-6xl gap-4 overflow-x-auto px-4 pb-3 sm:px-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}
