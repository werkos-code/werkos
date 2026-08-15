import { NextResponse } from "next/server";

import { parseQuantity } from "@/features/materials/lib/materials";
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
      projectId?: string;
      workItemId?: string | null;
      articleId?: string | null;
      title?: string;
      estimatedQuantity?: number | string;
      unit?: string;
      notes?: string | null;
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    const qty = parseQuantity(body.estimatedQuantity) ?? 0;
    if (!projectId || !title) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (qty < 0) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }

    const admin = createAdminClient();
    const workItemId = emptyToNull(body.workItemId);
    if (workItemId) {
      const { data: item } = await admin
        .from("work_items")
        .select("id, is_group, project_id")
        .eq("organization_id", gate.organizationId)
        .eq("id", workItemId)
        .maybeSingle();
      if (!item || item.project_id !== projectId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (item.is_group) {
        return NextResponse.json({ error: "group_not_allowed" }, { status: 400 });
      }
    }

    const countQuery = admin
      .from("project_material_lines")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId);

    const { count } = workItemId
      ? await countQuery.eq("work_item_id", workItemId)
      : await countQuery.is("work_item_id", null);

    const { data, error } = await admin
      .from("project_material_lines")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        work_item_id: workItemId,
        article_id: emptyToNull(body.articleId),
        title,
        estimated_quantity: qty,
        unit: emptyToNull(body.unit) ?? "st",
        notes: emptyToNull(body.notes),
        sort_order: count ?? 0,
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lineId: data.id });
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
      articleId?: string | null;
      title?: string;
      estimatedQuantity?: number | string;
      unit?: string;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!id || !title) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const qty = parseQuantity(body.estimatedQuantity);
    if (qty == null || qty < 0) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("project_material_lines")
      .update({
        article_id: emptyToNull(body.articleId),
        title,
        estimated_quantity: qty,
        unit: emptyToNull(body.unit) ?? "st",
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
      .from("project_material_lines")
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
