import { NextResponse } from "next/server";

import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StockLocationKind } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

const KINDS: StockLocationKind[] = [
  "warehouse",
  "vehicle",
  "project_site",
  "other",
];

export async function GET() {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("stock_locations")
      .select("id, name, code, kind, is_active")
      .eq("organization_id", gate.organizationId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      locations: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        kind: row.kind,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      name?: string;
      code?: string | null;
      kind?: StockLocationKind;
      projectId?: string | null;
      isActive?: boolean;
      notes?: string | null;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const kind = KINDS.includes(body.kind as StockLocationKind)
      ? (body.kind as StockLocationKind)
      : "warehouse";

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("stock_locations")
      .insert({
        organization_id: gate.organizationId,
        name,
        code: emptyToNull(body.code),
        kind,
        project_id: emptyToNull(body.projectId),
        is_active: body.isActive !== false,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ locationId: data.id });
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
      name?: string;
      code?: string | null;
      kind?: StockLocationKind;
      projectId?: string | null;
      isActive?: boolean;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!id || !name) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const kind = KINDS.includes(body.kind as StockLocationKind)
      ? (body.kind as StockLocationKind)
      : "warehouse";

    const admin = createAdminClient();
    const { error } = await admin
      .from("stock_locations")
      .update({
        name,
        code: emptyToNull(body.code),
        kind,
        project_id: emptyToNull(body.projectId),
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

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("stock_locations")
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
