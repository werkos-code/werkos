import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
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

    const { error } = await admin.from("project_favorites").upsert({
      organization_id: gate.organizationId,
      project_id: projectId,
      user_id: gate.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorited: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "favorite_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId } = await params;
    const admin = createAdminClient();

    const { error } = await admin
      .from("project_favorites")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId)
      .eq("user_id", gate.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorited: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "favorite_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
