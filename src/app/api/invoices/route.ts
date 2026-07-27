import { NextResponse } from "next/server";

import { INVOICE_STATUSES } from "@/features/invoices/lib/invoice";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceStatus } from "@/types/database";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseCents(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function eurosToCents(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      quoteId?: string | null;
      title?: string;
      status?: InvoiceStatus;
      issueDate?: string;
      dueDate?: string | null;
      totalEuros?: number | string;
      vatEuros?: number | string;
      notes?: string | null;
      editorMode?: boolean;
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    const status = body.status ?? "draft";
    if (!INVOICE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const editorMode = body.editorMode === true;
    let totalCents = 0;
    let vatCents = 0;
    let subtotalCents = 0;

    if (!editorMode) {
      const parsedTotal = eurosToCents(body.totalEuros);
      const parsedVat = eurosToCents(body.vatEuros ?? 0);
      if (parsedTotal == null || parsedVat == null) {
        return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
      }
      totalCents = parsedTotal;
      vatCents = parsedVat;
      subtotalCents = Math.max(0, totalCents - vatCents);
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

    const issueDate =
      emptyToNull(body.issueDate) ??
      new Date().toISOString().slice(0, 10);
    const dueDate = emptyToNull(body.dueDate);

    const { data, error } = await admin
      .from("invoices")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        quote_id: emptyToNull(body.quoteId),
        title,
        status,
        issue_date: issueDate,
        due_date: dueDate,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        subtotal_cents: subtotalCents,
        vat_cents: vatCents,
        total_cents: totalCents,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id, invoice_number")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      invoiceId: data.id,
      invoiceNumber: data.invoice_number,
    });
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
      status?: InvoiceStatus;
      issueDate?: string;
      dueDate?: string | null;
      notes?: string | null;
      totalCents?: number;
      vatCents?: number;
      subtotalCents?: number;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    if (body.status && !INVOICE_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("invoices")
      .select("id, status")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const patch: {
      title?: string;
      status?: InvoiceStatus;
      issue_date?: string;
      due_date?: string | null;
      notes?: string | null;
      total_cents?: number;
      vat_cents?: number;
      subtotal_cents?: number;
      paid_at?: string | null;
    } = {};

    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.issueDate !== undefined) patch.issue_date = body.issueDate;
    if (body.dueDate !== undefined) patch.due_date = emptyToNull(body.dueDate);
    if (body.notes !== undefined) patch.notes = emptyToNull(body.notes);
    if (body.totalCents !== undefined) {
      patch.total_cents = parseCents(body.totalCents) ?? 0;
    }
    if (body.vatCents !== undefined) {
      patch.vat_cents = parseCents(body.vatCents) ?? 0;
    }
    if (body.subtotalCents !== undefined) {
      patch.subtotal_cents = parseCents(body.subtotalCents) ?? 0;
    }
    if (body.status !== undefined) {
      patch.status = body.status;
      if (body.status === "paid" && existing.status !== "paid") {
        patch.paid_at = new Date().toISOString();
      } else if (body.status !== "paid") {
        patch.paid_at = null;
      }
    }

    const { error } = await admin
      .from("invoices")
      .update(patch)
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
      .from("invoices")
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
