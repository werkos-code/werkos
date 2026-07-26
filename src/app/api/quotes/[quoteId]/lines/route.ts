import { NextResponse } from "next/server";

import { isQuoteEditable } from "@/features/quotes/lib/quote-status";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

async function assertDraftQuote(organizationId: string, quoteId: string) {
  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, status, organization_id")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote) {
    return { ok: false as const, error: "not_found" as const, admin };
  }
  if (!isQuoteEditable(quote.status)) {
    return { ok: false as const, error: "not_editable" as const, admin };
  }
  return { ok: true as const, quote, admin };
}

function mapLineRow(row: {
  id: string;
  parent_id: string | null;
  sort_order: number;
  title: string;
  description: string | null;
  quantity: number | string | null;
  unit: string | null;
  unit_price_cents: number | null;
  vat_rate_bps: number;
  discount_cents: number;
}) {
  return {
    id: row.id,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    title: row.title,
    description: row.description,
    quantity: row.quantity === null ? null : Number(row.quantity),
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

    const { quoteId } = await params;
    const draft = await assertDraftQuote(gate.organizationId, quoteId);
    if (!draft.ok) {
      const status = draft.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: draft.error }, { status });
    }

    const body = (await request.json()) as {
      parentId?: string | null;
      title?: string;
      description?: string | null;
      quantity?: number | null;
      unit?: string | null;
      unitPriceCents?: number | null;
      vatRateBps?: number;
      discountCents?: number;
      sortOrder?: number;
    };

    const lineId = crypto.randomUUID();

    const { count } = await draft.admin
      .from("quote_lines")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId)
      .eq("organization_id", gate.organizationId);

    const insert = {
      id: lineId,
      organization_id: gate.organizationId,
      quote_id: quoteId,
      parent_id: body.parentId?.trim() || null,
      sort_order: body.sortOrder ?? count ?? 0,
      title: body.title?.trim() ?? "",
      description: body.description?.trim() || null,
      quantity: body.quantity === undefined ? 1 : body.quantity,
      unit: body.unit === undefined ? "st" : body.unit?.trim() || null,
      unit_price_cents:
        body.unitPriceCents === undefined ? 0 : body.unitPriceCents,
      vat_rate_bps: body.vatRateBps ?? 2100,
      discount_cents: body.discountCents ?? 0,
    };

    const { data, error } = await draft.admin
      .from("quote_lines")
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

    const { quoteId } = await params;
    const draft = await assertDraftQuote(gate.organizationId, quoteId);
    if (!draft.ok) {
      const status = draft.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: draft.error }, { status });
    }

    const body = (await request.json()) as {
      id?: string;
      parentId?: string | null;
      title?: string;
      description?: string | null;
      quantity?: number | null;
      unit?: string | null;
      unitPriceCents?: number | null;
      vatRateBps?: number;
      discountCents?: number;
      sortOrder?: number;
    };

    const lineId = body.id?.trim() ?? "";
    if (!lineId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { error } = await draft.admin
      .from("quote_lines")
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
              quantity:
                body.quantity === null || Number.isNaN(body.quantity)
                  ? null
                  : body.quantity,
            }
          : {}),
        ...(body.unit !== undefined
          ? { unit: body.unit?.trim() || null }
          : {}),
        ...(body.unitPriceCents !== undefined
          ? {
              unit_price_cents:
                body.unitPriceCents === null ||
                Number.isNaN(body.unitPriceCents)
                  ? null
                  : Math.round(body.unitPriceCents),
            }
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
      .eq("quote_id", quoteId)
      .eq("id", lineId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { quoteId } = await params;
    const draft = await assertDraftQuote(gate.organizationId, quoteId);
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
      .from("quote_lines")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .eq("id", lineId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
