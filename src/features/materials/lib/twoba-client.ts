export type TwobaSearchHit = {
  supplierGln: string;
  tradeItemId: string;
  name: string;
  manufacturer: string | null;
  productCode: string | null;
  ean: string | null;
  unit: string | null;
  purchasePriceCents: number | null;
};

type TwobaConfig = {
  apiUrl: string;
  identityUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function readConfig(): TwobaConfig | null {
  const clientId = process.env.TWOBA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.TWOBA_CLIENT_SECRET?.trim() ?? "";
  const username = process.env.TWOBA_USERNAME?.trim() ?? "";
  const password = process.env.TWOBA_PASSWORD?.trim() ?? "";
  if (!clientId || !clientSecret || !username || !password) {
    return null;
  }
  return {
    apiUrl: process.env.TWOBA_API_URL?.trim() || "https://api.2ba.nl",
    identityUrl:
      process.env.TWOBA_IDENTITY_URL?.trim() ||
      "https://identity.2ba.nl/connect/token",
    clientId,
    clientSecret,
    username,
    password,
  };
}

export function isTwobaConfigured() {
  return readConfig() != null;
}

function pickString(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function parsePriceCents(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function normalizeHit(raw: Record<string, unknown>): TwobaSearchHit | null {
  const supplierGln = pickString(raw, [
    "SupplierGLN",
    "supplierGln",
    "SupplierGln",
    "GLN",
    "gln",
  ]);
  const tradeItemId = pickString(raw, [
    "SuppliersTradeItemId",
    "TradeItemId",
    "tradeItemId",
    "Productcode",
    "productCode",
    "ProductCode",
  ]);
  const name =
    pickString(raw, [
      "Description",
      "description",
      "ProductDescription",
      "TradeItemDescription",
      "Name",
      "name",
    ]) ?? tradeItemId;

  if (!supplierGln || !tradeItemId || !name) return null;

  return {
    supplierGln,
    tradeItemId,
    name,
    manufacturer: pickString(raw, ["Manufacture", "Manufacturer", "manufacturer"]),
    productCode: pickString(raw, ["Productcode", "ProductCode", "productCode"]),
    ean: pickString(raw, ["EAN", "Ean", "ean", "GTIN", "gtin"]),
    unit: pickString(raw, ["Unit", "unit", "OrderUnit", "orderUnit"]) ?? "st",
    purchasePriceCents: parsePriceCents(
      raw.NetPrice ?? raw.netPrice ?? raw.PurchasePrice ?? raw.purchasePrice,
    ),
  };
}

function extractHits(payload: unknown): TwobaSearchHit[] {
  const rows: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && typeof item === "object") {
        rows.push(item as Record<string, unknown>);
      }
    }
  } else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidates = [
      obj.Results,
      obj.results,
      obj.Items,
      obj.items,
      obj.Products,
      obj.products,
      obj.Data,
      obj.data,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          if (item && typeof item === "object") {
            rows.push(item as Record<string, unknown>);
          }
        }
        break;
      }
    }
  }

  return rows
    .map((row) => normalizeHit(row))
    .filter((row): row is TwobaSearchHit => row != null);
}

async function fetchAccessToken(config: TwobaConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    username: config.username,
    password: config.password,
    scope: "openid profile offline_access",
  });

  const response = await fetch(config.identityUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`twoba_auth_failed:${response.status}`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("twoba_auth_missing_token");
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function twobaGet(
  config: TwobaConfig,
  path: string,
  query?: Record<string, string>,
) {
  const token = await fetchAccessToken(config);
  const url = new URL(`${config.apiUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`twoba_request_failed:${response.status}`);
  }

  return response.json();
}

export async function searchTwobaCatalog(query: string): Promise<{
  configured: boolean;
  results: TwobaSearchHit[];
  error?: string;
}> {
  const config = readConfig();
  if (!config) {
    return { configured: false, results: [] };
  }

  const q = query.trim();
  if (q.length < 2) {
    return { configured: true, results: [] };
  }

  try {
    const payload = await twobaGet(config, "/1/json/Product/Search", {
      query: q,
    });
    return { configured: true, results: extractHits(payload).slice(0, 25) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "twoba_search_failed";
    return { configured: true, results: [], error: message };
  }
}

export async function getTwobaProductDetails(
  supplierGln: string,
  tradeItemId: string,
): Promise<TwobaSearchHit | null> {
  const config = readConfig();
  if (!config) return null;

  try {
    const payload = await twobaGet(
      config,
      "/1/json/Product/DetailsByGLNAndTradeItemId",
      { gln: supplierGln, tradeItemId },
    );
    if (payload && typeof payload === "object") {
      return normalizeHit(payload as Record<string, unknown>);
    }
    return null;
  } catch {
    return null;
  }
}
