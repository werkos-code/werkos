import { NextResponse } from "next/server";

import {
  computeBillingPlan,
  validateBillingPhases,
  type QuoteBillingPhaseInput,
  type QuoteBillingPhaseRow,
} from "@/features/quotes/lib/quote-billing";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

type DbPhaseRow = {
  id: string;
  sort_order: number;
  title: string;
  kind: "standard" | "final";
  amount_type: "percent" | "fixed_cents";
  amount_value: number;
  invoice_id: string | null;
  invoiced_at: string | null;
};

function mapPhaseRow(
  row: DbPhaseRow,
  invoiceNumberById: Map<string, string>,
): QuoteBillingPhaseRow {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    title: row.title,
    kind: row.kind,
    amountType: row.amount_type,
    amountValue: row.amount_value,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_id
      ? (invoiceNumberById.get(row.invoice_id) ?? null)
      : null,
    invoicedAt: row.invoiced_at,
  };
}

async function loadQuoteContext(organizationId: string, quoteId: string) {
  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, title, status, quote_number")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote) return { error: "not_found" as const };

  const [{ data: lines }, { data: phases }] = await Promise.all([
    admin
      .from("quote_lines")
      .select(
        "id, parent_id, sort_order, title, description, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents, estimated_minutes",
      )
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true }),
    admin
      .from("quote_billing_phases")
      .select(
        "id, sort_order, title, kind, amount_type, amount_value, invoice_id, invoiced_at",
      )
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true }),
  ]);

  const invoiceIds = (phases ?? [])
    .map((row) => row.invoice_id)
    .filter(Boolean) as string[];
  const invoiceNumberById = new Map<string, string>();
  if (invoiceIds.length > 0) {
    const { data: invoices } = await admin
      .from("invoices")
      .select("id, invoice_number")
      .eq("organization_id", organizationId)
      .in("id", invoiceIds);
    for (const invoice of invoices ?? []) {
      invoiceNumberById.set(invoice.id, invoice.invoice_number);
    }
  }

  const mappedLines = (lines ?? []).map((line) => ({
    id: line.id,
    parentId: line.parent_id,
    sortOrder: line.sort_order,
    title: line.title,
    description: line.description,
    quantity: line.quantity === null ? null : Number(line.quantity),
    unit: line.unit,
    unitPriceCents: line.unit_price_cents,
    vatRateBps: line.vat_rate_bps,
    discountCents: line.discount_cents,
    estimatedMinutes: line.estimated_minutes,
  }));

  const mappedPhases = (phases ?? []).map((row) =>
    mapPhaseRow(row as DbPhaseRow, invoiceNumberById),
  );
  const plan = computeBillingPlan(mappedPhases, mappedLines);

  return {
    admin,
    quote,
    lines: mappedLines,
    phases: mappedPhases,
    plan,
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const ctx = await loadQuoteContext(gate.organizationId, quoteId);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: 404 });
    }

    return NextResponse.json({
      quoteNumber: ctx.quote.quote_number,
      phases: ctx.plan.phases,
      summary: ctx.plan.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const body = (await request.json()) as {
      phases?: QuoteBillingPhaseInput[];
    };

    const phases = body.phases ?? [];
    const validation = validateBillingPhases(phases);
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: quote } = await admin
      .from("quotes")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: existing } = await admin
      .from("quote_billing_phases")
      .select("id, invoice_id")
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId);

    const invoicedIds = new Set(
      (existing ?? [])
        .filter((row) => row.invoice_id)
        .map((row) => row.id),
    );

    for (const phase of phases) {
      if (phase.id && invoicedIds.has(phase.id)) {
        continue;
      }
    }

    const keepIds = new Set(
      phases.map((p) => p.id).filter(Boolean) as string[],
    );
    const deleteIds = (existing ?? [])
      .filter((row) => !row.invoice_id && !keepIds.has(row.id))
      .map((row) => row.id);

    if (deleteIds.length > 0) {
      await admin
        .from("quote_billing_phases")
        .delete()
        .eq("organization_id", gate.organizationId)
        .in("id", deleteIds);
    }

    for (let index = 0; index < phases.length; index++) {
      const phase = phases[index]!;
      if (phase.id && invoicedIds.has(phase.id)) continue;

      const payload = {
        organization_id: gate.organizationId,
        quote_id: quoteId,
        sort_order: index,
        title: phase.title.trim(),
        kind: phase.kind ?? "standard",
        amount_type: phase.amountType,
        amount_value: Math.round(phase.amountValue),
      };

      if (phase.id) {
        await admin
          .from("quote_billing_phases")
          .update(payload)
          .eq("organization_id", gate.organizationId)
          .eq("id", phase.id);
      } else {
        await admin.from("quote_billing_phases").insert({
          id: crypto.randomUUID(),
          ...payload,
        });
      }
    }

    const ctx = await loadQuoteContext(gate.organizationId, quoteId);
    if ("error" in ctx) {
      return NextResponse.json({ error: ctx.error }, { status: 404 });
    }

    return NextResponse.json({
      phases: ctx.plan.phases,
      summary: ctx.plan.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "save_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
