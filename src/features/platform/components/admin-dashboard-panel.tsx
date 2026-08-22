import { getTranslations } from "next-intl/server";

import type { PlatformDashboardData } from "@/features/platform/platform-dashboard-actions";
import { GoogleAdsMarketingShell } from "@/features/platform/components/google-ads-marketing-shell";
import {
  CockpitAlert,
  CockpitCard,
  CockpitKpi,
  CockpitSection,
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

  const funnelSteps = [
    { key: "signups", value: dashboard.funnel.signups },
    { key: "companiesCreated", value: dashboard.funnel.companiesCreated },
    { key: "firstProject", value: dashboard.funnel.firstProject },
    { key: "firstQuote", value: dashboard.funnel.firstQuote },
    { key: "paidSubscriptions", value: dashboard.funnel.paidSubscriptions },
  ] as const;

  return (
    <div className="space-y-10">
      {!dashboard.stripe.configured ? (
        <CockpitAlert>{t("stripeNotConfigured")}</CockpitAlert>
      ) : dashboard.stripe.error ? (
        <CockpitAlert variant="error">
          {t("stripeError", { message: dashboard.stripe.error })}
        </CockpitAlert>
      ) : null}

      <CockpitSection title={t("sections.revenue")} hint={t("revenueHint")}>
        <div className="grid gap-4 lg:grid-cols-12">
          <CockpitKpi
            className="lg:col-span-3"
            label={t("kpi.mrr")}
            value={displayMoney(dashboard.stripe.mrrLabel)}
            muted={dashboard.stripe.mrrLabel == null}
            variant="hero"
            accent="cyan"
          />
          <CockpitKpi
            className="lg:col-span-3"
            label={t("kpi.arr")}
            value={displayMoney(dashboard.stripe.arrLabel)}
            muted={dashboard.stripe.arrLabel == null}
            variant="hero"
            accent="blue"
          />
          <CockpitKpi
            className="lg:col-span-3"
            label={t("kpi.stripeActive")}
            value={displayMetric(dashboard.stripe.activeSubscriptions)}
            muted={dashboard.stripe.activeSubscriptions == null}
            accent="emerald"
          />
          <CockpitKpi
            className="lg:col-span-3"
            label={t("kpi.canceledLast30Days")}
            value={displayMetric(dashboard.stripe.canceledLast30Days)}
            muted={dashboard.stripe.canceledLast30Days == null}
          />
        </div>
      </CockpitSection>

      <CockpitSection
        title={t("sections.subscriptions")}
        hint={t("subscriptionsHint")}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CockpitKpi
            label={t("kpi.accounts")}
            value={String(dashboard.organizations.total)}
          />
          <CockpitKpi
            label={tBilling("active")}
            value={String(dashboard.subscriptions.active)}
            accent="emerald"
          />
          <CockpitKpi
            label={tBilling("trialing")}
            value={String(dashboard.subscriptions.trialing)}
          />
          <CockpitKpi
            label={t("kpi.pendingCancel")}
            value={String(dashboard.subscriptions.cancelAtPeriodEnd)}
          />
        </div>

        <CockpitCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[32rem]">
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
                  <td className="text-slate-100">{t("kpi.stripeLinked")}</td>
                  <td className="text-slate-400">
                    {dashboard.subscriptions.stripeLinked}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CockpitCard>
      </CockpitSection>

      <CockpitSection title={t("sections.funnel")} hint={t("funnelHint")}>
        <CockpitCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[32rem]">
              <thead>
                <tr>
                  <th>{t("columns.step")}</th>
                  <th>{t("columns.count")}</th>
                </tr>
              </thead>
              <tbody>
                {funnelSteps.map((step) => (
                  <tr key={step.key}>
                    <td className="text-slate-100">{t(`funnel.${step.key}`)}</td>
                    <td className="text-slate-400">{step.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CockpitCard>
      </CockpitSection>

      <GoogleAdsMarketingShell
        metrics={dashboard.googleAds}
        attribution={dashboard.attribution}
      />
    </div>
  );
}
