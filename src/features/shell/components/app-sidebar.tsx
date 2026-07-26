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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import { ContextSwitch } from "@/features/shell/components/context-switch";
import {
  BEDRIJF_NAV,
  NEW_REQUEST_HREF,
  PLATFORM_ADMIN_NAV,
  WERK_NAV,
  type ShellContext,
  type ShellNavItem,
} from "@/features/shell/nav-config";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  context: ShellContext;
  userName: string;
  organizationName?: string | null;
  isSuperAdmin?: boolean;
};

function isPathActive(pathname: string, href: string) {
  return pathname === href;
}

function itemContainsActive(pathname: string, item: ShellNavItem) {
  if (item.href && isPathActive(pathname, item.href)) return true;
  return item.children?.some((child) => isPathActive(pathname, child.href)) ?? false;
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
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const open = manualOpen ?? (item.defaultOpen || containsActive);

  if (!hasChildren && item.href) {
    const Icon = item.icon;
    const active = isPathActive(pathname, item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
          active
            ? "bg-white text-[#09133a]"
            : "text-sidebar-foreground/90 hover:bg-white/10 hover:text-sidebar-foreground",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 opacity-90" /> : null}
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  }

  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
          containsActive
            ? "text-sidebar-foreground"
            : "text-sidebar-foreground/90 hover:bg-white/10 hover:text-sidebar-foreground",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 opacity-90" /> : null}
        <span className="flex-1 text-left">{t(item.labelKey)}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-sidebar-muted transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open ? (
        <div className="mt-0.5 ml-4 space-y-0.5 border-l border-sidebar-border pl-2.5">
          {item.children?.map((child) => {
            const active = isPathActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-sidebar-muted hover:bg-white/10 hover:text-sidebar-foreground",
                )}
              >
                {t(child.labelKey)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({
  context,
  userName,
  organizationName,
  isSuperAdmin = false,
}: AppSidebarProps) {
  const t = useTranslations("shell");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const router = useRouter();
  const sections = [
    ...(context === "werk" ? WERK_NAV : BEDRIJF_NAV),
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
      className="fixed top-3 bottom-3 left-3 z-40 flex w-[var(--sidebar-width)] flex-col rounded-2xl rounded-tr-3xl rounded-br-3xl bg-sidebar text-sidebar-foreground"
      aria-label="Hoofdnavigatie"
    >
      <div className="flex flex-col gap-5 px-4 pt-5 pb-4">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white">
            WerkOS
          </p>
          {organizationName ? (
            <p className="mt-0.5 truncate text-xs text-sidebar-muted">
              {organizationName}
            </p>
          ) : null}
        </div>

        <ContextSwitch
          context={context}
          werkLabel={t("werk")}
          bedrijfLabel={t("bedrijf")}
        />

        {context === "werk" ? (
          <Button
            asChild
            className="h-10 w-full justify-center gap-2 rounded-xl border-0 bg-linear-to-r from-[#13265f] to-[#3b82f6] text-sm font-medium text-white shadow-none hover:from-[#1a3178] hover:to-[#60a5fa]"
          >
            <Link href={NEW_REQUEST_HREF}>
              <Plus className="size-4" />
              {t("newRequest")}
            </Link>
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((section, index) => (
          <div key={section.id}>
            {index > 0 ? (
              <div className="mx-2 my-3 h-px bg-sidebar-border" />
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavGroup key={item.id} item={item} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-3 py-3">
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
            <DropdownMenuContent align="end" side="top" className="w-44">
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
