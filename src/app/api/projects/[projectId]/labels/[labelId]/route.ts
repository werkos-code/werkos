import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = {
  params: Promise<{ projectId: string; labelId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const { projectId, labelId } = await params;
    const admin = createAdminClient();

    const { data: label } = await admin
      .from("project_labels")
      .select("id, name")
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId)
      .eq("id", labelId)
      .maybeSingle();

    if (!label) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error } = await admin
      .from("project_labels")
      .delete()
      .eq("organization_id", gate.organizationId)
      .eq("id", labelId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "project_updated",
      title: "Label verwijderd",
      body: label.name,
      metadata: { label_id: label.id, action: "label_removed" },
      createdBy: gate.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
