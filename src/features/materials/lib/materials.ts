import type { StockLocationKind, StockMovementType } from "@/types/database";

export type ArticleRow = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  unit: string;
  category: string | null;
  barcode: string | null;
  trackStock: boolean;
  purchasePriceCents: number | null;
  salePriceCents: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
};

export type ArticleSupplierPriceRow = {
  id: string;
  articleId: string;
  supplierName: string;
  supplierSku: string | null;
  unitCostCents: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  notes: string | null;
};

export type StockLocationRow = {
  id: string;
  name: string;
  code: string | null;
  kind: StockLocationKind;
  projectId: string | null;
  projectName: string | null;
  isActive: boolean;
  notes: string | null;
};

export type StockBalanceRow = {
  id: string;
  articleId: string;
  articleName: string;
  articleCode: string | null;
  articleUnit: string;
  locationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  minQuantity: number | null;
  maxQuantity: number | null;
};

export type StockMovementRow = {
  id: string;
  articleId: string;
  articleName: string;
  movementType: StockMovementType;
  quantity: number;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string | null;
  toLocationName: string | null;
  workDate: string;
  notes: string | null;
  createdAt: string;
};

export type ProjectMaterialLineRow = {
  id: string;
  projectId: string;
  workItemId: string | null;
  articleId: string | null;
  title: string;
  estimatedQuantity: number;
  unit: string;
  notes: string | null;
  sortOrder: number;
  usedQuantity: number;
};

export type MaterialUsageRow = {
  id: string;
  workItemId: string;
  materialLineId: string | null;
  articleId: string | null;
  title: string;
  quantity: number;
  unit: string;
  locationId: string | null;
  userId: string;
  userName: string;
  workDate: string;
  notes: string | null;
};

export const STOCK_LOCATION_KINDS: StockLocationKind[] = [
  "warehouse",
  "vehicle",
  "project_site",
  "other",
];

export function parseQuantity(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatQty(value: number | null | undefined, unit?: string | null) {
  if (value == null) return "—";
  const rounded = Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 1000) / 1000);
  return unit ? `${rounded} ${unit}` : rounded;
}

export function centsFromEuroInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function euroFromCents(cents: number | null | undefined) {
  if (cents == null) return "";
  return String(cents / 100).replace(".", ",");
}
