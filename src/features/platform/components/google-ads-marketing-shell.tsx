import { getTranslations } from "next-intl/server";

import type {
  GoogleAdsAttributionMetrics,
  GoogleAdsPlatformMetrics,
} from "@/features/platform/lib/google-ads-platform-metrics";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";

type GoogleAdsMarketingShellProps = {
  metrics: GoogleAdsPlatformMetrics;
  attribution?: GoogleAdsAttributionMetrics;
  variant?: "dashboard" | "administration";
};

function displayMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return String(value);
}

function displayMoney(label: string | null): string {
  return label ?? "—";
}

export async function GoogleAdsMarketingShell({
  metrics,
  attribution,
  variant = "dashboard",
}: GoogleAdsMarketingShellProps) {
  const t = await getTranslations(
    variant === "administration"
      ? "platform.administration.googleAds"
      : "platform.dashboard.googleAds",
  );

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-foreground">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>

      {!metrics.configured ? (
        <PageCard className="px-5 py-4 text-sm text-muted-foreground">
          {t("notConfigured")}
        </PageCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetaStatCard
          label={t("kpi.spend")}
          value={displayMoney(metrics.spendLabel)}
          muted={metrics.spendLabel == null}
        />
        <MetaStatCard
          label={t("kpi.clicks")}
          value={displayMetric(metrics.clicks)}
          muted={metrics.clicks == null}
        />
        <MetaStatCard
          label={t("kpi.impressions")}
          value={displayMetric(metrics.impressions)}
          muted={metrics.impressions == null}
        />
        <MetaStatCard
          label={t("kpi.cpc")}
          value={displayMoney(metrics.cpcLabel)}
          muted={metrics.cpcLabel == null}
        />
        <MetaStatCard
          label={t("kpi.roas")}
          value={displayMetric(metrics.roas)}
          muted={metrics.roas == null}
        />
      </div>

      {variant === "administration" ? (
        <PageCard className="px-5 py-4 text-sm text-muted-foreground">
          {t("exportPending")}
        </PageCard>
      ) : null}

      {attribution ? (
        <PageCard className="space-y-2 px-5 py-4">
          <p className="text-sm font-medium text-foreground">
            {t("attributionTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("attributionHint")}</p>
          <p className="text-sm text-foreground">
            {t("attributionSignups", {
              count: attribution.signupsWithGclid,
            })}
          </p>
        </PageCard>
      ) : null}
    </section>
  );
}
