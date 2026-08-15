import { computeInvoiceTotals } from "@/features/invoices/lib/invoice-pricing";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

export async function recomputeInvoiceTotals(
  admin: AdminClient,
  organizationId: string,
  invoiceId: string,
) {
  const { data: lines, error: linesError } = await admin
    .from("invoice_lines")
    .select(
      "quantity, unit_price_cents, discount_cents, vat_rate_bps, is_group",
    )
    .eq("organization_id", organizationId)
    .eq("invoice_id", invoiceId);

  if (linesError) {
    return { error: linesError.message };
  }

  const priced = (lines ?? []).filter((line) => !line.is_group);
  const totals = computeInvoiceTotals(
    priced.map((line) => ({
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      discountCents: line.discount_cents,
      vatRateBps: line.vat_rate_bps,
    })),
  );

  const { error } = await admin
    .from("invoices")
    .update({
      subtotal_cents: totals.subtotalCents,
      vat_cents: totals.vatCents,
      total_cents: totals.totalCents,
    })
    .eq("organization_id", organizationId)
    .eq("id", invoiceId);

  if (error) {
    return { error: error.message };
  }

  return { totals };
}
