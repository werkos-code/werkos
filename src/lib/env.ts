import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment variables.
 * Import `env` instead of reading `process.env` directly.
 *
 * Set SKIP_ENV_VALIDATION=1 to bypass checks (e.g. CI typechecks without secrets).
 */
export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_BASE: z.string().min(1).optional(),
    STRIPE_PRICE_SEAT_OFFICE: z.string().min(1).optional(),
    STRIPE_PRICE_SEAT_FIELD: z.string().min(1).optional(),
    STRIPE_PRICE_BASE_YEARLY: z.string().min(1).optional(),
    STRIPE_PRICE_SEAT_OFFICE_YEARLY: z.string().min(1).optional(),
    STRIPE_PRICE_SEAT_FIELD_YEARLY: z.string().min(1).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_BASE: process.env.STRIPE_PRICE_BASE,
    STRIPE_PRICE_SEAT_OFFICE: process.env.STRIPE_PRICE_SEAT_OFFICE,
    STRIPE_PRICE_SEAT_FIELD: process.env.STRIPE_PRICE_SEAT_FIELD,
    STRIPE_PRICE_BASE_YEARLY: process.env.STRIPE_PRICE_BASE_YEARLY,
    STRIPE_PRICE_SEAT_OFFICE_YEARLY: process.env.STRIPE_PRICE_SEAT_OFFICE_YEARLY,
    STRIPE_PRICE_SEAT_FIELD_YEARLY: process.env.STRIPE_PRICE_SEAT_FIELD_YEARLY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "1",
  emptyStringAsUndefined: true,
});
