import { NextResponse } from "next/server";

import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
    const body = (await request.json()) as { body?: string };
    const note = body.body?.trim() ?? "";

    if (!note) {
      return NextResponse.json({ error: "note_required" }, { status: 400 });
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
      .from("project_activities")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        type: "note",
        title: "Notitie",
        body: note,
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activityId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "note_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
