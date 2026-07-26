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
