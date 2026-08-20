import { env } from "@/lib/env";

export type Ga4EventParams = Record<
  string,
  string | number | boolean | undefined | null
>;

function getMeasurementId(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return raw || undefined;
}

function getApiSecret(): string | undefined {
  const raw = process.env.GA4_API_SECRET?.trim() || env.GA4_API_SECRET;
  return raw || undefined;
}

/**
 * Parse GA client_id from the `_ga` cookie (`GA1.1.XXXXXXXX.YYYYYYYY`).
 */
export function parseGaClientIdFromCookie(
  gaCookie: string | undefined | null,
): string | null {
  if (!gaCookie) return null;
  const parts = gaCookie.split(".");
  if (parts.length < 4) return null;
  const id = `${parts[2]}.${parts[3]}`;
  return id || null;
}

/**
 * Send a GA4 event via Measurement Protocol (server-side).
 * Never throws — analytics must not break business flows.
 *
 * Safe production logs: event name + HTTP status + config presence. No PII.
 */
export async function sendGa4Event(input: {
  name: string;
  clientId: string;
  userId?: string | null;
  params?: Ga4EventParams;
}): Promise<boolean> {
  const measurementId = getMeasurementId();
  const apiSecret = getApiSecret();

  if (!measurementId || !apiSecret) {
    console.warn("[analytics:mp:skip]", {
      event: input.name,
      hasMeasurementId: Boolean(measurementId),
      hasApiSecret: Boolean(apiSecret),
      reason: !measurementId
        ? "missing_NEXT_PUBLIC_GA_MEASUREMENT_ID"
        : "missing_GA4_API_SECRET",
    });
    return false;
  }

  const params: Record<string, string | number | boolean> = {
    engagement_time_msec: 1,
  };

  for (const [key, value] of Object.entries(input.params ?? {})) {
    if (value === undefined || value === null) continue;
    params[key] = value;
  }

  const body = {
    client_id: input.clientId,
    ...(input.userId ? { user_id: input.userId } : {}),
    events: [
      {
        name: input.name,
        params,
      },
    ],
  };

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    // GA4 MP typically returns 204 with empty body even for some bad payloads.
    console.info("[analytics:mp:response]", {
      event: input.name,
      measurementIdPrefix: measurementId.slice(0, 6),
      httpStatus: response.status,
      ok: response.ok || response.status === 204,
      hasUserId: Boolean(input.userId),
      clientIdSource: input.clientId.includes(".")
        ? "ga_cookie_or_dotted"
        : "generated",
    });

    return response.ok || response.status === 204;
  } catch (error) {
    console.error("[analytics:mp:error]", {
      event: input.name,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
