import { computeQuoteTotals, formatEuro } from "@/features/quotes/lib/quote-line";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";

export type QuoteBillingPhaseKind = "standard" | "final";
export type QuoteBillingAmountType = "percent" | "fixed_cents";

export type QuoteBillingPhaseRow = {
  id: string;
  sortOrder: number;
  title: string;
  kind: QuoteBillingPhaseKind;
  amountType: QuoteBillingAmountType;
  amountValue: number;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoicedAt: string | null;
};

export type QuoteBillingPhaseInput = {
  id?: string;
  title: string;
  kind?: QuoteBillingPhaseKind;
  amountType: QuoteBillingAmountType;
  amountValue: number;
};

export type ComputedBillingPhase = QuoteBillingPhaseRow & {
  netCents: number;
  vatCents: number;
  grossCents: number;
  percentLabel: string | null;
  isInvoiced: boolean;
};

export type BillingPlanSummary = {
  quoteNetCents: number;
  quoteVatCents: number;
  quoteGrossCents: number;
  plannedNetCents: number;
  plannedPercentBps: number;
  invoicedNetCents: number;
  remainingNetCents: number;
  isBalanced: boolean;
};

export function defaultBillingTemplate(): QuoteBillingPhaseInput[] {
  return [
    {
      title: "Voorschot bij opdracht",
      kind: "standard",
      amountType: "percent",
      amountValue: 2500,
    },
    {
      title: "Tussentijdse factuur",
      kind: "standard",
      amountType: "percent",
      amountValue: 2500,
    },
    {
      title: "Tussentijdse factuur",
      kind: "standard",
      amountType: "percent",
      amountValue: 2500,
    },
    {
      title: "Slotfactuur",
      kind: "final",
      amountType: "percent",
      amountValue: 2500,
    },
  ];
}

export function validateBillingPhases(phases: QuoteBillingPhaseInput[]): string | null {
  const finals = phases.filter((p) => p.kind === "final");
  if (finals.length > 1) {
    return "multiple_final_phases";
  }

  let percentBps = 0;
  for (const phase of phases) {
    if (!phase.title.trim()) return "title_required";
    if (phase.kind === "final") continue;
    if (phase.amountType === "percent") {
      if (phase.amountValue < 0 || phase.amountValue > 10_000) {
        return "invalid_percent";
      }
      percentBps += phase.amountValue;
    } else if (phase.amountValue < 0) {
      return "invalid_amount";
    }
  }

  if (percentBps > 10_000) return "percent_over_100";
  return null;
}

function blendedVatRateBps(netCents: number, vatCents: number): number {
  if (netCents <= 0) return 2100;
  return Math.round((vatCents / netCents) * 10_000);
}

export function computeBillingPlan(
  phases: QuoteBillingPhaseRow[],
  lines: QuoteLineRow[],
): { phases: ComputedBillingPhase[]; summary: BillingPlanSummary } {
  const totals = computeQuoteTotals(lines);
  const quoteNet = totals.net;
  const quoteVat = totals.vat;
  const quoteGross = totals.gross;
  const vatRateBps = blendedVatRateBps(quoteNet, quoteVat);

  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const computed: ComputedBillingPhase[] = [];

  let sumStandardNet = 0;
  let plannedPercentBps = 0;
  const standardNetById = new Map<string, number>();

  for (const phase of sorted) {
    if (phase.kind === "final") continue;
    let netCents = 0;
    if (phase.amountType === "percent") {
      plannedPercentBps += phase.amountValue;
      netCents = Math.round((quoteNet * phase.amountValue) / 10_000);
    } else {
      netCents = phase.amountValue;
    }
    standardNetById.set(phase.id, netCents);
    sumStandardNet += netCents;
  }

  let invoicedNet = 0;

  for (const phase of sorted) {
    const isInvoiced = Boolean(phase.invoiceId);
    const netCents =
      phase.kind === "final"
        ? Math.max(0, quoteNet - sumStandardNet)
        : (standardNetById.get(phase.id) ?? 0);

    if (isInvoiced) {
      invoicedNet += netCents;
    }

    const vatCents = Math.round((netCents * vatRateBps) / 10_000);
    const grossCents = netCents + vatCents;

    computed.push({
      ...phase,
      netCents,
      vatCents,
      grossCents,
      percentLabel:
        phase.amountType === "percent"
          ? `${(phase.amountValue / 100).toFixed(phase.amountValue % 100 === 0 ? 0 : 2).replace(".", ",")}%`
          : null,
      isInvoiced,
    });
  }

  const plannedNetCents = computed.reduce((sum, p) => sum + p.netCents, 0);
  const remainingNetCents = Math.max(0, quoteNet - invoicedNet);

  return {
    phases: computed,
    summary: {
      quoteNetCents: quoteNet,
      quoteVatCents: quoteVat,
      quoteGrossCents: quoteGross,
      plannedNetCents,
      plannedPercentBps,
      invoicedNetCents: invoicedNet,
      remainingNetCents,
      isBalanced: Math.abs(plannedNetCents - quoteNet) <= 1 || quoteNet === 0,
    },
  };
}

export function formatPhaseInvoiceDescription(
  phase: QuoteBillingPhaseRow,
  quoteNumber: string | null,
  quoteTitle: string,
): string {
  const ref = quoteNumber ?? quoteTitle;
  if (phase.kind === "final") {
    return `Slotfactuur volgens offerte ${ref}`;
  }
  if (phase.amountType === "percent") {
    const pct = (phase.amountValue / 100).toFixed(phase.amountValue % 100 === 0 ? 0 : 2);
    return `${phase.title} — ${pct.replace(".", ",")}% volgens offerte ${ref}`;
  }
  return `${phase.title} volgens offerte ${ref}`;
}

export { formatEuro };
