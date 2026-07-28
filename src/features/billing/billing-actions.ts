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
import { getStripe } from "@/lib/stripe";
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
