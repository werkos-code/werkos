import { getTranslations } from "next-intl/server";

import type {
  GoogleAdsAttributionMetrics,
  GoogleAdsPlatformMetrics,
} from "@/features/platform/lib/google-ads-platform-metrics";
import {
  CockpitAlert,
  CockpitCard,
  CockpitKpi,
  CockpitSection,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";

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
    <CockpitSection title={t("title")} hint={t("hint")}>
      {!metrics.configured ? (
        <CockpitAlert>{t("notConfigured")}</CockpitAlert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CockpitKpi
          label={t("kpi.spend")}
          value={displayMoney(metrics.spendLabel)}
          muted={metrics.spendLabel == null}
        />
        <CockpitKpi
          label={t("kpi.clicks")}
          value={displayMetric(metrics.clicks)}
          muted={metrics.clicks == null}
        />
        <CockpitKpi
          label={t("kpi.impressions")}
          value={displayMetric(metrics.impressions)}
          muted={metrics.impressions == null}
        />
        <CockpitKpi
          label={t("kpi.cpc")}
          value={displayMoney(metrics.cpcLabel)}
          muted={metrics.cpcLabel == null}
        />
        <CockpitKpi
          label={t("kpi.roas")}
          value={displayMetric(metrics.roas)}
          muted={metrics.roas == null}
        />
      </div>

      {variant === "administration" ? (
        <CockpitAlert>{t("exportPending")}</CockpitAlert>
      ) : null}

      {attribution ? (
        <CockpitCard className="space-y-2 px-5 py-4">
          <p className="text-sm font-medium text-slate-200">
            {t("attributionTitle")}
          </p>
          <p className="text-sm text-slate-400">{t("attributionHint")}</p>
          <p className="text-2xl font-light tabular-nums text-cyan-100">
            {t("attributionSignups", {
              count: attribution.signupsWithGclid,
            })}
          </p>
        </CockpitCard>
      ) : null}
    </CockpitSection>
  );
}
