import { NextResponse } from "next/server";

import { centsFromEuroInput } from "@/features/materials/lib/materials";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      code?: string | null;
      name?: string;
      description?: string | null;
      unit?: string;
      category?: string | null;
      barcode?: string | null;
      trackStock?: boolean;
      purchasePrice?: string | number | null;
      salePrice?: string | number | null;
      isActive?: boolean;
      notes?: string | null;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("articles")
      .insert({
        organization_id: gate.organizationId,
        code: emptyToNull(body.code),
        name,
        description: emptyToNull(body.description),
        unit: emptyToNull(body.unit) ?? "st",
        category: emptyToNull(body.category),
        barcode: emptyToNull(body.barcode),
        track_stock: body.trackStock !== false,
        purchase_price_cents: centsFromEuroInput(body.purchasePrice ?? null),
        sale_price_cents: centsFromEuroInput(body.salePrice ?? null),
        is_active: body.isActive !== false,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articleId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      code?: string | null;
      name?: string;
      description?: string | null;
      unit?: string;
      category?: string | null;
      barcode?: string | null;
      trackStock?: boolean;
      purchasePrice?: string | number | null;
      salePrice?: string | number | null;
      isActive?: boolean;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!id || !name) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("articles")
      .update({
        code: emptyToNull(body.code),
        name,
        description: emptyToNull(body.description),
        unit: emptyToNull(body.unit) ?? "st",
        category: emptyToNull(body.category),
        barcode: emptyToNull(body.barcode),
        track_stock: body.trackStock !== false,
        purchase_price_cents: centsFromEuroInput(body.purchasePrice ?? null),
        sale_price_cents: centsFromEuroInput(body.salePrice ?? null),
        is_active: body.isActive !== false,
        notes: emptyToNull(body.notes),
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

export async function DELETE(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const id =
      new URL(request.url).searchParams.get("id")?.trim() ??
      ((await request.json().catch(() => ({}))) as { id?: string }).id?.trim() ??
      "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("articles")
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
