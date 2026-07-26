import { NextResponse } from "next/server";

import { QUOTE_STATUSES } from "@/features/quotes/lib/quote-status";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuoteStatus } from "@/types/database";

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() || "Offerte";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    }

    const quoteId = crypto.randomUUID();
    const { error } = await admin.from("quotes").insert({
      id: quoteId,
      organization_id: gate.organizationId,
      project_id: projectId,
      title,
      status: "draft",
      created_by: gate.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quoteId });
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
      status?: QuoteStatus;
      validUntil?: string | null;
      internalNotes?: string | null;
      externalNotes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (body.status && !QUOTE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    if (body.status === "accepted") {
      return NextResponse.json(
        { error: "use_accept_endpoint" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("quotes")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error } = await admin
      .from("quotes")
      .update({
        ...(body.title !== undefined
          ? { title: body.title.trim() || "Offerte" }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.validUntil !== undefined
          ? { valid_until: body.validUntil?.trim() || null }
          : {}),
        ...(body.internalNotes !== undefined
          ? { internal_notes: body.internalNotes?.trim() || null }
          : {}),
        ...(body.externalNotes !== undefined
          ? { external_notes: body.externalNotes?.trim() || null }
          : {}),
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
