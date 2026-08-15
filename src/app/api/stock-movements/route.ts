import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
import { applyStockDelta } from "@/features/materials/lib/stock-balance";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockMovementType } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

const TYPES: StockMovementType[] = [
  "receipt",
  "issue",
  "transfer",
  "adjustment",
  "return",
];

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      articleId?: string;
      movementType?: StockMovementType;
      quantity?: number | string;
      fromLocationId?: string | null;
      toLocationId?: string | null;
      workDate?: string;
      notes?: string | null;
    };

    const articleId = body.articleId?.trim() ?? "";
    const movementType = body.movementType;
    const quantity = parseQuantity(body.quantity);
    if (!articleId || !movementType || !TYPES.includes(movementType)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (quantity == null || quantity <= 0) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }

    const fromLocationId = emptyToNull(body.fromLocationId);
    const toLocationId = emptyToNull(body.toLocationId);
    const workDate =
      emptyToNull(body.workDate) ?? new Date().toISOString().slice(0, 10);

    const admin = createAdminClient();

    if (movementType === "receipt" || movementType === "return") {
      if (!toLocationId) {
        return NextResponse.json({ error: "location_required" }, { status: 400 });
      }
      const delta = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        toLocationId,
        quantity,
      );
      if (!delta.ok) {
        return NextResponse.json({ error: delta.error }, { status: 400 });
      }
    } else if (movementType === "issue") {
      if (!fromLocationId) {
        return NextResponse.json({ error: "location_required" }, { status: 400 });
      }
      const delta = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        fromLocationId,
        -quantity,
      );
      if (!delta.ok) {
        return NextResponse.json({ error: delta.error }, { status: 400 });
      }
    } else if (movementType === "transfer") {
      if (!fromLocationId || !toLocationId) {
        return NextResponse.json({ error: "location_required" }, { status: 400 });
      }
      const out = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        fromLocationId,
        -quantity,
      );
      if (!out.ok) {
        return NextResponse.json({ error: out.error }, { status: 400 });
      }
      const inn = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        toLocationId,
        quantity,
      );
      if (!inn.ok) {
        await applyStockDelta(
          admin,
          gate.organizationId,
          articleId,
          fromLocationId,
          quantity,
        );
        return NextResponse.json({ error: inn.error }, { status: 400 });
      }
    } else if (movementType === "adjustment") {
      if (!toLocationId) {
        return NextResponse.json({ error: "location_required" }, { status: 400 });
      }
      const delta = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        toLocationId,
        quantity,
      );
      if (!delta.ok) {
        return NextResponse.json({ error: delta.error }, { status: 400 });
      }
    }

    const { data, error } = await admin
      .from("stock_movements")
      .insert({
        organization_id: gate.organizationId,
        article_id: articleId,
        movement_type: movementType,
        quantity,
        from_location_id:
          movementType === "receipt" ||
          movementType === "return" ||
          movementType === "adjustment"
            ? null
            : fromLocationId,
        to_location_id:
          movementType === "issue" ? null : toLocationId,
        work_date: workDate,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ movementId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
