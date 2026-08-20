import { NextResponse } from "next/server";

import {
  billableLines,
  computeQuoteTotals,
} from "@/features/quotes/lib/quote-line";
import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import {
  maybeTrackFirstProjectCreated,
  maybeTrackFirstQuoteCreated,
} from "@/lib/analytics/first-conversions";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function resolveCustomer(input: {
  name: string;
  company?: string;
}): { customerName: string; contactName: string | null } {
  const person = input.name.trim();
  const company = input.company?.trim() ?? "";
  if (company && person) {
    return { customerName: company, contactName: person };
  }
  if (company) return { customerName: company, contactName: null };
  return { customerName: person, contactName: null };
}

function buildIntakeBody(input: {
  projectType: string;
  location?: string;
  description?: string;
  particulars?: string;
}) {
  const parts: string[] = [];
  if (input.projectType.trim()) {
    parts.push(`Soort project: ${input.projectType.trim()}`);
  }
  if (input.location?.trim()) {
    parts.push(`Locatie: ${input.location.trim()}`);
  }
  if (input.description?.trim()) {
    parts.push(`Wensen: ${input.description.trim()}`);
  }
  if (input.particulars?.trim()) {
    parts.push(`Bijzonderheden: ${input.particulars.trim()}`);
  }
  return parts.join("\n");
}

function mapIncomingLines(
  lines: Array<Record<string, unknown>>,
): QuoteLineRow[] {
  return lines.map((line, index) => ({
    id: String(line.id ?? crypto.randomUUID()),
    parentId: (line.parentId as string | null) ?? null,
    sortOrder: Number(line.sortOrder ?? index),
    title: String(line.title ?? ""),
    description: (line.description as string | null) ?? null,
    lineType: (line.lineType as QuoteLineRow["lineType"]) ?? "article",
    articleId: (line.articleId as string | null) ?? null,
    quantity:
      line.quantity === null || line.quantity === undefined
        ? null
        : Number(line.quantity),
    unit: (line.unit as string | null) ?? null,
    unitPriceCents:
      line.unitPriceCents === null || line.unitPriceCents === undefined
        ? null
        : Math.round(Number(line.unitPriceCents)),
    costPriceCents:
      line.costPriceCents === null || line.costPriceCents === undefined
        ? null
        : Math.round(Number(line.costPriceCents)),
    vatRateBps: Number(line.vatRateBps ?? 2100),
    discountCents: Number(line.discountCents ?? 0),
    estimatedMinutes:
      line.estimatedMinutes === null || line.estimatedMinutes === undefined
        ? null
        : Math.round(Number(line.estimatedMinutes)),
  }));
}

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      customer?: {
        existingId?: string | null;
        name?: string;
        company?: string;
        phone?: string;
        email?: string;
        address?: string;
      };
      request?: {
        projectType?: string;
        projectName?: string;
        location?: string;
        description?: string;
        particulars?: string;
        internalNotes?: string;
      };
      calculation?: {
        lines?: Array<Record<string, unknown>>;
        marginPercent?: number;
      };
    };

    const personName = body.customer?.name?.trim() ?? "";
    if (!personName) {
      return NextResponse.json({ error: "customer_name_required" }, { status: 400 });
    }

    const projectName = body.request?.projectName?.trim() ?? "";
    if (!projectName) {
      return NextResponse.json({ error: "project_name_required" }, { status: 400 });
    }

    const { customerName, contactName } = resolveCustomer({
      name: personName,
      company: body.customer?.company,
    });

    const admin = createAdminClient();
    let customerId = body.customer?.existingId?.trim() || null;

    if (customerId) {
      const { data: existing } = await admin
        .from("customers")
        .select("id")
        .eq("organization_id", gate.organizationId)
        .eq("id", customerId)
        .maybeSingle();
      if (!existing) {
        return NextResponse.json({ error: "customer_not_found" }, { status: 400 });
      }
    } else {
      customerId = crypto.randomUUID();
      const { error: customerError } = await admin.from("customers").insert({
        id: customerId,
        organization_id: gate.organizationId,
        name: customerName,
        email: emptyToNull(body.customer?.email),
        phone: emptyToNull(body.customer?.phone),
        address: emptyToNull(body.customer?.address),
        created_by: gate.userId,
      });
      if (customerError) {
        return NextResponse.json(
          { error: customerError.message },
          { status: 500 },
        );
      }
    }

    const projectId = crypto.randomUUID();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        id: projectId,
        organization_id: gate.organizationId,
        customer_id: customerId,
        name: projectName,
        status: "preparation",
        notes: emptyToNull(body.request?.internalNotes),
        contact_name: contactName ?? personName,
        contact_email: emptyToNull(body.customer?.email),
        contact_phone: emptyToNull(body.customer?.phone),
        created_by: gate.userId,
      })
      .select("id, project_number, name")
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: projectError?.message ?? "project_create_failed" },
        { status: 500 },
      );
    }

    const intakeBody = buildIntakeBody({
      projectType: body.request?.projectType ?? "",
      location: body.request?.location,
      description: body.request?.description,
      particulars: body.request?.particulars,
    });

    if (intakeBody) {
      await logProjectActivity(admin, {
        organizationId: gate.organizationId,
        projectId,
        type: "note",
        title: "Aanvraag vastgelegd",
        body: intakeBody,
        metadata: {
          source: "new_assignment_wizard",
          project_type: body.request?.projectType ?? null,
          location: body.request?.location ?? null,
        },
        createdBy: gate.userId,
      });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "project_created",
      title: "Opdracht gestart",
      body: project.name,
      metadata: {
        project_number: project.project_number,
        source: "new_assignment_wizard",
      },
      createdBy: gate.userId,
    });

    const marginPercent = body.calculation?.marginPercent ?? 0;
    const parsedLines = mapIncomingLines(body.calculation?.lines ?? []);
    const lines = billableLines(parsedLines);
    const totals = computeQuoteTotals(parsedLines, marginPercent);

    const quoteId = crypto.randomUUID();
    const quoteTitle =
      body.request?.projectType?.trim() || `Offerte — ${projectName}`;

    const { error: quoteError } = await admin.from("quotes").insert({
      id: quoteId,
      organization_id: gate.organizationId,
      project_id: projectId,
      title: quoteTitle,
      status: "draft",
      payment_terms_days: 30,
      internal_notes:
        marginPercent > 0
          ? `Marge: ${marginPercent}% (${(totals.marginCents / 100).toFixed(2)} excl. btw)`
          : null,
      created_by: gate.userId,
    });

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    const lineRows = lines.map((line) => ({
      id: line.id,
      organization_id: gate.organizationId,
      quote_id: quoteId,
      parent_id: line.parentId,
      sort_order: line.sortOrder,
      title: line.title.trim(),
      description: line.description,
      line_type: line.lineType ?? "article",
      article_id: line.articleId,
      quantity: line.quantity,
      unit: line.unit,
      unit_price_cents:
        line.unitPriceCents === null ? null : Math.round(line.unitPriceCents),
      cost_price_cents:
        line.costPriceCents === null || line.costPriceCents === undefined
          ? null
          : Math.round(line.costPriceCents),
      vat_rate_bps: line.vatRateBps,
      discount_cents: line.discountCents,
      estimated_minutes: line.estimatedMinutes,
    }));

    if (marginPercent > 0 && totals.marginCents > 0) {
      lineRows.push({
        id: crypto.randomUUID(),
        organization_id: gate.organizationId,
        quote_id: quoteId,
        parent_id: null,
        sort_order: lineRows.length,
        title: "Marge",
        description: null,
        line_type: "article" as const,
        article_id: null,
        quantity: 1,
        unit: "post",
        unit_price_cents: totals.marginCents,
        cost_price_cents: null,
        vat_rate_bps: 2100,
        discount_cents: 0,
        estimated_minutes: null,
      });
    }

    if (lineRows.length > 0) {
      const { error: linesError } = await admin
        .from("quote_lines")
        .insert(lineRows);

      if (linesError) {
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    } else {
      await admin.from("quote_lines").insert({
        id: crypto.randomUUID(),
        organization_id: gate.organizationId,
        quote_id: quoteId,
        parent_id: null,
        sort_order: 0,
        title: "",
        quantity: 1,
        unit: "st",
        unit_price_cents: 0,
        vat_rate_bps: 2100,
        discount_cents: 0,
        estimated_minutes: null,
      });
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "quote_created",
      title: "Conceptofferte aangemaakt",
      body: `${quoteTitle} · ${(totals.net / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" })} excl. btw`,
      metadata: {
        quote_id: quoteId,
        status: "draft",
        line_count: lines.length,
        total_excl_cents: totals.net,
        source: "new_assignment_wizard",
      },
      createdBy: gate.userId,
    });

    await maybeTrackFirstProjectCreated({
      organizationId: gate.organizationId,
      userId: gate.userId,
      projectId,
    });
    await maybeTrackFirstQuoteCreated({
      organizationId: gate.organizationId,
      userId: gate.userId,
      quoteId,
    });

    return NextResponse.json({
      projectId,
      quoteId,
      projectNumber: project.project_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "complete_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
