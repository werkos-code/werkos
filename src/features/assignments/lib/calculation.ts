import type { CalculationLine } from "@/features/assignments/lib/wizard-state";

export function lineNetCents(line: CalculationLine) {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function lineVatCents(line: CalculationLine) {
  const net = lineNetCents(line);
  return Math.round((net * line.vatRateBps) / 10_000);
}

export function computeCalculationTotals(
  lines: CalculationLine[],
  marginPercent = 0,
) {
  let subtotalCents = 0;
  let vatCents = 0;
  for (const line of lines) {
    subtotalCents += lineNetCents(line);
    vatCents += lineVatCents(line);
  }
  const marginCents =
    marginPercent > 0
      ? Math.round((subtotalCents * marginPercent) / 100)
      : 0;
  const netCents = subtotalCents + marginCents;
  const marginVatCents =
    marginPercent > 0 ? Math.round((marginCents * 2100) / 10_000) : 0;
  return {
    subtotalCents,
    marginCents,
    vatCents: vatCents + marginVatCents,
    totalCents: netCents + vatCents + marginVatCents,
  };
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
