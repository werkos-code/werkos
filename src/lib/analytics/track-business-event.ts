import { cookies } from "next/headers";

import {
  ATTRIBUTION_COOKIE,
  type AttributionPayload,
  parseAttributionCookie,
} from "@/lib/analytics/attribution";
import type { AppBusinessEventName } from "@/lib/analytics/events";
import {
  parseGaClientIdFromCookie,
  sendGa4Event,
  type Ga4EventParams,
} from "@/lib/analytics/ga4";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_ID_COOKIE = "werkos_cid";

async function resolveClientId(): Promise<string> {
  try {
    const jar = await cookies();
    const fromGa = parseGaClientIdFromCookie(jar.get("_ga")?.value);
    if (fromGa) return fromGa;
    const existing = jar.get(CLIENT_ID_COOKIE)?.value;
    if (existing) return existing;
  } catch {
    // cookies() unavailable in some contexts (e.g. raw webhook)
  }
  return crypto.randomUUID();
}

export async function readAttributionFromCookies(): Promise<AttributionPayload | null> {
  try {
    const jar = await cookies();
    return parseAttributionCookie(jar.get(ATTRIBUTION_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * Claim a unique business conversion. Returns false if already claimed (idempotent).
 */
export async function claimAnalyticsEvent(input: {
  eventName: AppBusinessEventName;
  dedupeKey: string;
  userId?: string | null;
  organizationId?: string | null;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("analytics_event_log").insert({
      event_name: input.eventName,
      dedupe_key: input.dedupeKey,
      user_id: input.userId ?? null,
      organization_id: input.organizationId ?? null,
    });

    if (error) {
      // Unique violation → already sent
      if (error.code === "23505") return false;
      console.error("[analytics:claim]", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "[analytics:claim]",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Idempotent business event → claim in DB, then Measurement Protocol to GA4.
 * Safe to call multiple times; only the first claim sends to GA4.
 */
export async function trackBusinessEvent(input: {
  event: AppBusinessEventName;
  dedupeKey: string;
  userId?: string | null;
  organizationId?: string | null;
  params?: Ga4EventParams;
  clientId?: string;
}): Promise<{ claimed: boolean; sent: boolean }> {
  const claimed = await claimAnalyticsEvent({
    eventName: input.event,
    dedupeKey: input.dedupeKey,
    userId: input.userId,
    organizationId: input.organizationId,
  });

  if (!claimed) {
    return { claimed: false, sent: false };
  }

  const clientId = input.clientId ?? (await resolveClientId());
  const sent = await sendGa4Event({
    name: input.event,
    clientId,
    userId: input.userId,
    params: {
      ...input.params,
      ...(input.organizationId
        ? { company_id: input.organizationId }
        : {}),
    },
  });

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics:business]", input.event, {
      claimed,
      sent,
      dedupeKey: input.dedupeKey,
    });
  }

  return { claimed, sent };
}
