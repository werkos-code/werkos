import { NextResponse } from "next/server";

import {
  logProjectActivity,
  quoteStatusActivityType,
} from "@/features/projects/lib/project-activity";
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

    // Seed one empty line so the editor opens ready to type.
    const lineId = crypto.randomUUID();
    await admin.from("quote_lines").insert({
      id: lineId,
      organization_id: gate.organizationId,
      quote_id: quoteId,
      parent_id: null,
      sort_order: 0,
      title: "",
      line_type: "article",
      quantity: 1,
      unit: "st",
      unit_price_cents: 0,
      vat_rate_bps: 2100,
      discount_cents: 0,
    });

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "quote_created",
      title: "Offerte aangemaakt",
      body: title,
      metadata: { quote_id: quoteId, status: "draft" },
      createdBy: gate.userId,
    });

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
      .select("id, status, title, project_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nextTitle =
      body.title !== undefined ? body.title.trim() || "Offerte" : existing.title;
    const nextStatus = body.status ?? existing.status;

    const { error } = await admin
      .from("quotes")
      .update({
        ...(body.title !== undefined ? { title: nextTitle } : {}),
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

    if (body.status !== undefined && body.status !== existing.status) {
      const type = quoteStatusActivityType(body.status) ?? "quote_updated";
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: existing.project_id,
        type,
        title:
          type === "quote_sent"
            ? "Offerte verzonden"
            : type === "quote_rejected"
              ? "Offerte afgewezen"
              : type === "quote_cancelled"
                ? "Offerte geannuleerd"
                : "Offerte gewijzigd",
        body: nextTitle,
        metadata: {
          quote_id: id,
          from: existing.status,
          to: body.status,
        },
        createdBy: gate.userId,
      });
    } else if (
      body.title !== undefined ||
      body.validUntil !== undefined ||
      body.internalNotes !== undefined ||
      body.externalNotes !== undefined
    ) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId: existing.project_id,
        type: "quote_updated",
        title: "Offerte gewijzigd",
        body: nextTitle,
        metadata: { quote_id: id, status: nextStatus },
        createdBy: gate.userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
