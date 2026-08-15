import { NextResponse } from "next/server";

import {
  aggregateInvoiceStatus,
  centsFromEuroInput,
  computePurchaseLineMatch,
  parseQuantity,
} from "@/features/materials/lib/materials";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

type LineInput = {
  purchaseOrderLineId?: string;
  quantity?: number | string;
  unitCost?: string | number | null;
};

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      purchaseOrderId?: string;
      invoiceNumber?: string;
      invoiceDate?: string | null;
      notes?: string | null;
      lines?: LineInput[];
    };

    const purchaseOrderId = body.purchaseOrderId?.trim() ?? "";
    const invoiceNumber = body.invoiceNumber?.trim() ?? "";
    const lines = body.lines ?? [];

    if (!purchaseOrderId || !invoiceNumber || lines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("purchase_orders")
      .select("id, supplier_id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", purchaseOrderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (order.status === "draft" || order.status === "cancelled") {
      return NextResponse.json({ error: "po_not_ready" }, { status: 400 });
    }

    const { data: poLines } = await admin
      .from("purchase_order_lines")
      .select("id, quantity, unit_cost_cents, received_quantity")
      .eq("organization_id", gate.organizationId)
      .eq("purchase_order_id", purchaseOrderId);

    const poLineById = new Map((poLines ?? []).map((row) => [row.id, row] as const));

    const parsedLines = lines
      .map((line, index) => {
        const purchaseOrderLineId = line.purchaseOrderLineId?.trim() ?? "";
        const quantity = parseQuantity(line.quantity);
        const poLine = poLineById.get(purchaseOrderLineId);
        if (!poLine || quantity == null || quantity <= 0) return null;
        return {
          purchase_order_line_id: purchaseOrderLineId,
          quantity,
          unit_cost_cents: centsFromEuroInput(line.unitCost),
          sort_order: index,
          poLine,
        };
      })
      .filter(Boolean) as Array<{
      purchase_order_line_id: string;
      quantity: number;
      unit_cost_cents: number | null;
      sort_order: number;
      poLine: {
        id: string;
        quantity: number;
        unit_cost_cents: number | null;
        received_quantity: number;
      };
    }>;

    if (parsedLines.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { data: existingInvoiceLines } = await admin
      .from("supplier_invoice_lines")
      .select("purchase_order_line_id, quantity, unit_cost_cents")
      .eq("organization_id", gate.organizationId)
      .in(
        "purchase_order_line_id",
        parsedLines.map((line) => line.purchase_order_line_id),
      );

    const invoicedQtyByLine = new Map<string, number>();
    const invoicedCostByLine = new Map<
      string,
      { totalCents: number; totalQty: number }
    >();

    for (const row of existingInvoiceLines ?? []) {
      const qty = Number(row.quantity);
      invoicedQtyByLine.set(
        row.purchase_order_line_id,
        (invoicedQtyByLine.get(row.purchase_order_line_id) ?? 0) + qty,
      );
      if (row.unit_cost_cents != null) {
        const current = invoicedCostByLine.get(row.purchase_order_line_id) ?? {
          totalCents: 0,
          totalQty: 0,
        };
        current.totalCents += Math.round(qty * row.unit_cost_cents);
        current.totalQty += qty;
        invoicedCostByLine.set(row.purchase_order_line_id, current);
      }
    }

    const matchPreview = parsedLines.map((line) => {
      const priorQty = invoicedQtyByLine.get(line.purchase_order_line_id) ?? 0;
      const invoicedQuantity = priorQty + line.quantity;
      const priorCost = invoicedCostByLine.get(line.purchase_order_line_id);
      let invoicedUnitCostCents = line.unit_cost_cents;
      if (priorCost && priorCost.totalQty > 0 && line.unit_cost_cents != null) {
        invoicedUnitCostCents = Math.round(
          (priorCost.totalCents + line.quantity * line.unit_cost_cents) /
            (priorCost.totalQty + line.quantity),
        );
      }

      return computePurchaseLineMatch({
        orderedQuantity: Number(line.poLine.quantity),
        receivedQuantity: Number(line.poLine.received_quantity),
        invoicedQuantity,
        orderedUnitCostCents: line.poLine.unit_cost_cents,
        invoicedUnitCostCents,
      });
    });

    const invoiceId = crypto.randomUUID();
    const status = aggregateInvoiceStatus(
      matchPreview.map((matchStatus, index) => ({
        purchaseOrderLineId: parsedLines[index]!.purchase_order_line_id,
        title: "",
        unit: "",
        orderedQuantity: 0,
        receivedQuantity: 0,
        invoicedQuantity: 0,
        orderedUnitCostCents: null,
        invoicedUnitCostCents: null,
        matchStatus,
      })),
    );

    const { error: invoiceError } = await admin.from("supplier_invoices").insert({
      id: invoiceId,
      organization_id: gate.organizationId,
      supplier_id: order.supplier_id,
      purchase_order_id: purchaseOrderId,
      invoice_number: invoiceNumber,
      invoice_date:
        emptyToNull(body.invoiceDate) ?? new Date().toISOString().slice(0, 10),
      status,
      notes: emptyToNull(body.notes),
      created_by: gate.userId,
    });

    if (invoiceError) {
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    const { error: linesError } = await admin.from("supplier_invoice_lines").insert(
      parsedLines.map((line) => ({
        organization_id: gate.organizationId,
        supplier_invoice_id: invoiceId,
        purchase_order_line_id: line.purchase_order_line_id,
        quantity: line.quantity,
        unit_cost_cents: line.unit_cost_cents,
        sort_order: line.sort_order,
      })),
    );

    if (linesError) {
      await admin.from("supplier_invoices").delete().eq("id", invoiceId);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    return NextResponse.json({ supplierInvoiceId: invoiceId, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from("supplier_invoices")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!invoice) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await admin
      .from("supplier_invoice_lines")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("supplier_invoice_id", id);

    const { error } = await admin
      .from("supplier_invoices")
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
