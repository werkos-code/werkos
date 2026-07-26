import { NextResponse } from "next/server";

import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const body = (await request.json()) as {
      lineIds?: string[];
      setProjectExecution?: boolean;
    };

    const lineIds = (body.lineIds ?? []).map((id) => id.trim()).filter(Boolean);
    const setProjectExecution = body.setProjectExecution !== false;

    const admin = createAdminClient();
    const { data: quote } = await admin
      .from("quotes")
      .select("id, status, project_id, organization_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!quote) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (quote.status !== "sent" && quote.status !== "draft") {
      return NextResponse.json({ error: "cannot_accept" }, { status: 409 });
    }

    const { data: lines } = await admin
      .from("quote_lines")
      .select("id, title, parent_id")
      .eq("organization_id", gate.organizationId)
      .eq("quote_id", quoteId);

    const allLines = lines ?? [];
    const parentIds = new Set(
      allLines.map((l) => l.parent_id).filter(Boolean) as string[],
    );
    const leafLines = allLines.filter((l) => !parentIds.has(l.id));

    const selected =
      lineIds.length > 0
        ? leafLines.filter((l) => lineIds.includes(l.id))
        : leafLines;

    const { error: statusError } = await admin
      .from("quotes")
      .update({ status: "accepted" })
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId);

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    if (selected.length > 0) {
      const { error: workError } = await admin.from("work_items").insert(
        selected.map((line, index) => ({
          id: crypto.randomUUID(),
          organization_id: gate.organizationId,
          project_id: quote.project_id,
          title: line.title.trim() || "Werkzaamheid",
          status: "open" as const,
          quote_line_id: line.id,
          sort_order: index,
          created_by: gate.userId,
        })),
      );

      if (workError) {
        return NextResponse.json({ error: workError.message }, { status: 500 });
      }
    }

    if (setProjectExecution) {
      const { error: projectError } = await admin
        .from("projects")
        .update({ status: "execution" })
        .eq("organization_id", gate.organizationId)
        .eq("id", quote.project_id);

      if (projectError) {
        return NextResponse.json(
          { error: projectError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      workItemCount: selected.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "accept_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
