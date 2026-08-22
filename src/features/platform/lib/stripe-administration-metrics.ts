import { getStripe, getStripeSecretKey } from "@/lib/stripe";

export type StripeMonthInvoiceRow = {
  id: string;
  number: string | null;
  customerEmail: string | null;
  paidAt: string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

export type StripeMonthSummary = {
  configured: boolean;
  grossCents: number | null;
  taxCents: number | null;
  feesCents: number | null;
  netAfterFeesCents: number | null;
  invoiceCount: number | null;
  invoices: StripeMonthInvoiceRow[];
  error?: string;
};

function invoiceTaxCents(invoice: {
  total: number;
  subtotal: number;
  total_tax_amounts?: Array<{ amount: number }> | null;
}): number {
  if (invoice.total_tax_amounts?.length) {
    return invoice.total_tax_amounts.reduce((sum, row) => sum + row.amount, 0);
  }
  return Math.max(0, invoice.total - invoice.subtotal);
}

function monthBoundsUtc(year: number, month: number) {
  const start = Math.floor(Date.UTC(year, month - 1, 1) / 1000);
  const end = Math.floor(Date.UTC(year, month, 0, 23, 59, 59) / 1000);
  return { start, end };
}

export async function fetchStripeMonthSummary(
  year: number,
  month: number,
): Promise<StripeMonthSummary> {
  if (!getStripeSecretKey()) {
    return {
      configured: false,
      grossCents: null,
      taxCents: null,
      feesCents: null,
      netAfterFeesCents: null,
      invoiceCount: null,
      invoices: [],
    };
  }

  const { start, end } = monthBoundsUtc(year, month);

  try {
    const stripe = getStripe();
    const invoices: StripeMonthInvoiceRow[] = [];
    let grossCents = 0;
    let taxCents = 0;
    let startingAfter: string | undefined;

    do {
      const page = await stripe.invoices.list({
        status: "paid",
        created: { gte: start, lte: end },
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      for (const invoice of page.data) {
        const paidAt = invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null;
        const customer = invoice.customer;
        const customerEmail =
          typeof customer === "object" && customer && "email" in customer
            ? (customer.email ?? null)
            : null;

        const tax = invoiceTaxCents(invoice);
        grossCents += invoice.total;
        taxCents += tax;

        invoices.push({
          id: invoice.id,
          number: invoice.number,
          customerEmail,
          paidAt,
          subtotalCents: invoice.subtotal,
          taxCents: tax,
          totalCents: invoice.total,
          currency: invoice.currency,
        });
      }

      startingAfter = page.has_more
        ? page.data[page.data.length - 1]?.id
        : undefined;
    } while (startingAfter);

    let feesCents = 0;
    let feeStartingAfter: string | undefined;

    do {
      const page = await stripe.balanceTransactions.list({
        created: { gte: start, lte: end },
        limit: 100,
        starting_after: feeStartingAfter,
      });

      for (const tx of page.data) {
        feesCents += tx.fee;
      }

      feeStartingAfter = page.has_more
        ? page.data[page.data.length - 1]?.id
        : undefined;
    } while (feeStartingAfter);

    const netAfterFeesCents = grossCents - feesCents;

    return {
      configured: true,
      grossCents,
      taxCents,
      feesCents,
      netAfterFeesCents,
      invoiceCount: invoices.length,
      invoices: invoices.sort((a, b) =>
        (a.paidAt ?? "").localeCompare(b.paidAt ?? ""),
      ),
    };
  } catch (error) {
    return {
      configured: true,
      grossCents: null,
      taxCents: null,
      feesCents: null,
      netAfterFeesCents: null,
      invoiceCount: null,
      invoices: [],
      error: error instanceof Error ? error.message : "stripe_fetch_failed",
    };
  }
}

export function buildAdministrationCsv(input: {
  year: number;
  month: number;
  stripe: StripeMonthSummary;
  costs: Array<{
    invoiceDate: string;
    description: string;
    vendor: string | null;
    category: string;
    amountCents: number;
    vatRateBps: number;
    invoiceReference: string | null;
  }>;
}): string {
  const lines: string[] = [];
  const period = `${input.year}-${String(input.month).padStart(2, "0")}`;

  lines.push(`WerkOS administratie export;${period}`);
  lines.push("");

  lines.push("Stripe samenvatting");
  lines.push("veld;waarde centen");
  lines.push(`bruto omzet;${input.stripe.grossCents ?? ""}`);
  lines.push(`btw;${input.stripe.taxCents ?? ""}`);
  lines.push(`stripe fees;${input.stripe.feesCents ?? ""}`);
  lines.push(`netto na fees;${input.stripe.netAfterFeesCents ?? ""}`);
  lines.push(`facturen;${input.stripe.invoiceCount ?? ""}`);
  lines.push("");

  lines.push("Stripe facturen");
  lines.push(
    "factuurnummer;klant email;betaald op;subtotaal centen;btw centen;totaal centen;valuta",
  );
  for (const invoice of input.stripe.invoices) {
    lines.push(
      [
        csvCell(invoice.number),
        csvCell(invoice.customerEmail),
        csvCell(invoice.paidAt?.slice(0, 10) ?? null),
        invoice.subtotalCents,
        invoice.taxCents,
        invoice.totalCents,
        invoice.currency,
      ].join(";"),
    );
  }
  lines.push("");

  lines.push("Handmatige kosten");
  lines.push(
    "datum;omschrijving;leverancier;categorie;bedrag excl centen;btw %;referentie",
  );
  for (const cost of input.costs) {
    lines.push(
      [
        cost.invoiceDate,
        csvCell(cost.description),
        csvCell(cost.vendor),
        cost.category,
        cost.amountCents,
        (cost.vatRateBps / 100).toFixed(2).replace(".", ","),
        csvCell(cost.invoiceReference),
      ].join(";"),
    );
  }

  return `${lines.join("\n")}\n`;
}

function csvCell(value: string | null | undefined): string {
  const text = value ?? "";
  if (text.includes(";") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
