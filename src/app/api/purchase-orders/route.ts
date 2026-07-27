import { NextResponse } from "next/server";

import {
  centsFromEuroInput,
  parseQuantity,
} from "@/features/materials/lib/materials";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PurchaseOrderStatus } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

const STATUSES: PurchaseOrderStatus[] = [
  "draft",
  "sent",
  "partially_received",
  "received",
  "cancelled",
];

type LineInput = {
  articleId?: string | null;
  title?: string;
  quantity?: number | string;
  unit?: string;
  unitCost?: string | number | null;
};

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      supplierId?: string;
      reference?: string | null;
      orderDate?: string | null;
      expectedDate?: string | null;
      notes?: string | null;
      lines?: LineInput[];
    };

    const supplierId = body.supplierId?.trim() ?? "";
    const lines = body.lines ?? [];
    if (!supplierId || lines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const parsedLines = lines
      .map((line, index) => {
        const title = line.title?.trim() ?? "";
        const quantity = parseQuantity(line.quantity);
        if (!title || quantity == null || quantity <= 0) return null;
        return {
          title,
          quantity,
          unit: emptyToNull(line.unit) ?? "st",
          article_id: emptyToNull(line.articleId),
          unit_cost_cents: centsFromEuroInput(line.unitCost),
          sort_order: index,
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      quantity: number;
      unit: string;
      article_id: string | null;
      unit_cost_cents: number | null;
      sort_order: number;
    }>;

    if (parsedLines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const poId = crypto.randomUUID();
    const { error: poError } = await admin.from("purchase_orders").insert({
      id: poId,
      organization_id: gate.organizationId,
      supplier_id: supplierId,
      reference: emptyToNull(body.reference),
      status: "draft",
      order_date:
        emptyToNull(body.orderDate) ??
        new Date().toISOString().slice(0, 10),
      expected_date: emptyToNull(body.expectedDate),
      notes: emptyToNull(body.notes),
      created_by: gate.userId,
    });

    if (poError) {
      return NextResponse.json({ error: poError.message }, { status: 500 });
    }

    const { error: linesError } = await admin.from("purchase_order_lines").insert(
      parsedLines.map((line) => ({
        organization_id: gate.organizationId,
        purchase_order_id: poId,
        article_id: line.article_id,
        title: line.title,
        quantity: line.quantity,
        unit: line.unit,
        unit_cost_cents: line.unit_cost_cents,
        sort_order: line.sort_order,
      })),
    );

    if (linesError) {
      await admin.from("purchase_orders").delete().eq("id", poId);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    return NextResponse.json({ purchaseOrderId: poId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      status?: PurchaseOrderStatus;
      reference?: string | null;
      expectedDate?: string | null;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const updates: {
      reference?: string | null;
      expected_date?: string | null;
      notes?: string | null;
      status?: PurchaseOrderStatus;
    } = {};
    if (body.reference !== undefined) {
      updates.reference = emptyToNull(body.reference);
    }
    if (body.expectedDate !== undefined) {
      updates.expected_date = emptyToNull(body.expectedDate);
    }
    if (body.notes !== undefined) {
      updates.notes = emptyToNull(body.notes);
    }
    if (body.status && STATUSES.includes(body.status)) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("purchase_orders")
      .update(updates)
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
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
    const { data: po } = await admin
      .from("purchase_orders")
      .select("status")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!po) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (po.status !== "draft" && po.status !== "cancelled") {
      return NextResponse.json({ error: "not_deletable" }, { status: 409 });
    }

    await admin
      .from("purchase_order_lines")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("purchase_order_id", id);

    const { error } = await admin
      .from("purchase_orders")
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
