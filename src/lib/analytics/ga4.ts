import { env } from "@/lib/env";

export type Ga4EventParams = Record<
  string,
  string | number | boolean | undefined | null
>;

function getMeasurementId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  );
}

function getApiSecret(): string | undefined {
  return (
    process.env.GA4_API_SECRET?.trim() || env.GA4_API_SECRET || undefined
  );
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
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics:mp:skip]", input.name, input.params ?? {});
    }
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

    if (!response.ok && process.env.NODE_ENV === "development") {
      console.debug("[analytics:mp:http]", response.status, input.name);
    }
    return response.ok || response.status === 204;
  } catch (error) {
    console.error(
      "[analytics:mp]",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
