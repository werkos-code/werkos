import { formatEurFromCents } from "@/config/pricing";
import { monthDateRange } from "@/features/platform/lib/administration-month";
import type { GoogleAdsPlatformMetrics } from "@/features/platform/lib/google-ads-platform-metrics";
import type { StripePlatformMetrics } from "@/features/platform/lib/stripe-platform-metrics";
import type { PlatformCostCategory } from "@/types/database";

export type PlatformSecondaryMetrics = {
  cacCents: number | null;
  cacLabel: string | null;
  ltvCents: number | null;
  ltvLabel: string | null;
  churnPercent: number | null;
  churnLabel: string | null;
  monthlyCostsCents: number | null;
  monthlyCostsLabel: string | null;
};

type OperatingCostRow = {
  amount_cents: number;
  vat_rate_bps: number;
  category: PlatformCostCategory;
};

function computeCostsInclCents(costs: OperatingCostRow[]): number {
  let total = 0;
  for (const cost of costs) {
    const vat = Math.round((cost.amount_cents * cost.vat_rate_bps) / 10000);
    total += cost.amount_cents + vat;
  }
  return total;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function computeSecondaryMetrics(input: {
  stripe: Pick<
    StripePlatformMetrics,
    "activeSubscriptions" | "canceledLast30Days" | "averageLtvCents"
  >;
  googleAds: GoogleAdsPlatformMetrics;
  operatingCosts: OperatingCostRow[];
  newPaidCustomersThisMonth: number;
}): PlatformSecondaryMetrics {
  const monthlyCostsCents = computeCostsInclCents(input.operatingCosts);

  const marketingCosts = input.operatingCosts
    .filter((cost) => cost.category === "marketing")
    .reduce((sum, cost) => {
      const vat = Math.round((cost.amount_cents * cost.vat_rate_bps) / 10000);
      return sum + cost.amount_cents + vat;
    }, 0);

  const adsSpendCents = input.googleAds.spendCents ?? 0;
  const acquisitionSpendCents = adsSpendCents + marketingCosts;

  let cacCents: number | null = null;
  if (input.newPaidCustomersThisMonth > 0) {
    cacCents = Math.round(
      acquisitionSpendCents / input.newPaidCustomersThisMonth,
    );
  }

  let churnPercent: number | null = null;
  const active = input.stripe.activeSubscriptions;
  const canceled = input.stripe.canceledLast30Days;
  if (active != null && canceled != null) {
    const base = active + canceled;
    if (base > 0) {
      churnPercent = (canceled / base) * 100;
    }
  }

  const ltvCents = input.stripe.averageLtvCents;

  return {
    cacCents,
    cacLabel: cacCents != null ? formatEurFromCents(cacCents) : null,
    ltvCents,
    ltvLabel: ltvCents != null ? formatEurFromCents(ltvCents) : null,
    churnPercent,
    churnLabel: churnPercent != null ? formatPercent(churnPercent) : null,
    monthlyCostsCents,
    monthlyCostsLabel: formatEurFromCents(monthlyCostsCents),
  };
}

export function currentMonthRange() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    ...monthDateRange(now.getFullYear(), now.getMonth() + 1),
  };
}
