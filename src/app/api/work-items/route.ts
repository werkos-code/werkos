import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { WORK_ITEM_STATUSES } from "@/features/projects/lib/work-item";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkItemStatus } from "@/types/database";

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

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
      parentId?: string | null;
      description?: string | null;
      category?: string | null;
      assigneeUserId?: string | null;
      plannedStart?: string | null;
      plannedEnd?: string | null;
      estimatedMinutes?: number | null;
      status?: WorkItemStatus;
      asGroup?: boolean;
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
    if (!WORK_ITEM_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
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

    const parentId = emptyToNull(body.parentId);
    if (parentId) {
      const { data: parent } = await admin
        .from("work_items")
        .select("id")
        .eq("organization_id", gate.organizationId)
        .eq("project_id", projectId)
        .eq("id", parentId)
        .maybeSingle();
      if (!parent) {
        return NextResponse.json({ error: "parent_not_found" }, { status: 400 });
      }
    }

    let sortQuery = admin
      .from("work_items")
      .select("sort_order")
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1);

    sortQuery = parentId
      ? sortQuery.eq("parent_id", parentId)
      : sortQuery.is("parent_id", null);

    const { data: maxSort } = await sortQuery.maybeSingle();

    const { data, error } = await admin
      .from("work_items")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        title,
        status: body.asGroup ? "open" : status,
        parent_id: parentId,
        description: emptyToNull(body.description),
        category: emptyToNull(body.category),
        assignee_user_id: emptyToNull(body.assigneeUserId),
        planned_start: emptyToNull(body.plannedStart),
        planned_end: emptyToNull(body.plannedEnd),
        estimated_minutes: parseMinutes(body.estimatedMinutes),
        sort_order: (maxSort?.sort_order ?? -1) + 1,
        created_by: gate.userId,
      })
      .select(
        "id, title, status, parent_id, description, category, assignee_user_id, planned_start, planned_end, estimated_minutes, sort_order",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "work_item_created",
      title: body.asGroup ? "Groep toegevoegd" : "Werkzaamheid toegevoegd",
      body: title,
      metadata: { work_item_id: data.id, parent_id: parentId },
      createdBy: gate.userId,
    });

    return NextResponse.json({ workItem: data });
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
      status?: WorkItemStatus;
      description?: string | null;
      category?: string | null;
      assigneeUserId?: string | null;
      plannedStart?: string | null;
      plannedEnd?: string | null;
      estimatedMinutes?: number | null;
      parentId?: string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (body.status && !WORK_ITEM_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("work_items")
      .select("id, title, status, project_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nextTitle =
      body.title !== undefined ? body.title.trim() : existing.title;
    if (!nextTitle) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    const nextStatus = body.status ?? existing.status;

    const { error } = await admin
      .from("work_items")
      .update({
        title: nextTitle,
        status: nextStatus,
        ...(body.description !== undefined
          ? { description: emptyToNull(body.description) }
          : {}),
        ...(body.category !== undefined
          ? { category: emptyToNull(body.category) }
          : {}),
        ...(body.assigneeUserId !== undefined
          ? { assignee_user_id: emptyToNull(body.assigneeUserId) }
          : {}),
        ...(body.plannedStart !== undefined
          ? { planned_start: emptyToNull(body.plannedStart) }
          : {}),
        ...(body.plannedEnd !== undefined
          ? { planned_end: emptyToNull(body.plannedEnd) }
          : {}),
        ...(body.estimatedMinutes !== undefined
          ? { estimated_minutes: parseMinutes(body.estimatedMinutes) }
          : {}),
        ...(body.parentId !== undefined
          ? { parent_id: emptyToNull(body.parentId) }
          : {}),
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing.status !== nextStatus && nextStatus === "done") {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: existing.project_id,
        type: "work_item_completed",
        title: "Werkzaamheid voltooid",
        body: nextTitle,
        metadata: { work_item_id: id },
        createdBy: gate.userId,
      });
    } else if (
      existing.title !== nextTitle ||
      existing.status !== nextStatus ||
      body.description !== undefined ||
      body.category !== undefined ||
      body.assigneeUserId !== undefined ||
      body.plannedStart !== undefined ||
      body.plannedEnd !== undefined ||
      body.estimatedMinutes !== undefined ||
      body.parentId !== undefined
    ) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: existing.project_id,
        type: "work_item_updated",
        title:
          existing.status !== nextStatus
            ? "Werkzaamheidstatus gewijzigd"
            : "Werkzaamheid bijgewerkt",
        body: nextTitle,
        metadata: {
          work_item_id: id,
          from: existing.status,
          to: nextStatus,
        },
        createdBy: gate.userId,
      });
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
    const { data: existing } = await admin
      .from("work_items")
      .select("id, title, project_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error } = await admin
      .from("work_items")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId: existing.project_id,
      type: "work_item_updated",
      title: "Werkzaamheid verwijderd",
      body: existing.title,
      metadata: { work_item_id: id, action: "deleted" },
      createdBy: gate.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
