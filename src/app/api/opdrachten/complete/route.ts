import { NextResponse } from "next/server";

import {
  computeCalculationTotals,
  lineNetCents,
} from "@/features/assignments/lib/calculation";
import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
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

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
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
        lines?: Array<{
          title: string;
          quantity: number;
          unit: string;
          unitPriceCents: number;
          vatRateBps: number;
        }>;
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

    const lines = (body.calculation?.lines ?? []).filter(
      (line) => line.title.trim().length > 0,
    );
    const marginPercent = body.calculation?.marginPercent ?? 0;
    const totals = computeCalculationTotals(
      lines.map((line) => ({
        id: "x",
        title: line.title,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        vatRateBps: line.vatRateBps,
      })),
      marginPercent,
    );

    const quoteId = crypto.randomUUID();
    const quoteTitle =
      body.request?.projectType?.trim() || `Offerte — ${projectName}`;

    const { error: quoteError } = await admin.from("quotes").insert({
      id: quoteId,
      organization_id: gate.organizationId,
      project_id: projectId,
      title: quoteTitle,
      status: "draft",
      internal_notes:
        marginPercent > 0
          ? `Marge: ${marginPercent}% (${(totals.marginCents / 100).toFixed(2)} excl. btw)`
          : null,
      created_by: gate.userId,
    });

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    if (lines.length > 0) {
      const lineRows = lines.map((line, index) => ({
        id: crypto.randomUUID(),
        organization_id: gate.organizationId,
        quote_id: quoteId,
        parent_id: null,
        sort_order: index,
        title: line.title.trim(),
        quantity: line.quantity,
        unit: line.unit || "st",
        unit_price_cents: Math.round(line.unitPriceCents),
        vat_rate_bps: line.vatRateBps,
        discount_cents: 0,
      }));

      if (marginPercent > 0 && totals.marginCents > 0) {
        lineRows.push({
          id: crypto.randomUUID(),
          organization_id: gate.organizationId,
          quote_id: quoteId,
          parent_id: null,
          sort_order: lineRows.length,
          title: "Marge",
          quantity: 1,
          unit: "post",
          unit_price_cents: totals.marginCents,
          vat_rate_bps: 2100,
          discount_cents: 0,
        });
      }

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
      });
    }

    const quoteNet = lines.reduce((sum, line) => sum + lineNetCents({
      id: "x",
      title: line.title,
      quantity: line.quantity,
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      vatRateBps: line.vatRateBps,
    }), 0) + totals.marginCents;

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId,
      type: "quote_created",
      title: "Conceptofferte aangemaakt",
      body: `${quoteTitle} · ${(quoteNet / 100).toLocaleString("nl-NL", { style: "currency", currency: "EUR" })} excl. btw`,
      metadata: {
        quote_id: quoteId,
        status: "draft",
        line_count: lines.length,
        total_excl_cents: quoteNet,
        source: "new_assignment_wizard",
      },
      createdBy: gate.userId,
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
