import { NextResponse } from "next/server";

import { listMaterialLinesForWorkItem } from "@/features/materials/materials-actions";
import { requireApiStaff } from "@/features/shell/lib/api-staff";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const workItemId =
      new URL(request.url).searchParams.get("workItemId")?.trim() ?? "";
    if (!workItemId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const result = await listMaterialLinesForWorkItem(workItemId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      lines: result.lines ?? [],
      usages: result.usages ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
