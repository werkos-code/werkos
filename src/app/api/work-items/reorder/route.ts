import { NextResponse } from "next/server";

import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type ReorderItem = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      items?: ReorderItem[];
    };

    const projectId = body.projectId?.trim() ?? "";
    const items = body.items ?? [];
    if (!projectId || items.length === 0) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
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

    const ids = items.map((item) => item.id);
    const { data: existing } = await admin
      .from("work_items")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("project_id", projectId)
      .in("id", ids);

    if ((existing ?? []).length !== ids.length) {
      return NextResponse.json({ error: "invalid_items" }, { status: 400 });
    }

    const updates = await Promise.all(
      items.map((item) =>
        admin
          .from("work_items")
          .update({
            parent_id: item.parentId,
            sort_order: Math.max(0, Math.round(item.sortOrder)),
          })
          .eq("organization_id", gate.organizationId)
          .eq("project_id", projectId)
          .eq("id", item.id),
      ),
    );

    const failed = updates.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reorder_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
