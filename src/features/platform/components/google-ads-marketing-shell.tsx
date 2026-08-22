import { getTranslations } from "next-intl/server";

import type {
  GoogleAdsAttributionMetrics,
  GoogleAdsPlatformMetrics,
} from "@/features/platform/lib/google-ads-platform-metrics";
import { CockpitKpi } from "@/features/platform/components/cockpit/admin-cockpit-ui";

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

const ADS_KPIS = [
  { key: "spend", accent: "orange" as const, money: true },
  { key: "clicks", accent: "cyan" as const, money: false },
  { key: "impressions", accent: "blue" as const, money: false },
  { key: "cpc", accent: "violet" as const, money: true },
  { key: "roas", accent: "emerald" as const, money: false },
] as const;

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
  const tSource = await getTranslations("platform.dashboard.sources");

  const gridClass =
    variant === "administration"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      : "grid gap-4 sm:grid-cols-2 lg:grid-cols-6";

  return (
    <div className={gridClass}>
      {ADS_KPIS.map((kpi) => (
        <CockpitKpi
          key={kpi.key}
          label={t(`kpi.${kpi.key}`)}
          value={
            kpi.money
              ? displayMoney(
                  kpi.key === "spend"
                    ? metrics.spendLabel
                    : kpi.key === "cpc"
                      ? metrics.cpcLabel
                      : null,
                )
              : displayMetric(
                  kpi.key === "clicks"
                    ? metrics.clicks
                    : kpi.key === "impressions"
                      ? metrics.impressions
                      : metrics.roas,
                )
          }
          source={tSource(
            kpi.key === "spend"
              ? "googleAdsSpend"
              : kpi.key === "clicks"
                ? "googleAdsClicks"
                : kpi.key === "impressions"
                  ? "googleAdsImpressions"
                  : kpi.key === "cpc"
                    ? "googleAdsCpc"
                    : "googleAdsRoas",
          )}
          muted={
            kpi.key === "spend"
              ? metrics.spendLabel == null
              : kpi.key === "clicks"
                ? metrics.clicks == null
                : kpi.key === "impressions"
                  ? metrics.impressions == null
                  : kpi.key === "cpc"
                    ? metrics.cpcLabel == null
                    : metrics.roas == null
          }
          accent={kpi.accent}
        />
      ))}
      {variant === "dashboard" && attribution ? (
        <CockpitKpi
          label={t("kpi.gclidSignups")}
          value={String(attribution.signupsWithGclid)}
          source={tSource("gclidSignups")}
          accent="indigo"
        />
      ) : null}
    </div>
  );
}
