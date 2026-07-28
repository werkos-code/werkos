import { NextResponse } from "next/server";

import { logProjectActivity } from "@/features/projects/lib/project-activity";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ quoteId: string }> };

function copyTitle(title: string) {
  const base = title.trim() || "Offerte";
  return base.endsWith("(kopie)") ? base : `${base} (kopie)`;
}

function sortLinesForInsert<
  T extends { id: string; parent_id: string | null; sort_order: number },
>(lines: T[]) {
  const byId = new Map(lines.map((line) => [line.id, line]));
  const depth = (id: string) => {
    let current = byId.get(id);
    let level = 0;
    while (current?.parent_id) {
      level += 1;
      current = byId.get(current.parent_id);
      if (level > 50) break;
    }
    return level;
  };
  return [...lines].sort(
    (a, b) => depth(a.id) - depth(b.id) || a.sort_order - b.sort_order,
  );
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const { quoteId } = await params;
    const admin = createAdminClient();

    const { data: source } = await admin
      .from("quotes")
      .select(
        "id, project_id, title, valid_until, payment_terms_days, payment_conditions, internal_notes, external_notes",
      )
      .eq("organization_id", gate.organizationId)
      .eq("id", quoteId)
      .maybeSingle();

    if (!source) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [{ data: lines }, { data: phases }] = await Promise.all([
      admin
        .from("quote_lines")
        .select(
          "id, parent_id, sort_order, title, description, line_type, article_id, quantity, unit, unit_price_cents, cost_price_cents, vat_rate_bps, discount_cents, estimated_minutes",
        )
        .eq("organization_id", gate.organizationId)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
      admin
        .from("quote_billing_phases")
        .select(
          "sort_order, title, kind, amount_type, amount_value",
        )
        .eq("organization_id", gate.organizationId)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
    ]);

    const newQuoteId = crypto.randomUUID();
    const title = copyTitle(source.title);

    const { error: quoteError } = await admin.from("quotes").insert({
      id: newQuoteId,
      organization_id: gate.organizationId,
      project_id: source.project_id,
      title,
      status: "draft",
      valid_until: source.valid_until,
      payment_terms_days: source.payment_terms_days,
      payment_conditions: source.payment_conditions,
      internal_notes: source.internal_notes,
      external_notes: source.external_notes,
      created_by: gate.userId,
    });

    if (quoteError) {
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    const sourceLines = lines ?? [];
    if (sourceLines.length > 0) {
      const idMap = new Map<string, string>();
      for (const line of sourceLines) {
        idMap.set(line.id, crypto.randomUUID());
      }

      const inserts = sortLinesForInsert(sourceLines).map((line) => ({
        id: idMap.get(line.id)!,
        organization_id: gate.organizationId,
        quote_id: newQuoteId,
        parent_id: line.parent_id ? (idMap.get(line.parent_id) ?? null) : null,
        sort_order: line.sort_order,
        title: line.title,
        description: line.description,
        line_type: line.line_type,
        article_id: line.article_id,
        quantity: line.quantity,
        unit: line.unit,
        unit_price_cents: line.unit_price_cents,
        cost_price_cents: line.cost_price_cents,
        vat_rate_bps: line.vat_rate_bps,
        discount_cents: line.discount_cents,
        estimated_minutes: line.estimated_minutes,
      }));

      const { error: linesError } = await admin
        .from("quote_lines")
        .insert(inserts);
      if (linesError) {
        await admin
          .from("quotes")
          .delete()
          .eq("id", newQuoteId)
          .eq("organization_id", gate.organizationId);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    } else {
      await admin.from("quote_lines").insert({
        id: crypto.randomUUID(),
        organization_id: gate.organizationId,
        quote_id: newQuoteId,
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
    }

    if ((phases ?? []).length > 0) {
      const { error: phasesError } = await admin
        .from("quote_billing_phases")
        .insert(
          (phases ?? []).map((phase) => ({
            id: crypto.randomUUID(),
            organization_id: gate.organizationId,
            quote_id: newQuoteId,
            sort_order: phase.sort_order,
            title: phase.title,
            kind: phase.kind,
            amount_type: phase.amount_type,
            amount_value: phase.amount_value,
            invoice_id: null,
            invoiced_at: null,
          })),
        );
      if (phasesError) {
        await admin
          .from("quotes")
          .delete()
          .eq("id", newQuoteId)
          .eq("organization_id", gate.organizationId);
        return NextResponse.json(
          { error: phasesError.message },
          { status: 500 },
        );
      }
    }

    await logProjectActivity(admin, {
      organizationId: gate.organizationId,
      projectId: source.project_id,
      type: "quote_created",
      title: "Offerte gedupliceerd",
      body: title,
      metadata: {
        quote_id: newQuoteId,
        source_quote_id: quoteId,
        status: "draft",
      },
      createdBy: gate.userId,
    });

    return NextResponse.json({
      quoteId: newQuoteId,
      projectId: source.project_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "duplicate_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
