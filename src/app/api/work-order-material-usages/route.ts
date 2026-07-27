import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
import { applyStockDelta } from "@/features/materials/lib/stock-balance";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      workOrderId?: string;
      articleId?: string | null;
      title?: string;
      quantity?: number | string;
      unit?: string;
      locationId?: string | null;
      workDate?: string;
      notes?: string | null;
      deductStock?: boolean;
    };

    const workOrderId = body.workOrderId?.trim() ?? "";
    const quantity = parseQuantity(body.quantity);
    const title = body.title?.trim() ?? "";
    if (!workOrderId || !title || quantity == null || quantity <= 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("work_orders")
      .select("id, project_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", workOrderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const articleId = emptyToNull(body.articleId);
    const locationId = emptyToNull(body.locationId);
    let stockMovementId: string | null = null;

    if (body.deductStock && articleId && locationId) {
      const delta = await applyStockDelta(
        admin,
        gate.organizationId,
        articleId,
        locationId,
        -quantity,
      );
      if (!delta.ok) {
        return NextResponse.json({ error: delta.error }, { status: 400 });
      }
      const { data: movement, error: moveError } = await admin
        .from("stock_movements")
        .insert({
          organization_id: gate.organizationId,
          article_id: articleId,
          movement_type: "issue" as const,
          quantity,
          from_location_id: locationId,
          to_location_id: null,
          work_date:
            emptyToNull(body.workDate) ??
            new Date().toISOString().slice(0, 10),
          notes: emptyToNull(body.notes),
          created_by: gate.userId,
        })
        .select("id")
        .single();
      if (moveError) {
        await applyStockDelta(
          admin,
          gate.organizationId,
          articleId,
          locationId,
          quantity,
        );
        return NextResponse.json({ error: moveError.message }, { status: 500 });
      }
      stockMovementId = movement.id;
    }

    const { data, error } = await admin
      .from("work_order_material_usages")
      .insert({
        organization_id: gate.organizationId,
        project_id: order.project_id,
        work_order_id: workOrderId,
        article_id: articleId,
        title,
        quantity,
        unit: emptyToNull(body.unit) ?? "st",
        location_id: locationId,
        stock_movement_id: stockMovementId,
        user_id: gate.userId,
        work_date:
          emptyToNull(body.workDate) ?? new Date().toISOString().slice(0, 10),
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ usageId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("work_order_material_usages")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
