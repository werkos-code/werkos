import { NextResponse } from "next/server";

import { isInvoiceEditable } from "@/features/invoices/lib/invoice-pricing";
import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-invoice-totals";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ invoiceId: string }> };

async function assertDraftInvoice(organizationId: string, invoiceId: string) {
  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, status, organization_id")
    .eq("organization_id", organizationId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) {
    return { ok: false as const, error: "not_found" as const, admin };
  }
  if (!isInvoiceEditable(invoice.status)) {
    return { ok: false as const, error: "not_editable" as const, admin };
  }
  return { ok: true as const, invoice, admin };
}

function mapLineRow(row: {
  id: string;
  parent_id: string | null;
  sort_order: number;
  title: string;
  description: string | null;
  quantity: number | string;
  unit: string | null;
  unit_price_cents: number;
  vat_rate_bps: number;
  discount_cents: number;
}) {
  return {
    id: row.id,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    title: row.title,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitPriceCents: row.unit_price_cents,
    vatRateBps: row.vat_rate_bps,
    discountCents: row.discount_cents,
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { invoiceId } = await params;
    const draft = await assertDraftInvoice(gate.organizationId, invoiceId);
    if (!draft.ok) {
      const status = draft.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: draft.error }, { status });
    }

    const body = (await request.json()) as {
      parentId?: string | null;
      title?: string;
      description?: string | null;
      quantity?: number;
      unit?: string | null;
      unitPriceCents?: number;
      vatRateBps?: number;
      discountCents?: number;
      sortOrder?: number;
    };

    const lineId = crypto.randomUUID();

    const { count } = await draft.admin
      .from("invoice_lines")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoiceId)
      .eq("organization_id", gate.organizationId);

    const insert = {
      id: lineId,
      organization_id: gate.organizationId,
      invoice_id: invoiceId,
      parent_id: body.parentId?.trim() || null,
      sort_order: body.sortOrder ?? count ?? 0,
      title: body.title?.trim() ?? "",
      description: body.description?.trim() || null,
      quantity: body.quantity === undefined ? 1 : body.quantity,
      unit: body.unit === undefined ? "st" : body.unit?.trim() || null,
      unit_price_cents:
        body.unitPriceCents === undefined ? 0 : Math.round(body.unitPriceCents),
      vat_rate_bps: body.vatRateBps ?? 2100,
      discount_cents: body.discountCents ?? 0,
    };

    const { data, error } = await draft.admin
      .from("invoice_lines")
      .insert(insert)
      .select(
        "id, parent_id, sort_order, title, description, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "create_failed" },
        { status: 500 },
      );
    }

    const recompute = await recomputeInvoiceTotals(
      draft.admin,
      gate.organizationId,
      invoiceId,
    );
    if (recompute.error) {
      return NextResponse.json({ error: recompute.error }, { status: 500 });
    }

    return NextResponse.json({ lineId, line: mapLineRow(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { invoiceId } = await params;
    const draft = await assertDraftInvoice(gate.organizationId, invoiceId);
    if (!draft.ok) {
      const status = draft.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: draft.error }, { status });
    }

    const body = (await request.json()) as {
      id?: string;
      parentId?: string | null;
      title?: string;
      description?: string | null;
      quantity?: number;
      unit?: string | null;
      unitPriceCents?: number;
      vatRateBps?: number;
      discountCents?: number;
      sortOrder?: number;
    };

    const lineId = body.id?.trim() ?? "";
    if (!lineId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { error } = await draft.admin
      .from("invoice_lines")
      .update({
        ...(body.parentId !== undefined
          ? { parent_id: body.parentId?.trim() || null }
          : {}),
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.quantity !== undefined
          ? {
              quantity: Number.isNaN(body.quantity) ? 1 : body.quantity,
            }
          : {}),
        ...(body.unit !== undefined
          ? { unit: body.unit?.trim() || null }
          : {}),
        ...(body.unitPriceCents !== undefined
          ? { unit_price_cents: Math.round(body.unitPriceCents) }
          : {}),
        ...(body.vatRateBps !== undefined
          ? { vat_rate_bps: Math.round(body.vatRateBps) }
          : {}),
        ...(body.discountCents !== undefined
          ? {
              discount_cents: Number.isNaN(body.discountCents)
                ? 0
                : Math.round(body.discountCents),
            }
          : {}),
        ...(body.sortOrder !== undefined ? { sort_order: body.sortOrder } : {}),
      })
      .eq("organization_id", gate.organizationId)
      .eq("invoice_id", invoiceId)
      .eq("id", lineId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recompute = await recomputeInvoiceTotals(
      draft.admin,
      gate.organizationId,
      invoiceId,
    );
    if (recompute.error) {
      return NextResponse.json({ error: recompute.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { invoiceId } = await params;
    const draft = await assertDraftInvoice(gate.organizationId, invoiceId);
    if (!draft.ok) {
      const status = draft.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: draft.error }, { status });
    }

    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get("id")?.trim() ?? "";
    if (!lineId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { error } = await draft.admin
      .from("invoice_lines")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("invoice_id", invoiceId)
      .eq("id", lineId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recompute = await recomputeInvoiceTotals(
      draft.admin,
      gate.organizationId,
      invoiceId,
    );
    if (recompute.error) {
      return NextResponse.json({ error: recompute.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
