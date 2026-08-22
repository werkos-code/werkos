/**
 * Google Ads platform metrics (admin).
 * Returns real data only when API credentials are configured.
 * Until then, callers receive `configured: false` and null metrics.
 */

export type GoogleAdsPlatformMetrics = {
  configured: boolean;
  spendCents: number | null;
  spendLabel: string | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
  cpcCents: number | null;
  cpcLabel: string | null;
  roas: number | null;
};

export type GoogleAdsAttributionMetrics = {
  signupsWithGclid: number;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function isGoogleAdsConfigured(): boolean {
  return Boolean(
    readEnv("GOOGLE_ADS_CUSTOMER_ID") &&
      readEnv("GOOGLE_ADS_DEVELOPER_TOKEN") &&
      readEnv("GOOGLE_ADS_REFRESH_TOKEN"),
  );
}

export function emptyGoogleAdsPlatformMetrics(): GoogleAdsPlatformMetrics {
  return {
    configured: false,
    spendCents: null,
    spendLabel: null,
    clicks: null,
    impressions: null,
    conversions: null,
    cpcCents: null,
    cpcLabel: null,
    roas: null,
  };
}

/** Placeholder for Sprint 5 — API sync follows when credentials exist. */
export async function fetchGoogleAdsPlatformMetrics(): Promise<GoogleAdsPlatformMetrics> {
  if (!isGoogleAdsConfigured()) {
    return emptyGoogleAdsPlatformMetrics();
  }

  // Future: pull from Google Ads API + optional cache table.
  return emptyGoogleAdsPlatformMetrics();
}

export async function fetchGoogleAdsMonthMetrics(_input: {
  year: number;
  month: number;
}): Promise<GoogleAdsPlatformMetrics> {
  return fetchGoogleAdsPlatformMetrics();
}
