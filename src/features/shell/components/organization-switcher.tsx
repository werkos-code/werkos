"use client";

import { ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type OrganizationSwitcherProps = {
  organizationName?: string | null;
  className?: string;
};

/**
 * UI placeholder for multi-org switching. Single-org for now.
 */
export function OrganizationSwitcher({
  organizationName,
  className,
}: OrganizationSwitcherProps) {
  const t = useTranslations("shell");
  const name = organizationName?.trim() || t("organizationFallback");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex w-full items-start gap-2 rounded-xl px-1 py-1 text-left outline-none",
          "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/20",
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <Image
            src="/brand/werkos-logo.png"
            alt={siteConfig.name}
            width={300}
            height={63}
            priority
            className="h-7 w-auto max-w-[11.5rem] object-contain object-left"
          />
          <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-sidebar-muted">
            <span className="truncate">{name}</span>
            <ChevronsUpDown className="size-3 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
          </p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <span className="text-muted-foreground text-xs">
            {t("organizationLabel")}
          </span>
          <p className="mt-0.5 truncate text-sm font-medium">{name}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>{t("organizationCurrent")}</DropdownMenuItem>
        <DropdownMenuItem disabled>{t("organizationSoon")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
