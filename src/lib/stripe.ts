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

export function getStripeWebhookSecret(): string | undefined {
  return readServerEnv("STRIPE_WEBHOOK_SECRET") ?? env.STRIPE_WEBHOOK_SECRET;
}

export function getStripePriceIds() {
  return {
    base: readServerEnv("STRIPE_PRICE_BASE") ?? env.STRIPE_PRICE_BASE,
    office:
      readServerEnv("STRIPE_PRICE_SEAT_OFFICE") ?? env.STRIPE_PRICE_SEAT_OFFICE,
    field:
      readServerEnv("STRIPE_PRICE_SEAT_FIELD") ?? env.STRIPE_PRICE_SEAT_FIELD,
    baseYearly:
      readServerEnv("STRIPE_PRICE_BASE_YEARLY") ?? env.STRIPE_PRICE_BASE_YEARLY,
    officeYearly:
      readServerEnv("STRIPE_PRICE_SEAT_OFFICE_YEARLY") ??
      env.STRIPE_PRICE_SEAT_OFFICE_YEARLY,
    fieldYearly:
      readServerEnv("STRIPE_PRICE_SEAT_FIELD_YEARLY") ??
      env.STRIPE_PRICE_SEAT_FIELD_YEARLY,
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

export function assertStripePricesConfigured(interval: "month" | "year" = "month") {
  const prices = getStripePriceIds();
  const missing =
    interval === "year"
      ? [
          !prices.baseYearly ? "STRIPE_PRICE_BASE_YEARLY" : null,
          !prices.officeYearly ? "STRIPE_PRICE_SEAT_OFFICE_YEARLY" : null,
          !prices.fieldYearly ? "STRIPE_PRICE_SEAT_FIELD_YEARLY" : null,
          !getStripeSecretKey() ? "STRIPE_SECRET_KEY" : null,
        ]
      : [
          !prices.base ? "STRIPE_PRICE_BASE" : null,
          !prices.office ? "STRIPE_PRICE_SEAT_OFFICE" : null,
          !prices.field ? "STRIPE_PRICE_SEAT_FIELD" : null,
          !getStripeSecretKey() ? "STRIPE_SECRET_KEY" : null,
        ];

  const filtered = missing.filter(Boolean);
  if (filtered.length > 0) {
    throw new Error(`Stripe not configured: missing ${filtered.join(", ")}`);
  }
}

export { PRICING };
