"use client";

import {
  Euro,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatEurFromCents } from "@/config/pricing";
import {
  DashboardEmptyCta,
  DashboardSurface,
} from "@/features/dashboard/components/dashboard-surface";
import type { DashboardKpis } from "@/features/dashboard/dashboard-actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type KpiKey = "revenue" | "openQuotes" | "openInbox";

const KPI_META: Record<
  KpiKey,
  { icon: LucideIcon; href: string; emptyHref: string }
> = {
  revenue: {
    icon: Euro,
    href: "/rapportages",
    emptyHref: "/facturen",
  },
  openQuotes: {
    icon: FileText,
    href: "/offertes",
    emptyHref: "/offertes",
  },
  openInbox: {
    icon: Inbox,
    href: "/inbox",
    emptyHref: "/inbox",
  },
};

export function DashboardKpiStrip({ kpis }: { kpis: DashboardKpis }) {
  const t = useTranslations("dashboard.kpis");
  const locale = useLocale();

  const cards: Array<{
    key: KpiKey;
    value: string;
    raw: number;
  }> = [
    {
      key: "revenue",
      value: formatEurFromCents(kpis.revenueCents, locale),
      raw: kpis.revenueCents,
    },
    {
      key: "openQuotes",
      value: String(kpis.openQuotesCount),
      raw: kpis.openQuotesCount,
    },
    {
      key: "openInbox",
      value: String(kpis.openInboxCount),
      raw: kpis.openInboxCount,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const meta = KPI_META[card.key];
        const Icon = meta.icon;
        const isEmpty = card.raw === 0;

        if (isEmpty) {
          return (
            <DashboardSurface
              key={card.key}
              className="flex min-h-[9.5rem] flex-col"
            >
              <DashboardEmptyCta
                icon={Icon}
                title={t(`${card.key}.emptyTitle`)}
                description={t(`${card.key}.emptyDescription`)}
                ctaLabel={t(`${card.key}.cta`)}
                href={meta.emptyHref}
              />
            </DashboardSurface>
          );
        }

        return (
          <Link key={card.key} href={meta.href} className="group block">
            <DashboardSurface className="relative min-h-[9.5rem] p-5 transition-colors group-hover:bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t(`${card.key}.label`)}
                </p>
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-6 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(`${card.key}.hint`)}
              </p>
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100",
                )}
              />
            </DashboardSurface>
          </Link>
        );
      })}
    </div>
  );
}
