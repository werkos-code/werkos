import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkItemStatus } from "@/types/database";

const WORK_ITEM_STATUSES: WorkItemStatus[] = ["open", "done"];

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
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

    const { data: maxSort } = await admin
      .from("work_items")
      .select("sort_order")
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await admin
      .from("work_items")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        title,
        status: "open",
        sort_order: (maxSort?.sort_order ?? -1) + 1,
        created_by: gate.userId,
      })
      .select("id, title, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "work_item_created",
      title: "Werkzaamheid toegevoegd",
      body: title,
      metadata: { work_item_id: data.id },
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
      existing.status !== nextStatus
    ) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: existing.project_id,
        type: "work_item_updated",
        title:
          existing.status !== nextStatus
            ? "Werkzaamheid heropend"
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
