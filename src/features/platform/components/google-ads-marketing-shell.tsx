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

  if (variant === "administration") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CockpitKpi
          label={t("kpi.spend")}
          value={displayMoney(metrics.spendLabel)}
          source={tSource("googleAdsSpend")}
          muted={metrics.spendLabel == null}
        />
        <CockpitKpi
          label={t("kpi.clicks")}
          value={displayMetric(metrics.clicks)}
          source={tSource("googleAdsClicks")}
          muted={metrics.clicks == null}
        />
        <CockpitKpi
          label={t("kpi.impressions")}
          value={displayMetric(metrics.impressions)}
          source={tSource("googleAdsImpressions")}
          muted={metrics.impressions == null}
        />
        <CockpitKpi
          label={t("kpi.cpc")}
          value={displayMoney(metrics.cpcLabel)}
          source={tSource("googleAdsCpc")}
          muted={metrics.cpcLabel == null}
        />
        <CockpitKpi
          label={t("kpi.roas")}
          value={displayMetric(metrics.roas)}
          source={tSource("googleAdsRoas")}
          muted={metrics.roas == null}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <CockpitKpi
        label={t("kpi.spend")}
        value={displayMoney(metrics.spendLabel)}
        source={tSource("googleAdsSpend")}
        muted={metrics.spendLabel == null}
      />
      <CockpitKpi
        label={t("kpi.clicks")}
        value={displayMetric(metrics.clicks)}
        source={tSource("googleAdsClicks")}
        muted={metrics.clicks == null}
      />
      <CockpitKpi
        label={t("kpi.impressions")}
        value={displayMetric(metrics.impressions)}
        source={tSource("googleAdsImpressions")}
        muted={metrics.impressions == null}
      />
      <CockpitKpi
        label={t("kpi.cpc")}
        value={displayMoney(metrics.cpcLabel)}
        source={tSource("googleAdsCpc")}
        muted={metrics.cpcLabel == null}
      />
      <CockpitKpi
        label={t("kpi.roas")}
        value={displayMetric(metrics.roas)}
        source={tSource("googleAdsRoas")}
        muted={metrics.roas == null}
      />
      {attribution ? (
        <CockpitKpi
          label={t("kpi.gclidSignups")}
          value={String(attribution.signupsWithGclid)}
          source={tSource("gclidSignups")}
        />
      ) : null}
    </div>
  );
}
