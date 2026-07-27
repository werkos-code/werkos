import { NextResponse } from "next/server";

import { QUOTE_LINE_TYPES } from "@/features/quotes/quotes-actions";
import type { QuoteLineType } from "@/features/quotes/quotes-actions";
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
  line_type: QuoteLineType;
  quantity: number | string | null;
  unit: string | null;
  unit_price_cents: number | null;
  vat_rate_bps: number;
  discount_cents: number;
  estimated_minutes: number | null;
}) {
  return {
    id: row.id,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    title: row.title,
    description: row.description,
    lineType: row.line_type,
    quantity: row.quantity === null ? null : Number(row.quantity),
    unit: row.unit,
    unitPriceCents: row.unit_price_cents,
    vatRateBps: row.vat_rate_bps,
    discountCents: row.discount_cents,
    estimatedMinutes: row.estimated_minutes,
  };
}

const LINE_SELECT =
  "id, parent_id, sort_order, title, description, line_type, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents, estimated_minutes";

function parseLineType(value: unknown): QuoteLineType | null {
  if (typeof value !== "string") return null;
  return QUOTE_LINE_TYPES.includes(value as QuoteLineType)
    ? (value as QuoteLineType)
    : null;
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
      lineType?: string;
      quantity?: number | null;
      unit?: string | null;
      unitPriceCents?: number | null;
      vatRateBps?: number;
      discountCents?: number;
      estimatedMinutes?: number | null;
      sortOrder?: number;
    };

    const lineType = parseLineType(body.lineType) ?? "article";
    const lineId = crypto.randomUUID();

    const { count } = await draft.admin
      .from("quote_lines")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", quoteId)
      .eq("organization_id", gate.organizationId);

    const isSection = lineType === "section";
    const isText = lineType === "text";

    const insert = {
      id: lineId,
      organization_id: gate.organizationId,
      quote_id: quoteId,
      parent_id: body.parentId?.trim() || null,
      sort_order: body.sortOrder ?? count ?? 0,
      title: body.title?.trim() ?? "",
      description: body.description?.trim() || null,
      line_type: lineType,
      quantity:
        body.quantity !== undefined
          ? body.quantity
          : isSection || isText
            ? null
            : 1,
      unit:
        body.unit !== undefined
          ? body.unit?.trim() || null
          : isSection || isText
            ? null
            : lineType === "hours" || lineType === "labor"
              ? "uur"
              : "st",
      unit_price_cents:
        body.unitPriceCents !== undefined
          ? body.unitPriceCents
          : isSection || isText
            ? null
            : 0,
      vat_rate_bps: body.vatRateBps ?? (isText ? 0 : 2100),
      discount_cents: body.discountCents ?? 0,
      estimated_minutes:
        body.estimatedMinutes === undefined
          ? lineType === "hours" || lineType === "labor"
            ? 60
            : null
          : body.estimatedMinutes === null ||
              Number.isNaN(body.estimatedMinutes)
            ? null
            : Math.round(body.estimatedMinutes),
    };

    const { data, error } = await draft.admin
      .from("quote_lines")
      .insert(insert)
      .select(LINE_SELECT)
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
      lineType?: string;
      quantity?: number | null;
      unit?: string | null;
      unitPriceCents?: number | null;
      vatRateBps?: number;
      discountCents?: number;
      estimatedMinutes?: number | null;
      sortOrder?: number;
      /** Bulk reorder: [{ id, sortOrder, parentId? }] */
      reorder?: Array<{
        id: string;
        sortOrder: number;
        parentId?: string | null;
      }>;
    };

    if (body.reorder?.length) {
      for (const item of body.reorder) {
        const { error } = await draft.admin
          .from("quote_lines")
          .update({
            sort_order: item.sortOrder,
            ...(item.parentId !== undefined
              ? { parent_id: item.parentId?.trim() || null }
              : {}),
          })
          .eq("organization_id", gate.organizationId)
          .eq("quote_id", quoteId)
          .eq("id", item.id);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true });
    }

    const lineId = body.id?.trim() ?? "";
    if (!lineId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const parsedType = parseLineType(body.lineType);

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
        ...(parsedType ? { line_type: parsedType } : {}),
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
        ...(body.estimatedMinutes !== undefined
          ? {
              estimated_minutes:
                body.estimatedMinutes === null ||
                Number.isNaN(body.estimatedMinutes)
                  ? null
                  : Math.max(0, Math.round(body.estimatedMinutes)),
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
    const idsParam = searchParams.get("ids")?.trim() ?? "";
    const ids = idsParam
      ? idsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : lineId
        ? [lineId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { error } = await draft.admin
      .from("quote_lines")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId)
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
