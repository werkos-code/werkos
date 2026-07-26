import { NextResponse } from "next/server";

import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
} from "@/features/work-orders/lib/work-order";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkOrderPriority, WorkOrderStatus } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseMinutes(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseIso(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
      description?: string | null;
      status?: WorkOrderStatus;
      priority?: WorkOrderPriority;
      workType?: string | null;
      assigneeUserId?: string | null;
      plannedStart?: string | null;
      estimatedMinutes?: number | null;
      checklist?: string[];
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    const status = body.status ?? "open";
    const priority = body.priority ?? "normal";
    if (!WORK_ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    if (!WORK_ORDER_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "invalid_priority" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("work_orders")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        title,
        description: emptyToNull(body.description),
        status,
        priority,
        work_type: emptyToNull(body.workType),
        assignee_user_id: emptyToNull(body.assigneeUserId),
        planned_start: parseIso(body.plannedStart),
        estimated_minutes: parseMinutes(body.estimatedMinutes),
        created_by: gate.userId,
      })
      .select("id, work_order_number")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const checklist = (body.checklist ?? [])
      .map((title) => title.trim())
      .filter(Boolean);
    if (checklist.length > 0) {
      await admin.from("work_order_checklist_items").insert(
        checklist.map((itemTitle, index) => ({
          organization_id: gate.organizationId,
          work_order_id: data.id,
          title: itemTitle,
          sort_order: index,
        })),
      );
    }

    return NextResponse.json({
      workOrderId: data.id,
      workOrderNumber: data.work_order_number,
    });
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
      title?: string;
      description?: string | null;
      status?: WorkOrderStatus;
      priority?: WorkOrderPriority;
      workType?: string | null;
      assigneeUserId?: string | null;
      plannedStart?: string | null;
      estimatedMinutes?: number | null;
      projectId?: string;
      checklistItemId?: string;
      checklistDone?: boolean;
      checklistTitle?: string;
      addChecklistTitle?: string;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (body.status && !WORK_ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    if (body.priority && !WORK_ORDER_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: "invalid_priority" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("work_orders")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (body.checklistItemId && body.checklistDone !== undefined) {
      const { error } = await admin
        .from("work_order_checklist_items")
        .update({ done: Boolean(body.checklistDone) })
        .eq("organization_id", gate.organizationId)
        .eq("work_order_id", id)
        .eq("id", body.checklistItemId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.addChecklistTitle?.trim()) {
      const { data: maxSort } = await admin
        .from("work_order_checklist_items")
        .select("sort_order")
        .eq("work_order_id", id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await admin.from("work_order_checklist_items").insert({
        organization_id: gate.organizationId,
        work_order_id: id,
        title: body.addChecklistTitle.trim(),
        sort_order: (maxSort?.sort_order ?? -1) + 1,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const { error } = await admin
      .from("work_orders")
      .update({
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined
          ? { description: emptyToNull(body.description) }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.workType !== undefined
          ? { work_type: emptyToNull(body.workType) }
          : {}),
        ...(body.assigneeUserId !== undefined
          ? { assignee_user_id: emptyToNull(body.assigneeUserId) }
          : {}),
        ...(body.plannedStart !== undefined
          ? { planned_start: parseIso(body.plannedStart) }
          : {}),
        ...(body.estimatedMinutes !== undefined
          ? { estimated_minutes: parseMinutes(body.estimatedMinutes) }
          : {}),
        ...(body.projectId !== undefined
          ? { project_id: body.projectId.trim() }
          : {}),
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
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("work_orders")
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
