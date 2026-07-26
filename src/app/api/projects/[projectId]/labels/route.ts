import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
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
      .from("project_labels")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        name,
      })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "duplicate_label" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "project_updated",
      title: "Label toegevoegd",
      body: data.name,
      metadata: { label_id: data.id, action: "label_added" },
      createdBy: gate.userId,
    });

    return NextResponse.json({ label: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "label_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
