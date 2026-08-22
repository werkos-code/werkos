"use server";

import { formatEurFromCents } from "@/config/pricing";
import { assertCallerIsSuperAdmin } from "@/features/platform/lib/platform-auth";
import { fetchStripePlatformMetrics } from "@/features/platform/lib/stripe-platform-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

export type PlatformSubscriptionBreakdown = Record<SubscriptionStatus | "missing", number>;

export type PlatformFunnelMetrics = {
  signups: number;
  companiesCreated: number;
  firstProject: number;
  firstQuote: number;
  paidSubscriptions: number;
};

export type PlatformDashboardData = {
  stripe: {
    configured: boolean;
    mrrCents: number | null;
    arrCents: number | null;
    mrrLabel: string | null;
    arrLabel: string | null;
    activeSubscriptions: number | null;
    canceledLast30Days: number | null;
    error?: string;
  };
  organizations: {
    total: number;
  };
  subscriptions: PlatformSubscriptionBreakdown & {
    cancelAtPeriodEnd: number;
    stripeLinked: number;
  };
  funnel: PlatformFunnelMetrics;
};

function emptySubscriptionBreakdown(): PlatformSubscriptionBreakdown {
  return {
    trialing: 0,
    active: 0,
    past_due: 0,
    canceled: 0,
    incomplete: 0,
    incomplete_expired: 0,
    unpaid: 0,
    paused: 0,
    missing: 0,
  };
}

async function countProfilesWhere(
  admin: ReturnType<typeof createAdminClient>,
  column:
    | "signup_at"
    | "company_created_at"
    | "first_project_at"
    | "first_quote_at",
): Promise<number> {
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .not(column, "is", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadPlatformDashboard(): Promise<{
  dashboard?: PlatformDashboardData;
  error?: string;
}> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();

  const [
    stripeMetrics,
    organizationsResult,
    subscriptionsResult,
    signups,
    companiesCreated,
    firstProject,
    firstQuote,
    paidSubscriptionsResult,
  ] = await Promise.all([
    fetchStripePlatformMetrics(),
    admin.from("organizations").select("*", { count: "exact", head: true }),
    admin.from("subscriptions").select("status, cancel_at_period_end, stripe_subscription_id"),
    countProfilesWhere(admin, "signup_at"),
    countProfilesWhere(admin, "company_created_at"),
    countProfilesWhere(admin, "first_project_at"),
    countProfilesWhere(admin, "first_quote_at"),
    admin
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .not("subscription_started_at", "is", null),
  ]);

  if (organizationsResult.error) {
    return { error: organizationsResult.error.message };
  }
  if (subscriptionsResult.error) {
    return { error: subscriptionsResult.error.message };
  }
  if (paidSubscriptionsResult.error) {
    return { error: paidSubscriptionsResult.error.message };
  }

  const breakdown = emptySubscriptionBreakdown();
  let cancelAtPeriodEnd = 0;
  let stripeLinked = 0;

  for (const row of subscriptionsResult.data ?? []) {
    if (row.status) {
      breakdown[row.status as SubscriptionStatus] += 1;
    } else {
      breakdown.missing += 1;
    }
    if (row.cancel_at_period_end) cancelAtPeriodEnd += 1;
    if (row.stripe_subscription_id) stripeLinked += 1;
  }

  const orgCount = organizationsResult.count ?? 0;
  const subscriptionRows = subscriptionsResult.data?.length ?? 0;
  if (orgCount > subscriptionRows) {
    breakdown.missing += orgCount - subscriptionRows;
  }

  return {
    dashboard: {
      stripe: {
        configured: stripeMetrics.configured,
        mrrCents: stripeMetrics.mrrCents,
        arrCents: stripeMetrics.arrCents,
        mrrLabel:
          stripeMetrics.mrrCents != null
            ? formatEurFromCents(stripeMetrics.mrrCents)
            : null,
        arrLabel:
          stripeMetrics.arrCents != null
            ? formatEurFromCents(stripeMetrics.arrCents)
            : null,
        activeSubscriptions: stripeMetrics.activeSubscriptions,
        canceledLast30Days: stripeMetrics.canceledLast30Days,
        error: stripeMetrics.error,
      },
      organizations: {
        total: orgCount,
      },
      subscriptions: {
        ...breakdown,
        cancelAtPeriodEnd,
        stripeLinked,
      },
      funnel: {
        signups,
        companiesCreated,
        firstProject,
        firstQuote,
        paidSubscriptions: paidSubscriptionsResult.count ?? 0,
      },
    },
  };
}
