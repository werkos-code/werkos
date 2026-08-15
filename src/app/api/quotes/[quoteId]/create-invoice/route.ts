import { NextResponse } from "next/server";

import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-invoice-totals";
import { dueDateFromPaymentTerms } from "@/features/quotes/lib/quote-status";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

const BILLABLE_TYPES = new Set(["article", "hours", "labor"]);

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const admin = createAdminClient();

    const { data: quote } = await admin
      .from("quotes")
      .select(
        "id, project_id, title, status, quote_number, payment_terms_days, external_notes",
      )
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (quote.status !== "accepted") {
      return NextResponse.json({ error: "quote_not_accepted" }, { status: 400 });
    }

    const { data: lines, error: linesError } = await admin
      .from("quote_lines")
      .select(
        "id, parent_id, sort_order, title, description, line_type, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents",
      )
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true });

    if (linesError) {
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const byId = new Map((lines ?? []).map((line) => [line.id, line]));
    const sectionTitle = (lineId: string | null): string | null => {
      if (!lineId) return null;
      const parent = byId.get(lineId);
      if (!parent) return null;
      if (parent.line_type === "section") return parent.title.trim() || null;
      return sectionTitle(parent.parent_id);
    };

    const billable = (lines ?? []).filter((line) =>
      BILLABLE_TYPES.has(line.line_type),
    );

    if (billable.length === 0) {
      return NextResponse.json({ error: "no_billable_lines" }, { status: 400 });
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = dueDateFromPaymentTerms(
      issueDate,
      quote.payment_terms_days,
    );
    const invoiceTitle =
      quote.quote_number != null
        ? `${quote.title} (${quote.quote_number})`
        : quote.title;

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .insert({
        organization_id: gate.organizationId,
        project_id: quote.project_id,
        quote_id: quoteId,
        title: invoiceTitle,
        status: "draft",
        issue_date: issueDate,
        due_date: dueDate,
        subtotal_cents: 0,
        vat_cents: 0,
        total_cents: 0,
        notes: quote.external_notes,
        created_by: gate.userId,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message ?? "create_failed" },
        { status: 500 },
      );
    }

    const lineRows = billable.map((line, index) => {
      const section = sectionTitle(line.parent_id);
      const title =
        section && line.title.trim()
          ? `${section} — ${line.title.trim()}`
          : line.title.trim() || section || "Regel";
      return {
        id: crypto.randomUUID(),
        organization_id: gate.organizationId,
        invoice_id: invoice.id,
        parent_id: null,
        sort_order: index,
        title,
        description: line.description,
        quantity: Number(line.quantity ?? 1),
        unit: line.unit,
        unit_price_cents: line.unit_price_cents ?? 0,
        vat_rate_bps: line.vat_rate_bps,
        discount_cents: line.discount_cents ?? 0,
      };
    });

    const { error: insertError } = await admin
      .from("invoice_lines")
      .insert(lineRows);

    if (insertError) {
      await admin
        .from("invoices")
        .delete()
        .eq("organization_id", gate.organizationId)
        .eq("id", invoice.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const recompute = await recomputeInvoiceTotals(
      admin,
      gate.organizationId,
      invoice.id,
    );
    if (recompute.error) {
      return NextResponse.json({ error: recompute.error }, { status: 500 });
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
