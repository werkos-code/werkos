import { NextResponse } from "next/server";

import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseMinutes(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const url = new URL(request.url);
    const workItemId = url.searchParams.get("workItemId")?.trim() ?? "";
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    if (!workItemId && !projectId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    let query = admin
      .from("time_entries")
      .select(
        "id, project_id, work_item_id, work_order_id, user_id, work_date, minutes, notes, created_at",
      )
      .eq("organization_id", gate.organizationId)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (workItemId) query = query.eq("work_item_id", workItemId);
    if (projectId) query = query.eq("project_id", projectId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [
      ...new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
    ];
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      for (const profile of profiles ?? []) {
        nameById.set(profile.id, profile.full_name?.trim() || "—");
      }
    }

    return NextResponse.json({
      entries: (data ?? []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        workItemId: row.work_item_id,
        workOrderId: row.work_order_id,
        userId: row.user_id,
        userName: nameById.get(row.user_id) ?? "—",
        workDate: row.work_date,
        minutes: row.minutes,
        notes: row.notes,
        createdAt: row.created_at,
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
      workItemId?: string;
      workOrderId?: string | null;
      userId?: string | null;
      workDate?: string;
      minutes?: number;
      notes?: string | null;
    };

    const workItemId = body.workItemId?.trim() ?? "";
    const minutes = parseMinutes(body.minutes);
    if (!workItemId || minutes == null) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: item } = await admin
      .from("work_items")
      .select("id, project_id, is_group")
      .eq("organization_id", gate.organizationId)
      .eq("id", workItemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (item.is_group) {
      return NextResponse.json({ error: "group_not_allowed" }, { status: 400 });
    }

    const userId = emptyToNull(body.userId) ?? gate.userId;
    const workDate =
      emptyToNull(body.workDate) ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("time_entries")
      .insert({
        organization_id: gate.organizationId,
        project_id: item.project_id,
        work_item_id: workItemId,
        work_order_id: emptyToNull(body.workOrderId),
        user_id: userId,
        work_date: workDate,
        minutes,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entryId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("time_entries")
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
