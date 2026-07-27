import { NextResponse } from "next/server";

import { listBillableProjectSources } from "@/features/invoices/invoices-actions";
import { DEFAULT_HOURLY_RATE_CENTS } from "@/features/invoices/lib/invoice-pricing";
import { recomputeInvoiceTotals } from "@/features/invoices/lib/recompute-invoice-totals";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseHourlyRate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_HOURLY_RATE_CENTS;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }

    const hourlyRateCents = parseHourlyRate(
      searchParams.get("hourlyRateCents"),
    );
    if (hourlyRateCents == null) {
      return NextResponse.json({ error: "invalid_rate" }, { status: 400 });
    }

    const result = await listBillableProjectSources(projectId, hourlyRateCents);
    if (result.error) {
      const status = result.error === "project_not_found" ? 404 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ sources: result.sources ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "load_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      projectId?: string;
      title?: string;
      issueDate?: string;
      dueDate?: string | null;
      notes?: string | null;
      hourlyRateCents?: number;
      selectedKeys?: string[];
    };

    const projectId = body.projectId?.trim() ?? "";
    const title = body.title?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }

    const hourlyRateCents = parseHourlyRate(body.hourlyRateCents);
    if (hourlyRateCents == null) {
      return NextResponse.json({ error: "invalid_rate" }, { status: 400 });
    }

    const selectedKeys = new Set(body.selectedKeys ?? []);
    if (selectedKeys.size === 0) {
      return NextResponse.json({ error: "no_lines_selected" }, { status: 400 });
    }

    const sourcesResult = await listBillableProjectSources(
      projectId,
      hourlyRateCents,
    );
    if (sourcesResult.error) {
      const status =
        sourcesResult.error === "project_not_found" ? 404 : 500;
      return NextResponse.json({ error: sourcesResult.error }, { status });
    }

    const lines = (sourcesResult.sources ?? []).filter((line) =>
      selectedKeys.has(line.key),
    );
    if (lines.length === 0) {
      return NextResponse.json({ error: "no_lines_selected" }, { status: 400 });
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

    const { data: invoice, error: invoiceError } = await admin
      .from("invoices")
      .insert({
        organization_id: gate.organizationId,
        project_id: projectId,
        title,
        status: "draft",
        issue_date: issueDate,
        due_date: emptyToNull(body.dueDate),
        subtotal_cents: 0,
        vat_cents: 0,
        total_cents: 0,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message ?? "create_failed" },
        { status: 500 },
      );
    }

    const lineRows = lines.map((line, index) => ({
      id: crypto.randomUUID(),
      organization_id: gate.organizationId,
      invoice_id: invoice.id,
      parent_id: null,
      sort_order: index,
      title: line.title,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unit_price_cents: line.unitPriceCents,
      vat_rate_bps: line.vatRateBps,
      discount_cents: 0,
    }));

    const { error: linesError } = await admin
      .from("invoice_lines")
      .insert(lineRows);

    if (linesError) {
      await admin
        .from("invoices")
        .delete()
        .eq("organization_id", gate.organizationId)
        .eq("id", invoice.id);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const recompute = await recomputeInvoiceTotals(
      admin,
      gate.organizationId,
      invoice.id,
    );
    if (recompute.error) {
      return NextResponse.json({ error: recompute.error }, { status: 500 });
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
