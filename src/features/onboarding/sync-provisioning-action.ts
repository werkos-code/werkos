"use server";

import { provisionOrganizationFromCheckout } from "@/features/onboarding/provision";
import { userHasOrganization } from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * Fallback when the Stripe webhook is delayed or failed:
 * provision from the Checkout session id on the success URL.
 */
export async function syncProvisioningFromCheckoutSession(
  sessionId: string,
): Promise<{ ready?: boolean; error?: string }> {
  if (!sessionId.startsWith("cs_")) {
    return { error: "invalid_session" };
  }

  if (await userHasOrganization()) {
    return { ready: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "unauthorized" };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "complete") {
      return { error: "checkout_incomplete" };
    }

    const sessionUserId =
      session.metadata?.user_id ?? session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      return { error: "session_user_mismatch" };
    }

    if (session.mode !== "subscription" || !session.subscription) {
      return { error: "not_subscription" };
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await provisionOrganizationFromCheckout(session, subscription);

    return { ready: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "provision_failed";
    console.error("[syncProvisioningFromCheckoutSession]", message);
    return { error: message };
  }
}
