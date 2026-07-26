import { USER_ROLES } from "@/config/roles";
import { PRICING } from "@/config/pricing";
import { uniqueOrganizationSlug } from "@/features/onboarding/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";
import type Stripe from "stripe";

export type ProvisionInput = {
  userId: string;
  companyName: string;
  industry: string | null;
  officeSeats: number;
  fieldSeats: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

/**
 * Creates organization + owner membership + subscription row.
 * Used by the Stripe checkout webhook (and session_id recovery).
 */
export async function provisionOrganization(input: ProvisionInput) {
  const admin = createAdminClient();

  const { data: existingMembership } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", input.userId)
    .eq("role", USER_ROLES.OWNER)
    .maybeSingle();

  if (existingMembership) {
    await admin.from("onboarding_drafts").delete().eq("user_id", input.userId);
    return existingMembership.organization_id;
  }

  const slug = await uniqueOrganizationSlug(input.companyName);

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: input.companyName,
      slug,
      industry: input.industry,
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (orgError || !organization) {
    throw new Error(orgError?.message ?? "Failed to create organization");
  }

  const { error: membershipError } = await admin
    .from("organization_memberships")
    .insert({
      organization_id: organization.id,
      user_id: input.userId,
      role: USER_ROLES.OWNER,
    });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const trialEndsAt =
    input.trialEndsAt ??
    new Date(
      Date.now() + PRICING.trialDays * 24 * 60 * 60 * 1000,
    ).toISOString();

  const { error: subError } = await admin.from("subscriptions").insert({
    organization_id: organization.id,
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    status: input.status ?? "trialing",
    trial_ends_at: trialEndsAt,
    office_seats: input.officeSeats,
    field_seats: input.fieldSeats,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    current_period_end: input.currentPeriodEnd ?? null,
  });

  if (subError) {
    throw new Error(subError.message);
  }

  await admin.from("onboarding_drafts").delete().eq("user_id", input.userId);

  return organization.id;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return status;
    default:
      return "incomplete";
  }
}

export async function provisionOrganizationFromCheckout(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
) {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const companyName = session.metadata?.company_name;
  const industry = session.metadata?.industry || null;
  const officeSeats = Number(session.metadata?.office_seats ?? 0);
  const fieldSeats = Number(session.metadata?.field_seats ?? 0);

  if (!userId || !companyName) {
    throw new Error("Checkout session missing provisioning metadata");
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const periodEnd =
    "current_period_end" in subscription &&
    typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  return provisionOrganization({
    userId,
    companyName,
    industry,
    officeSeats,
    fieldSeats,
    stripeCustomerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    stripeSubscriptionId: subscription.id,
    status: mapStripeStatus(subscription.status),
    trialEndsAt: trialEnd,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  });
}
