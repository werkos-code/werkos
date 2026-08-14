"use client";

import { useTranslations } from "next-intl";

import { AppPageHeader } from "@/features/shell/components/app-page-header";
import { PageCard } from "@/features/shell/components/page-card";
import { navLabelKeyForPathname } from "@/features/shell/nav-config";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

/**
 * Instant navigation fallback: header chrome + list-page skeleton.
 * Sidebar stays mounted in the layout; only the page slot swaps to this.
 */
export function PageSkeleton() {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const labelKey = navLabelKeyForPathname(pathname);
  const title = labelKey ? t(labelKey) : t("pageLoading");

  return (
    <div
      className="flex min-h-dvh flex-col bg-background"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative">
        <AppPageHeader title={title} />
        <div className="page-skeleton-progress" aria-hidden>
          <span />
        </div>
      </div>
      <div className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-[90%] space-y-5">
          <span className="sr-only">{t("pageLoading")}</span>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <PageCard key={i} className="px-4 py-3">
                <Pulse className="h-2.5 w-16" />
                <Pulse className="mt-2 h-5 w-24" />
              </PageCard>
            ))}
          </div>
          <PageCard className="flex items-center gap-3 p-3">
            <Pulse className="h-9 w-56 max-w-[50%]" />
            <Pulse className="h-9 w-28" />
            <Pulse className="h-9 w-28" />
          </PageCard>
          <PageCard className="overflow-hidden">
            <div className="flex gap-8 border-b border-border/70 px-5 py-3">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-3 w-20" />
              <Pulse className="h-3 w-28" />
              <Pulse className="h-3 w-16" />
            </div>
            <div className="divide-y divide-border/40">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-8 px-5 py-4"
                >
                  <Pulse className="h-4 w-[28%]" />
                  <Pulse className="h-4 w-[18%]" />
                  <Pulse className="h-4 w-[22%]" />
                  <Pulse className="ml-auto h-4 w-12" />
                </div>
              ))}
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  );
}
