import { NextResponse } from "next/server";

import { isQuoteEditable } from "@/features/quotes/lib/quote-status";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

async function assertDraftQuote(
  organizationId: string,
  quoteId: string,
) {
  const admin = createAdminClient();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, status, organization_id")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote) return { error: "not_found" as const };
  if (!isQuoteEditable(quote.status)) return { error: "not_editable" as const };
  return { quote, admin };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const draft = await assertDraftQuote(gate.organizationId, quoteId);
    if ("error" in draft && draft.error) {
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

    const admin = draft.admin;
    const lineId = crypto.randomUUID();

    const { count } = await admin
      .from("quote_lines")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId)
      .eq("organization_id", gate.organizationId);

    const { error } = await admin.from("quote_lines").insert({
      id: lineId,
      organization_id: gate.organizationId,
      quote_id: quoteId,
      parent_id: body.parentId?.trim() || null,
      sort_order: body.sortOrder ?? count ?? 0,
      title: body.title?.trim() || "Nieuwe regel",
      description: body.description?.trim() || null,
      quantity: body.quantity ?? 1,
      unit: body.unit?.trim() || null,
      unit_price_cents: body.unitPriceCents ?? 0,
      vat_rate_bps: body.vatRateBps ?? 2100,
      discount_cents: body.discountCents ?? 0,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lineId });
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
    if ("error" in draft && draft.error) {
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
        ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
        ...(body.unit !== undefined
          ? { unit: body.unit?.trim() || null }
          : {}),
        ...(body.unitPriceCents !== undefined
          ? { unit_price_cents: body.unitPriceCents }
          : {}),
        ...(body.vatRateBps !== undefined
          ? { vat_rate_bps: body.vatRateBps }
          : {}),
        ...(body.discountCents !== undefined
          ? { discount_cents: body.discountCents }
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
    if ("error" in draft && draft.error) {
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
