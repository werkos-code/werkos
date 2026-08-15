"use client";

import { Euro, FileText, Inbox, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { formatEurFromCents } from "@/config/pricing";
import { DashboardSurface } from "@/features/dashboard/components/dashboard-surface";
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
    <div className="grid items-stretch gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const meta = KPI_META[card.key];
        const Icon = meta.icon;
        const isEmpty = card.raw === 0;
        const href = isEmpty ? meta.emptyHref : meta.href;

        return (
          <Link key={card.key} href={href} className="group block h-full">
            <DashboardSurface className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase transition-colors group-hover:text-primary">
                  {t(`${card.key}.label`)}
                </p>
                {!isEmpty ? (
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                ) : (
                  <span className="size-9 shrink-0" aria-hidden />
                )}
              </div>
              <p className="mt-6 text-3xl font-semibold tracking-tight tabular-nums text-foreground transition-colors group-hover:text-primary">
                {isEmpty ? "—" : card.value}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs transition-colors",
                  isEmpty
                    ? "text-primary group-hover:underline"
                    : "text-muted-foreground group-hover:text-primary",
                )}
              >
                {isEmpty ? t(`${card.key}.cta`) : t(`${card.key}.hint`)}
              </p>
            </DashboardSurface>
          </Link>
        );
      })}
    </div>
  );
}
