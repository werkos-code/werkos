import { NextResponse } from "next/server";

import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-invoice-totals";
import {
  computeBillingPlan,
  formatPhaseInvoiceDescription,
  type QuoteBillingPhaseRow,
} from "@/features/quotes/lib/quote-billing";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ quoteId: string; phaseId: string }>;
};

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId, phaseId } = await params;
    const admin = createAdminClient();

    const { data: quote } = await admin
      .from("quotes")
      .select("id, title, project_id, quote_number, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: phase } = await admin
      .from("quote_billing_phases")
      .select(
        "id, sort_order, title, kind, amount_type, amount_value, invoice_id, invoiced_at",
      )
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .eq("id", phaseId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "phase_not_found" }, { status: 404 });
    }

    if (phase.invoice_id) {
      return NextResponse.json({ error: "already_invoiced" }, { status: 409 });
    }

    const { data: lines } = await admin
      .from("quote_lines")
      .select(
        "id, parent_id, sort_order, title, description, line_type, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents, estimated_minutes",
      )
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId);

    const { data: allPhases } = await admin
      .from("quote_billing_phases")
      .select(
        "id, sort_order, title, kind, amount_type, amount_value, invoice_id, invoiced_at",
      )
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId);

    const mappedLines = (lines ?? []).map((line) => ({
      id: line.id,
      parentId: line.parent_id,
      sortOrder: line.sort_order,
      title: line.title,
      description: line.description,
      lineType: line.line_type ?? "article",
      quantity: line.quantity === null ? null : Number(line.quantity),
      unit: line.unit,
      unitPriceCents: line.unit_price_cents,
      vatRateBps: line.vat_rate_bps,
      discountCents: line.discount_cents,
      estimatedMinutes: line.estimated_minutes,
    }));

    const mappedPhases: QuoteBillingPhaseRow[] = (allPhases ?? []).map(
      (row) => ({
        id: row.id,
        sortOrder: row.sort_order,
        title: row.title,
        kind: row.kind,
        amountType: row.amount_type,
        amountValue: row.amount_value,
        invoiceId: row.invoice_id,
        invoiceNumber: null,
        invoicedAt: row.invoiced_at,
      }),
    );

    const plan = computeBillingPlan(mappedPhases, mappedLines);
    const computed = plan.phases.find((p) => p.id === phaseId);
    if (!computed || computed.netCents <= 0) {
      return NextResponse.json({ error: "zero_amount" }, { status: 400 });
    }

    const vatRateBps =
      computed.netCents > 0
        ? Math.round((computed.vatCents / computed.netCents) * 10_000)
        : 2100;

    const invoiceTitle = phase.title.trim();
    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .insert({
        organization_id: gate.organizationId,
        project_id: quote.project_id,
        quote_id: quoteId,
        title: invoiceTitle,
        status: "draft",
        subtotal_cents: computed.netCents,
        vat_cents: computed.vatCents,
        total_cents: computed.grossCents,
        created_by: gate.userId,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message ?? "invoice_failed" },
        { status: 500 },
      );
    }

    const lineDescription = formatPhaseInvoiceDescription(
      {
        id: phase.id,
        sortOrder: phase.sort_order,
        title: phase.title,
        kind: phase.kind,
        amountType: phase.amount_type,
        amountValue: phase.amount_value,
        invoiceId: null,
        invoiceNumber: null,
        invoicedAt: null,
      },
      quote.quote_number,
      quote.title,
    );

    await admin.from("invoice_lines").insert({
      id: crypto.randomUUID(),
      organization_id: gate.organizationId,
      invoice_id: invoice.id,
      parent_id: null,
      sort_order: 0,
      title: lineDescription,
      description: null,
      quantity: 1,
      unit: "st",
      unit_price_cents: computed.netCents,
      vat_rate_bps: vatRateBps,
      discount_cents: 0,
    });

    await recomputeInvoiceTotals(admin, gate.organizationId, invoice.id);

    await admin
      .from("quote_billing_phases")
      .update({
        invoice_id: invoice.id,
        invoiced_at: new Date().toISOString(),
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", phaseId);

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invoice_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
