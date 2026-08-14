import { NextResponse } from "next/server";

import { notifyOrgStaff } from "@/features/notifications/lib/notify-org-staff";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
} from "@/features/planning/lib/planning";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppointmentStatus, AppointmentType } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseIso(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function syncWorkItemDates(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  workItemId: string | null,
  startsAt: string,
  endsAt: string,
) {
  if (!workItemId) return;
  const startDate = startsAt.slice(0, 10);
  const endDate = endsAt.slice(0, 10);
  await admin
    .from("work_items")
    .update({
      planned_start: startDate,
      planned_end: endDate,
    })
    .eq("organization_id", organizationId)
    .eq("id", workItemId);
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      title?: string;
      startsAt?: string;
      endsAt?: string;
      allDay?: boolean;
      status?: AppointmentStatus;
      type?: AppointmentType;
      projectId?: string | null;
      workItemId?: string | null;
      assigneeUserId?: string | null;
      location?: string | null;
      notes?: string | null;
    };

    const title = body.title?.trim() ?? "";
    const startsAt = parseIso(body.startsAt);
    const endsAt = parseIso(body.endsAt);
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    if (!startsAt || !endsAt) {
      return NextResponse.json({ error: "invalid_time" }, { status: 400 });
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }

    const status = body.status ?? "planned";
    const type = body.type ?? "work";
    if (!APPOINTMENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    if (!APPOINTMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("appointments")
      .insert({
        organization_id: gate.organizationId,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: Boolean(body.allDay),
        status,
        type,
        project_id: emptyToNull(body.projectId),
        work_item_id: emptyToNull(body.workItemId),
        assignee_user_id: emptyToNull(body.assigneeUserId),
        location: emptyToNull(body.location),
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await syncWorkItemDates(
      admin,
      gate.organizationId,
      emptyToNull(body.workItemId),
      startsAt,
      endsAt,
    );

    const assigneeId = emptyToNull(body.assigneeUserId);
    await notifyOrgStaff(admin, {
      organizationId: gate.organizationId,
      actorUserId: gate.userId,
      type: "appointment_created",
      title: "Planning gewijzigd",
      body: title,
      entityType: "appointment",
      entityId: data.id,
      projectId: emptyToNull(body.projectId),
      extraRecipientIds: assigneeId ? [assigneeId] : [],
    });

    return NextResponse.json({ appointmentId: data.id });
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
      startsAt?: string;
      endsAt?: string;
      allDay?: boolean;
      status?: AppointmentStatus;
      type?: AppointmentType;
      projectId?: string | null;
      workItemId?: string | null;
      assigneeUserId?: string | null;
      location?: string | null;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (body.status && !APPOINTMENT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    if (body.type && !APPOINTMENT_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("appointments")
      .select(
        "id, title, starts_at, ends_at, work_item_id, project_id, assignee_user_id, status",
      )
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const startsAt =
      body.startsAt !== undefined
        ? parseIso(body.startsAt)
        : existing.starts_at;
    const endsAt =
      body.endsAt !== undefined ? parseIso(body.endsAt) : existing.ends_at;

    if (!startsAt || !endsAt) {
      return NextResponse.json({ error: "invalid_time" }, { status: 400 });
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }

    const nextWorkItemId =
      body.workItemId !== undefined
        ? emptyToNull(body.workItemId)
        : existing.work_item_id;

    const { error } = await admin
      .from("appointments")
      .update({
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        starts_at: startsAt,
        ends_at: endsAt,
        ...(body.allDay !== undefined ? { all_day: Boolean(body.allDay) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.projectId !== undefined
          ? { project_id: emptyToNull(body.projectId) }
          : {}),
        ...(body.workItemId !== undefined
          ? { work_item_id: emptyToNull(body.workItemId) }
          : {}),
        ...(body.assigneeUserId !== undefined
          ? { assignee_user_id: emptyToNull(body.assigneeUserId) }
          : {}),
        ...(body.location !== undefined
          ? { location: emptyToNull(body.location) }
          : {}),
        ...(body.notes !== undefined ? { notes: emptyToNull(body.notes) } : {}),
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await syncWorkItemDates(
      admin,
      gate.organizationId,
      nextWorkItemId,
      startsAt,
      endsAt,
    );

    const nextTitle =
      body.title !== undefined ? body.title.trim() : existing.title;
    const nextAssignee =
      body.assigneeUserId !== undefined
        ? emptyToNull(body.assigneeUserId)
        : existing.assignee_user_id;
    const timeChanged =
      startsAt !== existing.starts_at || endsAt !== existing.ends_at;
    const assigneeChanged = nextAssignee !== existing.assignee_user_id;
    const statusChanged =
      body.status !== undefined && body.status !== existing.status;

    if (assigneeChanged && nextAssignee) {
      await notifyOrgStaff(admin, {
        organizationId: gate.organizationId,
        actorUserId: gate.userId,
        type: "appointment_assigned",
        title: "Je bent ingepland",
        body: nextTitle,
        entityType: "appointment",
        entityId: existing.id,
        projectId: existing.project_id,
        extraRecipientIds: [nextAssignee],
        audience: "assignees",
      });
    } else if (timeChanged || statusChanged || body.title !== undefined) {
      await notifyOrgStaff(admin, {
        organizationId: gate.organizationId,
        actorUserId: gate.userId,
        type: "appointment_updated",
        title: "Planning gewijzigd",
        body: nextTitle,
        entityType: "appointment",
        entityId: existing.id,
        projectId: existing.project_id,
        extraRecipientIds: nextAssignee ? [nextAssignee] : [],
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
    const { error } = await admin
      .from("appointments")
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
