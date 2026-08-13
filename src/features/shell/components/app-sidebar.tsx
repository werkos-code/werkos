"use client";

import { ChevronDown, Plus, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import { OrganizationSwitcher } from "@/features/shell/components/organization-switcher";
import {
  APP_NAV,
  NEW_REQUEST_HREF,
  PLATFORM_ADMIN_NAV,
  type ShellNavItem,
  type ShellNavSection,
} from "@/features/shell/nav-config";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  userName: string;
  organizationName?: string | null;
  isSuperAdmin?: boolean;
};

function isPathActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

function itemContainsActive(pathname: string, item: ShellNavItem) {
  if (item.href && isPathActive(pathname, item.href)) return true;
  return item.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
}

function sectionContainsActive(pathname: string, section: ShellNavSection) {
  return section.items.some((item) => itemContainsActive(pathname, item));
}

function NavItemLink({
  href,
  label,
  icon: Icon,
  active,
  nested = false,
}: {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg text-sm transition-colors",
        nested ? "px-2.5 py-1.5" : "px-2.5 py-2 font-medium",
        active
          ? "bg-white/10 font-medium text-white"
          : nested
            ? "text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground"
            : "text-sidebar-foreground/85 hover:bg-white/[0.06] hover:text-sidebar-foreground",
      )}
    >
      {active && !nested ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#3b82f6]"
        />
      ) : null}
      {Icon && !nested ? (
        <Icon className="size-4 shrink-0 opacity-80" />
      ) : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
}: {
  item: ShellNavItem;
  pathname: string;
}) {
  const t = useTranslations("shell");
  const hasChildren = Boolean(item.children?.length);
  const containsActive = itemContainsActive(pathname, item);
  const [manualOpen, setManualOpen] = useState(containsActive);
  const open = manualOpen || containsActive;

  if (!hasChildren && item.href) {
    return (
      <NavItemLink
        href={item.href}
        label={t(item.labelKey)}
        icon={item.icon}
        active={isPathActive(pathname, item.href)}
      />
    );
  }

  const Icon = item.icon;

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setManualOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          containsActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/85 hover:bg-white/[0.06] hover:text-sidebar-foreground",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 opacity-80" /> : null}
        <span className="flex-1 text-left">{t(item.labelKey)}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-sidebar-muted/80 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className="ml-3 space-y-0.5 border-l border-white/8 pl-2.5">
          {item.children?.map((child) => (
            <NavItemLink
              key={child.href}
              href={child.href}
              label={t(child.labelKey)}
              active={isPathActive(pathname, child.href)}
              nested
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavSection({
  section,
  pathname,
}: {
  section: ShellNavSection;
  pathname: string;
}) {
  const t = useTranslations("shell");
  const hasActive = sectionContainsActive(pathname, section);
  const collapsible = section.collapsible !== false;
  const [manualOpen, setManualOpen] = useState(
    section.defaultOpen !== false || hasActive,
  );
  const open = !collapsible || hasActive || manualOpen;

  return (
    <div
      className={cn(
        "space-y-1",
        section.dividerBefore && "border-t border-white/8 pt-4",
      )}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setManualOpen((value) => !value)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-left transition-colors hover:bg-white/[0.04]"
        >
          <span className="flex-1 text-[10px] font-medium tracking-[0.08em] text-sidebar-muted/70 uppercase">
            {t(`sections.${section.labelKey}`)}
          </span>
          <ChevronDown
            className={cn(
              "size-3 text-sidebar-muted/70 transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      ) : (
        <p className="px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] text-sidebar-muted/70 uppercase">
          {t(`sections.${section.labelKey}`)}
        </p>
      )}
      {open ? (
        <div className="space-y-0.5">
          {section.items.map((item) => (
            <NavGroup key={item.id} item={item} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({
  userName,
  organizationName,
  isSuperAdmin = false,
}: AppSidebarProps) {
  const t = useTranslations("shell");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const sections = [
    ...APP_NAV,
    ...(isSuperAdmin ? [PLATFORM_ADMIN_NAV] : []),
  ];

  const initials = useMemo(() => {
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "W";
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }, [userName]);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-[var(--sidebar-width)] flex-col rounded-tr-3xl rounded-br-3xl bg-sidebar text-sidebar-foreground"
      aria-label={t("navLabel")}
    >
      <div className="flex flex-col gap-5 px-4 pt-6 pb-4">
        <OrganizationSwitcher organizationName={organizationName} />

        <Button
          asChild
          className="h-10 w-full justify-center gap-2 rounded-xl border-0 bg-linear-to-r from-[#2563EB] to-[#60A5FA] text-sm font-medium text-white shadow-none hover:from-[#1D4ED8] hover:to-[#3B82F6]"
        >
          <Link href={NEW_REQUEST_HREF}>
            <Plus className="size-4" />
            {t("newRequest")}
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <NavSection
            key={section.id}
            section={section}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="mt-auto px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
          <Avatar className="size-8 after:border-white/10">
            <AvatarFallback className="bg-white/12 text-[11px] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">
              {userName}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-sidebar-muted hover:bg-white/10 hover:text-white"
                aria-label={t("accountMenu")}
              >
                <Settings className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/instellingen/bedrijf">{t("companyProfile")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/instellingen/account">{t("settingsAccount")}</Link>
                </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/instellingen/abonnement">
                  {t("settingsBilling")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void (async () => {
                    await logoutAction();
                    router.replace("/login");
                  })();
                }}
              >
                {tAuth("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
