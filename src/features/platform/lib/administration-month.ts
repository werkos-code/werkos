import type { PlatformCostCategory } from "@/types/database";

export const PLATFORM_COST_CATEGORIES: PlatformCostCategory[] = [
  "software",
  "hosting",
  "marketing",
  "office",
  "professional_services",
  "other",
];

export function parseAdministrationMonth(value: string | undefined): {
  year: number;
  month: number;
} {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallback;

  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return fallback;
  }
  return { year, month };
}

export function administrationMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthDateRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
