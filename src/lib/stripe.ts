import Stripe from "stripe";

import { PRICING } from "@/config/pricing";
import { env } from "@/lib/env";

/** Read server env at runtime (trim; avoids empty/whitespace Vercel values). */
function readServerEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getStripeSecretKey(): string | undefined {
  return readServerEnv("STRIPE_SECRET_KEY") ?? env.STRIPE_SECRET_KEY;
}

export function getStripePriceIds() {
  return {
    base: readServerEnv("STRIPE_PRICE_BASE") ?? env.STRIPE_PRICE_BASE,
    office:
      readServerEnv("STRIPE_PRICE_SEAT_OFFICE") ?? env.STRIPE_PRICE_SEAT_OFFICE,
    field:
      readServerEnv("STRIPE_PRICE_SEAT_FIELD") ?? env.STRIPE_PRICE_SEAT_FIELD,
  };
}

export function getStripe(): Stripe {
  const secret = getStripeSecretKey();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secret, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export function assertStripePricesConfigured() {
  const prices = getStripePriceIds();
  const missing = [
    !prices.base ? "STRIPE_PRICE_BASE" : null,
    !prices.office ? "STRIPE_PRICE_SEAT_OFFICE" : null,
    !prices.field ? "STRIPE_PRICE_SEAT_FIELD" : null,
    !getStripeSecretKey() ? "STRIPE_SECRET_KEY" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Stripe not configured: missing ${missing.join(", ")}`);
  }
}

export { PRICING };
