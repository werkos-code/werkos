import type { AttributionPayload } from "@/lib/analytics/attribution";
import {
  deriveAcquisitionSource,
  hasAttributionSignal,
} from "@/lib/analytics/attribution";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileAttributionRow = {
  first_touch_at: string | null;
  acquisition_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  wbraid: string | null;
  gbraid: string | null;
};

/**
 * Persist first-touch attribution on profiles.
 * Never overwrites once `first_touch_at` is set.
 */
export async function persistFirstTouchAttribution(
  userId: string,
  attribution: AttributionPayload | null,
  options?: { useAdmin?: boolean },
): Promise<void> {
  if (!hasAttributionSignal(attribution) || !attribution) return;

  try {
    const client = options?.useAdmin
      ? createAdminClient()
      : await createClient();

    const { data: existing } = await client
      .from("profiles")
      .select(
        "first_touch_at, acquisition_source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, wbraid, gbraid",
      )
      .eq("id", userId)
      .maybeSingle();

    const row = existing as ProfileAttributionRow | null;
    if (row?.first_touch_at) return;

    const now = new Date().toISOString();
    const { error } = await client
      .from("profiles")
      .update({
        acquisition_source:
          attribution.acquisition_source ??
          deriveAcquisitionSource(attribution) ??
          null,
        utm_source: attribution.utm_source ?? null,
        utm_medium: attribution.utm_medium ?? null,
        utm_campaign: attribution.utm_campaign ?? null,
        utm_term: attribution.utm_term ?? null,
        utm_content: attribution.utm_content ?? null,
        gclid: attribution.gclid ?? null,
        wbraid: attribution.wbraid ?? null,
        gbraid: attribution.gbraid ?? null,
        first_touch_at: now,
      })
      .eq("id", userId)
      .is("first_touch_at", null);

    if (error) {
      console.error("[analytics:attribution]", error.message);
    }
  } catch (error) {
    console.error(
      "[analytics:attribution]",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function markProfileTimestamp(
  userId: string,
  column:
    | "signup_at"
    | "company_created_at"
    | "first_project_at"
    | "first_quote_at"
    | "subscription_started_at",
): Promise<void> {
  try {
    const admin = createAdminClient();
    const patch = { [column]: new Date().toISOString() } as {
      signup_at?: string;
      company_created_at?: string;
      first_project_at?: string;
      first_quote_at?: string;
      subscription_started_at?: string;
    };
    const { error } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .is(column, null);

    if (error) {
      console.error(`[analytics:profile:${column}]`, error.message);
    }
  } catch (error) {
    console.error(
      `[analytics:profile:${column}]`,
      error instanceof Error ? error.message : error,
    );
  }
}
