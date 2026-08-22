import { getTranslations } from "next-intl/server";

import type { PlatformDashboardData } from "@/features/platform/platform-dashboard-actions";
import { GoogleAdsMarketingShell } from "@/features/platform/components/google-ads-marketing-shell";
import {
  CockpitAlert,
  CockpitCard,
  CockpitKpi,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
import type { SubscriptionStatus } from "@/types/database";

type AdminDashboardPanelProps = {
  dashboard: PlatformDashboardData;
};

const SUBSCRIPTION_STATUS_ORDER: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete",
  "incomplete_expired",
];

function displayMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return String(value);
}

function displayMoney(label: string | null): string {
  return label ?? "—";
}

export async function AdminDashboardPanel({
  dashboard,
}: AdminDashboardPanelProps) {
  const t = await getTranslations("platform.dashboard");
  const tBilling = await getTranslations("billingSettings.status");
  const tSource = await getTranslations("platform.dashboard.sources");

  const funnelSteps = [
    { key: "signups", value: dashboard.funnel.signups },
    { key: "companiesCreated", value: dashboard.funnel.companiesCreated },
    { key: "firstProject", value: dashboard.funnel.firstProject },
    { key: "firstQuote", value: dashboard.funnel.firstQuote },
    { key: "paidSubscriptions", value: dashboard.funnel.paidSubscriptions },
  ] as const;

  return (
    <div className="space-y-8">
      {dashboard.stripe.error ? (
        <CockpitAlert variant="error">
          {t("stripeError", { message: dashboard.stripe.error })}
        </CockpitAlert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <CockpitKpi
          label={t("kpi.mrr")}
          value={displayMoney(dashboard.stripe.mrrLabel)}
          source={tSource("mrr")}
          muted={dashboard.stripe.mrrLabel == null}
          variant="hero"
          accent="cyan"
        />
        <CockpitKpi
          label={t("kpi.stripeBalance")}
          value={displayMoney(dashboard.stripe.balanceLabel)}
          source={tSource("stripeBalance")}
          muted={dashboard.stripe.balanceLabel == null}
          variant="hero"
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CockpitKpi
          label={t("kpi.arr")}
          value={displayMoney(dashboard.stripe.arrLabel)}
          source={tSource("arr")}
          muted={dashboard.stripe.arrLabel == null}
          accent="blue"
        />
        <CockpitKpi
          label={t("kpi.ltv")}
          value={displayMoney(dashboard.secondary.ltvLabel)}
          source={tSource("ltv")}
          muted={dashboard.secondary.ltvLabel == null}
        />
        <CockpitKpi
          label={t("kpi.cac")}
          value={displayMoney(dashboard.secondary.cacLabel)}
          source={tSource("cac")}
          muted={dashboard.secondary.cacLabel == null}
        />
        <CockpitKpi
          label={t("kpi.churn")}
          value={dashboard.secondary.churnLabel ?? "—"}
          source={tSource("churn")}
          muted={dashboard.secondary.churnLabel == null}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CockpitKpi
          label={t("kpi.activeSubscriptions")}
          value={displayMetric(dashboard.stripe.activeSubscriptions)}
          source={tSource("activeSubscriptions")}
          muted={dashboard.stripe.activeSubscriptions == null}
        />
        <CockpitKpi
          label={t("kpi.canceledLast30Days")}
          value={displayMetric(dashboard.stripe.canceledLast30Days)}
          source={tSource("canceledLast30Days")}
          muted={dashboard.stripe.canceledLast30Days == null}
        />
        <CockpitKpi
          label={t("kpi.monthlyCosts")}
          value={displayMoney(dashboard.secondary.monthlyCostsLabel)}
          source={tSource("monthlyCosts")}
          muted={dashboard.secondary.monthlyCostsLabel == null}
        />
      </div>

      <GoogleAdsMarketingShell
        metrics={dashboard.googleAds}
        attribution={dashboard.attribution}
      />

      <CockpitCard className="overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="overflow-x-auto border-b border-white/10 lg:border-r lg:border-b-0">
            <table className="data-table min-w-[16rem]">
              <thead>
                <tr>
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.count")}</th>
                </tr>
              </thead>
              <tbody>
                {SUBSCRIPTION_STATUS_ORDER.map((status) => (
                  <tr key={status}>
                    <td className="text-slate-100">{tBilling(status)}</td>
                    <td className="text-slate-400">
                      {dashboard.subscriptions[status]}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="text-slate-100">{t("status.missing")}</td>
                  <td className="text-slate-400">
                    {dashboard.subscriptions.missing}
                  </td>
                </tr>
                <tr>
                  <td className="text-slate-100">{t("kpi.pendingCancel")}</td>
                  <td className="text-slate-400">
                    {dashboard.subscriptions.cancelAtPeriodEnd}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[16rem]">
              <thead>
                <tr>
                  <th>{t("columns.step")}</th>
                  <th>{t("columns.count")}</th>
                </tr>
              </thead>
              <tbody>
                {funnelSteps.map((step) => (
                  <tr key={step.key}>
                    <td className="text-slate-100">
                      {t(`funnel.${step.key}`)}
                    </td>
                    <td className="text-slate-400">{step.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CockpitCard>
    </div>
  );
}
