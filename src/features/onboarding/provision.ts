import type Stripe from "stripe";

import { USER_ROLES } from "@/config/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { uniqueOrganizationSlug } from "@/features/onboarding/lib/slug";
import type { SubscriptionStatus } from "@/types/database";

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

  const admin = createAdminClient();

  // Idempotent: if user already has an org membership, skip create
  const { data: existingMembership } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", USER_ROLES.OWNER)
    .maybeSingle();

  if (existingMembership) {
    await admin.from("onboarding_drafts").delete().eq("user_id", userId);
    return existingMembership.organization_id;
  }

  const slug = await uniqueOrganizationSlug(companyName);

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: companyName,
      slug,
      industry,
      created_by: userId,
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
      user_id: userId,
      role: USER_ROLES.OWNER,
    });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const periodEnd =
    "current_period_end" in subscription &&
    typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  const { error: subError } = await admin.from("subscriptions").insert({
    organization_id: organization.id,
    stripe_customer_id:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    status: mapStripeStatus(subscription.status),
    trial_ends_at: trialEnd,
    office_seats: officeSeats,
    field_seats: fieldSeats,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    current_period_end: periodEnd,
  });

  if (subError) {
    throw new Error(subError.message);
  }

  await admin.from("onboarding_drafts").delete().eq("user_id", userId);

  return organization.id;
}
