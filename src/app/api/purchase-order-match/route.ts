import { NextResponse } from "next/server";

import { getPurchaseOrderMatch } from "@/features/materials/materials-actions";
import { requireApiStaff } from "@/features/shell/lib/api-staff";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const purchaseOrderId =
      new URL(request.url).searchParams.get("purchaseOrderId")?.trim() ?? "";
    if (!purchaseOrderId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const result = await getPurchaseOrderMatch(purchaseOrderId);
    if (result.error === "not_found") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      order: result.order,
      lines: result.lines ?? [],
      invoices: result.invoices ?? [],
      overallStatus: result.overallStatus ?? "draft",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "match_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
