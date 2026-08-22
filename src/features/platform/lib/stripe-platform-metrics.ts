import { getStripe, getStripeSecretKey } from "@/lib/stripe";

export type StripePlatformMetrics = {
  configured: boolean;
  mrrCents: number | null;
  arrCents: number | null;
  balanceCents: number | null;
  activeSubscriptions: number | null;
  canceledLast30Days: number | null;
  averageLtvCents: number | null;
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

async function fetchAverageLtvCents(stripe: ReturnType<typeof getStripe>): Promise<number | null> {
  const totalsByCustomer = new Map<string, number>();
  let startingAfter: string | undefined;

  do {
    const page = await stripe.invoices.list({
      status: "paid",
      limit: 100,
      starting_after: startingAfter,
    });

    for (const invoice of page.data) {
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId || invoice.amount_paid <= 0) continue;

      totalsByCustomer.set(
        customerId,
        (totalsByCustomer.get(customerId) ?? 0) + invoice.amount_paid,
      );
    }

    startingAfter = page.has_more
      ? page.data[page.data.length - 1]?.id
      : undefined;
  } while (startingAfter);

  if (totalsByCustomer.size === 0) return null;

  const total = [...totalsByCustomer.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  return Math.round(total / totalsByCustomer.size);
}

function readStripeBalanceCents(
  balance: Awaited<
    ReturnType<ReturnType<typeof getStripe>["balance"]["retrieve"]>
  >,
): number {
  const eurAvailable = balance.available.find((entry) => entry.currency === "eur");
  if (eurAvailable) return eurAvailable.amount;

  const eurPending = balance.pending.find((entry) => entry.currency === "eur");
  if (eurPending) return eurPending.amount;

  if (balance.available.length > 0) return balance.available[0]!.amount;
  if (balance.pending.length > 0) return balance.pending[0]!.amount;

  return 0;
}

export async function fetchStripePlatformMetrics(): Promise<StripePlatformMetrics> {
  if (!getStripeSecretKey()) {
    return {
      configured: false,
      mrrCents: null,
      arrCents: null,
      balanceCents: null,
      activeSubscriptions: null,
      canceledLast30Days: null,
      averageLtvCents: null,
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

    const averageLtvCents = await fetchAverageLtvCents(stripe);
    const balance = await stripe.balance.retrieve();
    const balanceCents = readStripeBalanceCents(balance);

    return {
      configured: true,
      mrrCents,
      arrCents: mrrCents * 12,
      balanceCents,
      activeSubscriptions,
      canceledLast30Days,
      averageLtvCents,
    };
  } catch (error) {
    return {
      configured: true,
      mrrCents: null,
      arrCents: null,
      balanceCents: null,
      activeSubscriptions: null,
      canceledLast30Days: null,
      averageLtvCents: null,
      error: error instanceof Error ? error.message : "stripe_fetch_failed",
    };
  }
}
