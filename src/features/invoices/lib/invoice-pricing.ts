import type { InvoiceStatus } from "@/types/database";

export const DEFAULT_HOURLY_RATE_CENTS = 7500;

export function isInvoiceEditable(status: InvoiceStatus) {
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

export function lineVatCents(netCents: number, vatRateBps: number): number {
  return Math.round((netCents * vatRateBps) / 10_000);
}

export type PricedLine = {
  quantity: number | null;
  unitPriceCents: number | null;
  discountCents: number;
  vatRateBps: number;
};

export function computeInvoiceTotals(lines: PricedLine[]) {
  let subtotalCents = 0;
  let vatCents = 0;
  for (const line of lines) {
    const net = lineNetCents(line);
    subtotalCents += net;
    vatCents += lineVatCents(net, line.vatRateBps);
  }
  return {
    subtotalCents,
    vatCents,
    totalCents: subtotalCents + vatCents,
  };
}
