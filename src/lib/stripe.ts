import Stripe from "stripe";

import { PRICING } from "@/config/pricing";
import { env } from "@/lib/env";

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export function assertStripePricesConfigured() {
  if (
    !env.STRIPE_PRICE_BASE ||
    !env.STRIPE_PRICE_SEAT_OFFICE ||
    !env.STRIPE_PRICE_SEAT_FIELD
  ) {
    throw new Error("Stripe price IDs are not configured");
  }
}

export { PRICING };
