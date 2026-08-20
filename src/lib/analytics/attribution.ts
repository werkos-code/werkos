/**
 * Attribution params — must match werkos.nl (`WerkOS - Site` / `src/lib/attribution.ts`).
 * Marketing site appends these to the signup URL when the user clicks Start gratis.
 */
export const ATTRIBUTION_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];

export type AttributionPayload = Partial<Record<AttributionParam, string>> & {
  acquisition_source?: string;
  landing_page?: string;
  landing_path?: string;
  captured_at?: string;
};

/** First-party cookie on app.werkos.nl (survives navigation within the app). */
export const ATTRIBUTION_COOKIE = "werkos_ft";
export const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function cleanParam(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 255);
  return trimmed || undefined;
}

export function deriveAcquisitionSource(
  payload: AttributionPayload,
): string | undefined {
  if (payload.gclid || payload.wbraid || payload.gbraid) return "google";
  if (payload.utm_source) return payload.utm_source.toLowerCase().slice(0, 64);
  return undefined;
}

export function parseAttributionFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AttributionPayload | null {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) {
      return cleanParam(params.get(key));
    }
    const raw = params[key];
    if (Array.isArray(raw)) return cleanParam(raw[0]);
    return cleanParam(raw);
  };

  const payload: AttributionPayload = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = get(key);
    if (value) payload[key] = value;
  }

  if (Object.keys(payload).length === 0) return null;

  payload.acquisition_source = deriveAcquisitionSource(payload);
  payload.captured_at = new Date().toISOString();
  return payload;
}

/** Merge incoming into existing — first-touch: never overwrite a set field. */
export function mergeFirstTouchAttribution(
  existing: AttributionPayload | null,
  incoming: AttributionPayload | null,
): AttributionPayload | null {
  if (!incoming && !existing) return null;
  if (!incoming) return existing;
  if (!existing) return incoming;

  const merged: AttributionPayload = {
    ...existing,
    captured_at: existing.captured_at ?? incoming.captured_at,
    landing_page: existing.landing_page ?? incoming.landing_page,
    landing_path: existing.landing_path ?? incoming.landing_path,
  };

  for (const key of ATTRIBUTION_PARAMS) {
    if (incoming[key] && !merged[key]) {
      merged[key] = incoming[key];
    }
  }

  merged.acquisition_source =
    existing.acquisition_source ??
    incoming.acquisition_source ??
    deriveAcquisitionSource(merged);

  return merged;
}

export function parseAttributionCookie(
  raw: string | undefined | null,
): AttributionPayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as AttributionPayload;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    try {
      const parsed = JSON.parse(raw) as AttributionPayload;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

export function serializeAttributionCookie(payload: AttributionPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

export function hasAttributionSignal(payload: AttributionPayload | null): boolean {
  if (!payload) return false;
  return ATTRIBUTION_PARAMS.some((key) => Boolean(payload[key]));
}
