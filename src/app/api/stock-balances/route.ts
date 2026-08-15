import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      minQuantity?: number | string | null;
      maxQuantity?: number | string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const minQuantity =
      body.minQuantity === null || body.minQuantity === ""
        ? null
        : parseQuantity(body.minQuantity);
    const maxQuantity =
      body.maxQuantity === null || body.maxQuantity === ""
        ? null
        : parseQuantity(body.maxQuantity);

    if (
      minQuantity != null &&
      maxQuantity != null &&
      minQuantity > maxQuantity
    ) {
      return NextResponse.json({ error: "min_gt_max" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("stock_balances")
      .update({
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
      })
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
