import { getTranslations } from "next-intl/server";

import type { PlatformDashboardData } from "@/features/platform/platform-dashboard-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
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
    <div className="space-y-6">
      {!dashboard.stripe.configured ? (
        <PageCard className="px-5 py-4 text-sm text-muted-foreground">
          {t("stripeNotConfigured")}
        </PageCard>
      ) : dashboard.stripe.error ? (
        <PageCard className="px-5 py-4 text-sm text-destructive">
          {t("stripeError", { message: dashboard.stripe.error })}
        </PageCard>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("sections.revenue")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("revenueHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaStatCard
            label={t("kpi.mrr")}
            value={displayMoney(dashboard.stripe.mrrLabel)}
            muted={dashboard.stripe.mrrLabel == null}
          />
          <MetaStatCard
            label={t("kpi.arr")}
            value={displayMoney(dashboard.stripe.arrLabel)}
            muted={dashboard.stripe.arrLabel == null}
          />
          <MetaStatCard
            label={t("kpi.stripeActive")}
            value={displayMetric(dashboard.stripe.activeSubscriptions)}
            muted={dashboard.stripe.activeSubscriptions == null}
          />
          <MetaStatCard
            label={t("kpi.canceledLast30Days")}
            value={displayMetric(dashboard.stripe.canceledLast30Days)}
            muted={dashboard.stripe.canceledLast30Days == null}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("sections.subscriptions")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("subscriptionsHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaStatCard
            label={t("kpi.accounts")}
            value={String(dashboard.organizations.total)}
          />
          <MetaStatCard
            label={tBilling("active")}
            value={String(dashboard.subscriptions.active)}
          />
          <MetaStatCard
            label={tBilling("trialing")}
            value={String(dashboard.subscriptions.trialing)}
          />
          <MetaStatCard
            label={t("kpi.pendingCancel")}
            value={String(dashboard.subscriptions.cancelAtPeriodEnd)}
          />
        </div>

        <PageCard className="overflow-hidden">
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
                    <td className="text-foreground">{tBilling(status)}</td>
                    <td className="text-muted-foreground">
                      {dashboard.subscriptions[status]}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="text-foreground">{t("status.missing")}</td>
                  <td className="text-muted-foreground">
                    {dashboard.subscriptions.missing}
                  </td>
                </tr>
                <tr>
                  <td className="text-foreground">{t("kpi.stripeLinked")}</td>
                  <td className="text-muted-foreground">
                    {dashboard.subscriptions.stripeLinked}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </PageCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("sections.funnel")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("funnelHint")}</p>
        <PageCard className="overflow-hidden">
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
                    <td className="text-foreground">
                      {t(`funnel.${step.key}`)}
                    </td>
                    <td className="text-muted-foreground">{step.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      </section>
    </div>
  );
}
