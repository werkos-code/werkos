import { NextResponse } from "next/server";

import { listWorkOrderMaterials } from "@/features/materials/materials-actions";
import { requireApiStaff } from "@/features/shell/lib/api-staff";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const workOrderId =
      new URL(request.url).searchParams.get("workOrderId")?.trim() ?? "";
    if (!workOrderId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const result = await listWorkOrderMaterials(workOrderId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      linkedWorkItemIds: result.linkedWorkItemIds ?? [],
      rows: result.rows ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
