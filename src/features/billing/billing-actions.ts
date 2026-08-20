"use server";

import {
  calculateMonthlyTotalCents,
  formatEurFromCents,
  PRICING,
} from "@/config/pricing";
import { USER_ROLES } from "@/config/roles";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { env } from "@/lib/env";
import {
  assertStripePricesConfigured,
  getStripe,
  getStripePriceIds,
} from "@/lib/stripe";
import type { SubscriptionStatus } from "@/types/database";

export type SubscriptionSummary = {
  status: SubscriptionStatus | "missing";
  officeSeats: number;
  fieldSeats: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  monthlyTotalCents: number;
  monthlyTotalLabel: string;
  pricing: {
    baseCents: number;
    officeSeatCents: number;
    fieldSeatCents: number;
    trialDays: number;
  };
  canManage: boolean;
};

export async function getSubscriptionSummary(): Promise<{
  subscription?: SubscriptionSummary;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const session = await getAppSession();
  const canManage = session?.role === USER_ROLES.OWNER;

  const { data, error } = await ctx.supabase
    .from("subscriptions")
    .select(
      "status, office_seats, field_seats, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id",
    )
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (error) return { error: error.message };

  const officeSeats = data?.office_seats ?? 0;
  const fieldSeats = data?.field_seats ?? 0;
  const monthlyTotalCents = calculateMonthlyTotalCents(officeSeats, fieldSeats);

  return {
    subscription: {
      status: data?.status ?? "missing",
      officeSeats,
      fieldSeats,
      trialEndsAt: data?.trial_ends_at ?? null,
      currentPeriodEnd: data?.current_period_end ?? null,
      cancelAtPeriodEnd: data?.cancel_at_period_end ?? false,
      hasStripeCustomer: Boolean(data?.stripe_customer_id),
      monthlyTotalCents,
      monthlyTotalLabel: formatEurFromCents(monthlyTotalCents),
      pricing: {
        baseCents: PRICING.baseMonthlyCents,
        officeSeatCents: PRICING.officeSeatMonthlyCents,
        fieldSeatCents: PRICING.fieldSeatMonthlyCents,
        trialDays: PRICING.trialDays,
      },
      canManage,
    },
  };
}

export async function createBillingPortalSession(): Promise<{
  url?: string;
  error?: string;
}> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };
  if (!session.organizationId || session.role !== USER_ROLES.OWNER) {
    return { error: "forbidden" };
  }

  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data?.stripe_customer_id) return { error: "no_stripe_customer" };

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/instellingen/abonnement`,
    });
    return { url: portal.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "portal_failed";
    return { error: message };
  }
}

/**
 * Stripe Checkout for an existing organization (after free trial / upgrade).
 * No card during signup — payment starts here when they choose a plan.
 */
export async function createOrgSubscriptionCheckoutAction(input: {
  officeSeats: number;
  fieldSeats: number;
  billingInterval?: "month" | "year";
}): Promise<{ url?: string; error?: string; detail?: string }> {
  const billingInterval = input.billingInterval === "year" ? "year" : "month";

  try {
    assertStripePricesConfigured(billingInterval);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe not configured";
    return {
      error:
        billingInterval === "year" ? "yearly_prices_missing" : "stripe_missing",
      detail: message,
    };
  }

  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };
  if (!session.organizationId || session.role !== USER_ROLES.OWNER) {
    return { error: "forbidden" };
  }

  const organizationId = session.organizationId;
  const officeSeats = Math.max(0, Math.floor(input.officeSeats));
  const fieldSeats = Math.max(0, Math.floor(input.fieldSeats));

  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: existing } = await ctx.supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (
    existing?.stripe_subscription_id &&
    (existing.status === "active" || existing.status === "past_due")
  ) {
    return { error: "already_subscribed" };
  }

  const prices = getStripePriceIds();
  const basePrice =
    billingInterval === "year" ? prices.baseYearly! : prices.base!;
  const officePrice =
    billingInterval === "year" ? prices.officeYearly! : prices.office!;
  const fieldPrice =
    billingInterval === "year" ? prices.fieldYearly! : prices.field!;

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: basePrice, quantity: 1 },
  ];
  if (officeSeats > 0) {
    lineItems.push({
      price: officePrice,
      quantity: officeSeats,
    });
  }
  if (fieldSeats > 0) {
    lineItems.push({
      price: fieldPrice,
      quantity: fieldSeats,
    });
  }

  try {
    const stripe = getStripe();
    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const locale = "nl";

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: session.user.email ?? undefined }),
      client_reference_id: session.user.id,
      line_items: lineItems,
      subscription_data: {
        metadata: {
          organization_id: organizationId,
          user_id: session.user.id,
          office_seats: String(officeSeats),
          field_seats: String(fieldSeats),
          billing_interval: billingInterval,
        },
      },
      metadata: {
        organization_id: organizationId,
        user_id: session.user.id,
        office_seats: String(officeSeats),
        field_seats: String(fieldSeats),
        billing_interval: billingInterval,
      },
      payment_method_collection: "always",
      success_url: `${appUrl}/${locale}/instellingen/abonnement?checkout=success`,
      cancel_url: `${appUrl}/${locale}/instellingen/abonnement/kiezen`,
    });

    if (!checkout.url) return { error: "no_checkout_url" };
    return { url: checkout.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout_failed";
    return { error: message };
  }
}

/**
 * Add one office or field seat to the org subscription.
 * - Paid Stripe sub: update item quantity with proration
 * - Trial without Stripe sub yet: bump DB seats (billed at conversion)
 */
export async function addStaffSeatAction(input: {
  kind: "office" | "field";
  quantity?: number;
}): Promise<{
  officeSeats?: number;
  fieldSeats?: number;
  error?: string;
  detail?: string;
}> {
  const session = await getAppSession();
  if (!session) return { error: "unauthorized" };
  if (!session.organizationId || session.role !== USER_ROLES.OWNER) {
    return { error: "forbidden" };
  }

  const organizationId = session.organizationId;
  const addCount = Math.max(1, Math.floor(input.quantity ?? 1));
  const kind = input.kind;

  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select(
      "status, office_seats, field_seats, stripe_subscription_id, stripe_customer_id",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!sub) return { error: "subscription_missing" };

  const nextOffice =
    kind === "office"
      ? (sub.office_seats ?? 0) + addCount
      : (sub.office_seats ?? 0);
  const nextField =
    kind === "field"
      ? (sub.field_seats ?? 0) + addCount
      : (sub.field_seats ?? 0);

  const isPaid =
    Boolean(sub.stripe_subscription_id) &&
    (sub.status === "active" || sub.status === "past_due");

  if (isPaid && sub.stripe_subscription_id) {
    try {
      assertStripePricesConfigured("month");
    } catch (err) {
      return {
        error: "stripe_missing",
        detail: err instanceof Error ? err.message : "Stripe not configured",
      };
    }

    try {
      const stripe = getStripe();
      const prices = getStripePriceIds();
      const subscription = await stripe.subscriptions.retrieve(
        sub.stripe_subscription_id,
        { expand: ["items.data.price"] },
      );

      const officePriceIds = [prices.office, prices.officeYearly].filter(
        Boolean,
      ) as string[];
      const fieldPriceIds = [prices.field, prices.fieldYearly].filter(
        Boolean,
      ) as string[];
      const targetPriceIds =
        kind === "office" ? officePriceIds : fieldPriceIds;

      const existingItem = subscription.items.data.find((item) => {
        const priceId =
          typeof item.price === "string" ? item.price : item.price?.id;
        return priceId ? targetPriceIds.includes(priceId) : false;
      });

      if (existingItem) {
        await stripe.subscriptionItems.update(existingItem.id, {
          quantity: (existingItem.quantity ?? 0) + addCount,
          proration_behavior: "create_prorations",
        });
      } else {
        const monthlyFallback =
          kind === "office" ? prices.office! : prices.field!;
        // Prefer matching the interval of another seat/base item when possible
        const yearlyBase = prices.baseYearly;
        const usesYearly = subscription.items.data.some((item) => {
          const priceId =
            typeof item.price === "string" ? item.price : item.price?.id;
          return (
            priceId === yearlyBase ||
            priceId === prices.officeYearly ||
            priceId === prices.fieldYearly
          );
        });
        const priceToAdd =
          usesYearly && kind === "office" && prices.officeYearly
            ? prices.officeYearly
            : usesYearly && kind === "field" && prices.fieldYearly
              ? prices.fieldYearly
              : monthlyFallback;

        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: priceToAdd,
          quantity: addCount,
          proration_behavior: "create_prorations",
        });
      }
    } catch (err) {
      return {
        error: "seat_purchase_failed",
        detail: err instanceof Error ? err.message : "seat_purchase_failed",
      };
    }
  } else if (sub.status !== "trialing" && sub.status !== "active") {
    return { error: "subscription_required" };
  }

  const { error: updateError } = await ctx.supabase
    .from("subscriptions")
    .update({
      office_seats: nextOffice,
      field_seats: nextField,
    })
    .eq("organization_id", organizationId);

  if (updateError) return { error: updateError.message };

  return { officeSeats: nextOffice, fieldSeats: nextField };
}
