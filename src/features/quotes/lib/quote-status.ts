import type { QuoteStatus } from "@/types/database";

export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "cancelled",
] as const satisfies readonly QuoteStatus[];

export function isQuoteEditable(status: QuoteStatus): boolean {
  return status === "draft";
}

export function lineNetCents(input: {
  quantity: number | null;
  unitPriceCents: number | null;
  discountCents: number;
}): number {
  const qty = input.quantity ?? 0;
  const price = input.unitPriceCents ?? 0;
  return Math.max(0, Math.round(qty * price) - (input.discountCents || 0));
}

export function lineVatCents(
  netCents: number,
  vatRateBps: number,
): number {
  return Math.round((netCents * vatRateBps) / 10_000);
}

/** YYYY-MM-DD = issueDate + net days (local calendar). */
export function dueDateFromPaymentTerms(
  issueDate: string,
  paymentTermsDays: number | null | undefined,
): string | null {
  if (paymentTermsDays == null || Number.isNaN(paymentTermsDays)) return null;
  const days = Math.max(0, Math.round(paymentTermsDays));
  const base = new Date(`${issueDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const PAYMENT_TERMS_DAY_OPTIONS = [0, 7, 14, 30, 45, 60, 90] as const;
