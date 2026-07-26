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
  const missing = [
    !env.STRIPE_PRICE_BASE ? "STRIPE_PRICE_BASE" : null,
    !env.STRIPE_PRICE_SEAT_OFFICE ? "STRIPE_PRICE_SEAT_OFFICE" : null,
    !env.STRIPE_PRICE_SEAT_FIELD ? "STRIPE_PRICE_SEAT_FIELD" : null,
    !env.STRIPE_SECRET_KEY ? "STRIPE_SECRET_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Stripe not configured: missing ${missing.join(", ")}`);
  }
}

export { PRICING };
