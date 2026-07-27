import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
import { applyStockDelta } from "@/features/materials/lib/stock-balance";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PurchaseOrderStatus } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

type ReceiveLineInput = {
  purchaseOrderLineId?: string;
  quantity?: number | string;
};

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      purchaseOrderId?: string;
      locationId?: string;
      receiptDate?: string | null;
      reference?: string | null;
      notes?: string | null;
      lines?: ReceiveLineInput[];
    };

    const purchaseOrderId = body.purchaseOrderId?.trim() ?? "";
    const locationId = body.locationId?.trim() ?? "";
    const lines = body.lines ?? [];

    if (!purchaseOrderId || !locationId || lines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const parsedLines = lines
      .map((line) => {
        const purchaseOrderLineId = line.purchaseOrderLineId?.trim() ?? "";
        const quantity = parseQuantity(line.quantity);
        if (!purchaseOrderLineId || quantity == null || quantity <= 0) {
          return null;
        }
        return { purchaseOrderLineId, quantity };
      })
      .filter(Boolean) as Array<{
      purchaseOrderLineId: string;
      quantity: number;
    }>;

    if (parsedLines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: po } = await admin
      .from("purchase_orders")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", purchaseOrderId)
      .maybeSingle();

    if (!po) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (
      po.status !== "sent" &&
      po.status !== "partially_received"
    ) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const lineIds = parsedLines.map((line) => line.purchaseOrderLineId);
    const { data: poLines } = await admin
      .from("purchase_order_lines")
      .select("id, article_id, quantity, received_quantity, title")
      .eq("organization_id", gate.organizationId)
      .eq("purchase_order_id", purchaseOrderId)
      .in("id", lineIds);

    const lineById = new Map((poLines ?? []).map((row) => [row.id, row] as const));

    for (const line of parsedLines) {
      const poLine = lineById.get(line.purchaseOrderLineId);
      if (!poLine) {
        return NextResponse.json({ error: "line_not_found" }, { status: 400 });
      }
      const remaining =
        Number(poLine.quantity) - Number(poLine.received_quantity);
      if (line.quantity > remaining + 0.0001) {
        return NextResponse.json({ error: "over_receive" }, { status: 400 });
      }
    }

    const receiptId = crypto.randomUUID();
    const receiptDate =
      emptyToNull(body.receiptDate) ??
      new Date().toISOString().slice(0, 10);

    const { error: receiptError } = await admin.from("purchase_receipts").insert({
      id: receiptId,
      organization_id: gate.organizationId,
      purchase_order_id: purchaseOrderId,
      location_id: locationId,
      receipt_date: receiptDate,
      reference: emptyToNull(body.reference),
      notes: emptyToNull(body.notes),
      created_by: gate.userId,
    });

    if (receiptError) {
      return NextResponse.json({ error: receiptError.message }, { status: 500 });
    }

    for (const line of parsedLines) {
      const poLine = lineById.get(line.purchaseOrderLineId)!;
      let stockMovementId: string | null = null;

      if (poLine.article_id) {
        const delta = await applyStockDelta(
          admin,
          gate.organizationId,
          poLine.article_id,
          locationId,
          line.quantity,
        );
        if (!delta.ok) {
          return NextResponse.json({ error: delta.error }, { status: 400 });
        }

        const { data: movement, error: moveError } = await admin
          .from("stock_movements")
          .insert({
            organization_id: gate.organizationId,
            article_id: poLine.article_id,
            movement_type: "receipt" as const,
            quantity: line.quantity,
            from_location_id: null,
            to_location_id: locationId,
            work_date: receiptDate,
            notes: `PO ontvangst: ${poLine.title}`,
            created_by: gate.userId,
          })
          .select("id")
          .single();

        if (moveError) {
          await applyStockDelta(
            admin,
            gate.organizationId,
            poLine.article_id,
            locationId,
            -line.quantity,
          );
          return NextResponse.json({ error: moveError.message }, { status: 500 });
        }
        stockMovementId = movement.id;
      }

      const { error: receiptLineError } = await admin
        .from("purchase_receipt_lines")
        .insert({
          organization_id: gate.organizationId,
          purchase_receipt_id: receiptId,
          purchase_order_line_id: line.purchaseOrderLineId,
          quantity: line.quantity,
          stock_movement_id: stockMovementId,
        });

      if (receiptLineError) {
        return NextResponse.json(
          { error: receiptLineError.message },
          { status: 500 },
        );
      }

      const newReceived = Number(poLine.received_quantity) + line.quantity;
      const { error: updateLineError } = await admin
        .from("purchase_order_lines")
        .update({ received_quantity: newReceived })
        .eq("organization_id", gate.organizationId)
        .eq("id", line.purchaseOrderLineId);

      if (updateLineError) {
        return NextResponse.json(
          { error: updateLineError.message },
          { status: 500 },
        );
      }
    }

    const { data: allLines } = await admin
      .from("purchase_order_lines")
      .select("quantity, received_quantity")
      .eq("organization_id", gate.organizationId)
      .eq("purchase_order_id", purchaseOrderId);

    let fullyReceived = true;
    let anyReceived = false;
    for (const row of allLines ?? []) {
      const ordered = Number(row.quantity);
      const received = Number(row.received_quantity);
      if (received > 0) anyReceived = true;
      if (received + 0.0001 < ordered) fullyReceived = false;
    }

    let nextStatus: PurchaseOrderStatus = po.status as PurchaseOrderStatus;
    if (fullyReceived) {
      nextStatus = "received";
    } else if (anyReceived) {
      nextStatus = "partially_received";
    }

    await admin
      .from("purchase_orders")
      .update({ status: nextStatus })
      .eq("organization_id", gate.organizationId)
      .eq("id", purchaseOrderId);

    return NextResponse.json({ receiptId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
