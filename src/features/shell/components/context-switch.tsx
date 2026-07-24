"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ShellContext } from "@/features/shell/nav-config";

type ContextSwitchProps = {
  context: ShellContext;
  werkLabel: string;
  bedrijfLabel: string;
};

export function ContextSwitch({
  context,
  werkLabel,
  bedrijfLabel,
}: ContextSwitchProps) {
  return (
    <div
      className="grid grid-cols-2 rounded-lg bg-white/10 p-1 ring-1 ring-white/10"
      role="tablist"
      aria-label="Context"
    >
      <Link
        href="/werk"
        role="tab"
        aria-selected={context === "werk"}
        className={cn(
          "rounded-md px-3 py-1.5 text-center text-[13px] font-medium transition-colors",
          context === "werk"
            ? "bg-white text-[#09133a] shadow-sm"
            : "text-sidebar-muted hover:text-sidebar-foreground",
        )}
      >
        {werkLabel}
      </Link>
      <Link
        href="/bedrijf"
        role="tab"
        aria-selected={context === "bedrijf"}
        className={cn(
          "rounded-md px-3 py-1.5 text-center text-[13px] font-medium transition-colors",
          context === "bedrijf"
            ? "bg-white text-[#09133a] shadow-sm"
            : "text-sidebar-muted hover:text-sidebar-foreground",
        )}
      >
        {bedrijfLabel}
      </Link>
    </div>
  );
}
