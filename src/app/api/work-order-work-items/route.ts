import { NextResponse } from "next/server";

import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const workOrderId =
      new URL(request.url).searchParams.get("workOrderId")?.trim() ?? "";
    if (!workOrderId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("work_orders")
      .select("project_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", workOrderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [{ data: links }, { data: items }] = await Promise.all([
      admin
        .from("work_order_work_items")
        .select("work_item_id")
        .eq("organization_id", gate.organizationId)
        .eq("work_order_id", workOrderId),
      admin
        .from("work_items")
        .select("id, title, is_group")
        .eq("organization_id", gate.organizationId)
        .eq("project_id", order.project_id)
        .eq("is_group", false)
        .order("title"),
    ]);

    return NextResponse.json({
      linkedWorkItemIds: (links ?? []).map((row) => row.work_item_id),
      workItems: (items ?? []).map((row) => ({
        id: row.id,
        title: row.title,
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
      workOrderId?: string;
      workItemId?: string;
    };

    const workOrderId = body.workOrderId?.trim() ?? "";
    const workItemId = body.workItemId?.trim() ?? "";
    if (!workOrderId || !workItemId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const [{ data: order }, { data: item }] = await Promise.all([
      admin
        .from("work_orders")
        .select("project_id")
        .eq("organization_id", gate.organizationId)
        .eq("id", workOrderId)
        .maybeSingle(),
      admin
        .from("work_items")
        .select("project_id, is_group")
        .eq("organization_id", gate.organizationId)
        .eq("id", workItemId)
        .maybeSingle(),
    ]);

    if (!order || !item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (item.is_group) {
      return NextResponse.json({ error: "group_not_allowed" }, { status: 400 });
    }
    if (order.project_id !== item.project_id) {
      return NextResponse.json({ error: "project_mismatch" }, { status: 400 });
    }

    const { error } = await admin.from("work_order_work_items").upsert(
      {
        organization_id: gate.organizationId,
        work_order_id: workOrderId,
        work_item_id: workItemId,
      },
      { onConflict: "work_order_id,work_item_id" },
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "link_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const workOrderId =
      new URL(request.url).searchParams.get("workOrderId")?.trim() ?? "";
    const workItemId =
      new URL(request.url).searchParams.get("workItemId")?.trim() ?? "";
    if (!workOrderId || !workItemId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("work_order_work_items")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("work_order_id", workOrderId)
      .eq("work_item_id", workItemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unlink_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
