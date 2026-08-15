import { NextResponse } from "next/server";

import { INVOICE_STATUSES } from "@/features/invoices/lib/invoice";
import { DEFAULT_INVOICE_SETTINGS } from "@/features/invoices/lib/invoice-settings";
import { notifyOrgStaff } from "@/features/notifications/lib/notify-org-staff";
import { dueDateFromPaymentTerms } from "@/features/quotes/lib/quote-status";
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
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string | null;
      customerId?: string | null;
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

    const projectId = emptyToNull(body.projectId);
    let customerId = emptyToNull(body.customerId);

    if (!projectId && !customerId) {
      return NextResponse.json(
        { error: "project_or_customer_required" },
        { status: 400 },
      );
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

    if (projectId) {
      const { data: project } = await admin
        .from("projects")
        .select("id, customer_id")
        .eq("organization_id", gate.organizationId)
        .eq("id", projectId)
        .maybeSingle();

      if (!project) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (!customerId) {
        customerId = project.customer_id;
      }
    }

    if (customerId) {
      const { data: customer } = await admin
        .from("customers")
        .select("id")
        .eq("organization_id", gate.organizationId)
        .eq("id", customerId)
        .maybeSingle();

      if (!customer) {
        return NextResponse.json({ error: "customer_not_found" }, { status: 404 });
      }
    } else if (!projectId) {
      return NextResponse.json(
        { error: "project_or_customer_required" },
        { status: 400 },
      );
    }

    const issueDate =
      emptyToNull(body.issueDate) ?? new Date().toISOString().slice(0, 10);
    let dueDate = emptyToNull(body.dueDate);
    let notes = emptyToNull(body.notes);

    const { data: orgSettings, error: orgSettingsError } = await admin
      .from("organizations")
      .select(
        "invoice_default_payment_terms_days, invoice_default_notes",
      )
      .eq("id", gate.organizationId)
      .maybeSingle();

    if (!dueDate) {
      const terms =
        (!orgSettingsError
          ? orgSettings?.invoice_default_payment_terms_days
          : null) ?? DEFAULT_INVOICE_SETTINGS.defaultPaymentTermsDays;
      dueDate = dueDateFromPaymentTerms(issueDate, terms);
    }
    if (!notes && !orgSettingsError && orgSettings?.invoice_default_notes?.trim()) {
      notes = orgSettings.invoice_default_notes.trim();
    }

    // Empty title → DB trigger copies invoice_number
    const title = body.title?.trim() ?? "";

    const { data, error } = await admin
      .from("invoices")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        customer_id: customerId,
        quote_id: emptyToNull(body.quoteId),
        title,
        status,
        issue_date: issueDate,
        due_date: dueDate,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        subtotal_cents: subtotalCents,
        vat_cents: vatCents,
        total_cents: totalCents,
        notes,
        created_by: gate.userId,
      })
      .select("id, invoice_number, title")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (status === "sent" || status === "paid") {
      await notifyOrgStaff(admin, {
        organizationId: gate.organizationId,
        actorUserId: gate.userId,
        type: status === "paid" ? "invoice_paid" : "invoice_sent",
        title: status === "paid" ? "Factuur betaald" : "Factuur verstuurd",
        body: data.title || data.invoice_number,
        entityType: "invoice",
        entityId: data.id,
        projectId,
      });
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
      .select("id, status, title, project_id, invoice_number")
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

    if (body.title !== undefined) {
      const nextTitle = body.title.trim();
      patch.title = nextTitle || existing.invoice_number;
    }
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

    if (
      body.status &&
      body.status !== existing.status &&
      (body.status === "sent" || body.status === "paid")
    ) {
      await notifyOrgStaff(admin, {
        organizationId: gate.organizationId,
        actorUserId: gate.userId,
        type: body.status === "paid" ? "invoice_paid" : "invoice_sent",
        title: body.status === "paid" ? "Factuur betaald" : "Factuur verstuurd",
        body: existing.title,
        entityType: "invoice",
        entityId: existing.id,
        projectId: existing.project_id,
      });
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
