import { getStripe, getStripeSecretKey } from "@/lib/stripe";

export type StripePlatformMetrics = {
  configured: boolean;
  mrrCents: number | null;
  arrCents: number | null;
  activeSubscriptions: number | null;
  canceledLast30Days: number | null;
  error?: string;
};

function subscriptionMrrCents(
  items: Array<{
    quantity?: number | null;
    price: {
      unit_amount: number | null;
      recurring: {
        interval: string;
        interval_count: number;
      } | null;
    };
  }>,
): number {
  let total = 0;

  for (const item of items) {
    const price = item.price;
    if (!price.recurring || price.unit_amount == null) continue;

    const quantity = item.quantity ?? 1;
    const lineAmount = quantity * price.unit_amount;
    const intervalCount = price.recurring.interval_count || 1;

    switch (price.recurring.interval) {
      case "month":
        total += Math.round(lineAmount / intervalCount);
        break;
      case "year":
        total += Math.round(lineAmount / intervalCount / 12);
        break;
      case "week":
        total += Math.round((lineAmount * 52) / intervalCount / 12);
        break;
      case "day":
        total += Math.round((lineAmount * 365) / intervalCount / 12);
        break;
      default:
        break;
    }
  }

  return total;
}

export async function fetchStripePlatformMetrics(): Promise<StripePlatformMetrics> {
  if (!getStripeSecretKey()) {
    return {
      configured: false,
      mrrCents: null,
      arrCents: null,
      activeSubscriptions: null,
      canceledLast30Days: null,
    };
  }

  try {
    const stripe = getStripe();
    let mrrCents = 0;
    let activeSubscriptions = 0;
    let activeStartingAfter: string | undefined;

    do {
      const page = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: activeStartingAfter,
        expand: ["data.items.data.price"],
      });

      for (const subscription of page.data) {
        activeSubscriptions += 1;
        mrrCents += subscriptionMrrCents(subscription.items.data);
      }

      activeStartingAfter = page.has_more
        ? page.data[page.data.length - 1]?.id
        : undefined;
    } while (activeStartingAfter);

    const thirtyDaysAgo = Math.floor(
      (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
    );
    let canceledLast30Days = 0;
    let canceledStartingAfter: string | undefined;

    do {
      const page = await stripe.subscriptions.list({
        status: "canceled",
        limit: 100,
        starting_after: canceledStartingAfter,
      });

      for (const subscription of page.data) {
        const canceledAt = subscription.canceled_at;
        if (canceledAt && canceledAt >= thirtyDaysAgo) {
          canceledLast30Days += 1;
        }
      }

      canceledStartingAfter = page.has_more
        ? page.data[page.data.length - 1]?.id
        : undefined;
    } while (canceledStartingAfter);

    return {
      configured: true,
      mrrCents,
      arrCents: mrrCents * 12,
      activeSubscriptions,
      canceledLast30Days,
    };
  } catch (error) {
    return {
      configured: true,
      mrrCents: null,
      arrCents: null,
      activeSubscriptions: null,
      canceledLast30Days: null,
      error: error instanceof Error ? error.message : "stripe_fetch_failed",
    };
  }
}
