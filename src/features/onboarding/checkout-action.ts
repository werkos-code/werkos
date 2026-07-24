"use server";

import { PRICING } from "@/config/pricing";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { assertStripePricesConfigured, getStripe } from "@/lib/stripe";

export async function createCheckoutSessionAction(): Promise<{
  url?: string;
  error?: string;
}> {
  try {
    assertStripePricesConfigured();
  } catch {
    return { error: "stripe_missing" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthorized" };
  }

  const { data: draft } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!draft?.company_name) {
    return { error: "incomplete_draft" };
  }

  const officeSeats = draft.office_seats ?? 0;
  const fieldSeats = draft.field_seats ?? 0;
  const industry =
    draft.industry === "other"
      ? draft.industry_other
      : draft.industry;

  const stripe = getStripe();
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const locale = "nl";

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: env.STRIPE_PRICE_BASE!, quantity: 1 },
  ];
  if (officeSeats > 0) {
    lineItems.push({
      price: env.STRIPE_PRICE_SEAT_OFFICE!,
      quantity: officeSeats,
    });
  }
  if (fieldSeats > 0) {
    lineItems.push({
      price: env.STRIPE_PRICE_SEAT_FIELD!,
      quantity: fieldSeats,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: lineItems,
    subscription_data: {
      trial_period_days: PRICING.trialDays,
      metadata: {
        user_id: user.id,
        company_name: draft.company_name,
        industry: industry ?? "",
        office_seats: String(officeSeats),
        field_seats: String(fieldSeats),
      },
    },
    metadata: {
      user_id: user.id,
      company_name: draft.company_name,
      industry: industry ?? "",
      office_seats: String(officeSeats),
      field_seats: String(fieldSeats),
    },
    payment_method_collection: "always",
    success_url: `${appUrl}/${locale}/onboarding/provisioning?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/${locale}/onboarding/payment`,
  });

  await supabase
    .from("onboarding_drafts")
    .update({
      stripe_checkout_session_id: session.id,
      step: "provisioning",
    })
    .eq("user_id", user.id);

  if (!session.url) {
    return { error: "no_checkout_url" };
  }

  return { url: session.url };
}
