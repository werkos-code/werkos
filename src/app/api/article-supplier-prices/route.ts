import { NextResponse } from "next/server";

import { centsFromEuroInput } from "@/features/materials/lib/materials";
import { requireApiStaff, requireWritableApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseLeadDays(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const articleId =
      new URL(request.url).searchParams.get("articleId")?.trim() ?? "";
    if (!articleId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("article_supplier_prices")
      .select(
        "id, article_id, supplier_id, supplier_name, supplier_sku, unit_cost_cents, lead_time_days, is_preferred, notes",
      )
      .eq("organization_id", gate.organizationId)
      .eq("article_id", articleId)
      .order("is_preferred", { ascending: false })
      .order("supplier_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      prices: (data ?? []).map((row) => ({
        id: row.id,
        articleId: row.article_id,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        supplierSku: row.supplier_sku,
        unitCostCents: row.unit_cost_cents,
        leadTimeDays: row.lead_time_days,
        isPreferred: row.is_preferred,
        notes: row.notes,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "list_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      articleId?: string;
      supplierId?: string;
      supplierName?: string;
      supplierSku?: string | null;
      unitCost?: string | number | null;
      leadTimeDays?: number | string | null;
      isPreferred?: boolean;
      notes?: string | null;
    };

    const articleId = body.articleId?.trim() ?? "";
    const supplierId = emptyToNull(body.supplierId);
    const supplierName = body.supplierName?.trim() ?? "";
    if (!articleId || (!supplierId && !supplierName)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("article_supplier_prices")
      .insert({
        organization_id: gate.organizationId,
        article_id: articleId,
        supplier_id: supplierId,
        supplier_name: supplierId ? supplierName || "—" : supplierName,
        supplier_sku: emptyToNull(body.supplierSku),
        unit_cost_cents: centsFromEuroInput(body.unitCost),
        lead_time_days: parseLeadDays(body.leadTimeDays),
        is_preferred: body.isPreferred === true,
        notes: emptyToNull(body.notes),
        created_by: gate.userId,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.isPreferred) {
      await admin
        .from("article_supplier_prices")
        .update({ is_preferred: false })
        .eq("organization_id", gate.organizationId)
        .eq("article_id", articleId)
        .neq("id", data.id);
      await admin
        .from("article_supplier_prices")
        .update({ is_preferred: true })
        .eq("id", data.id);
    }

    return NextResponse.json({ priceId: data.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      id?: string;
      supplierId?: string | null;
      supplierName?: string;
      supplierSku?: string | null;
      unitCost?: string | number | null;
      leadTimeDays?: number | string | null;
      isPreferred?: boolean;
      notes?: string | null;
    };

    const id = body.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("article_supplier_prices")
      .select("article_id")
      .eq("organization_id", gate.organizationId)
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const supplierId =
      body.supplierId === undefined
        ? undefined
        : emptyToNull(body.supplierId ?? undefined);

    const { error } = await admin
      .from("article_supplier_prices")
      .update({
        ...(supplierId !== undefined ? { supplier_id: supplierId } : {}),
        ...(body.supplierName !== undefined
          ? { supplier_name: body.supplierName.trim() || "—" }
          : {}),
        supplier_sku: emptyToNull(body.supplierSku),
        unit_cost_cents: centsFromEuroInput(body.unitCost),
        lead_time_days: parseLeadDays(body.leadTimeDays),
        is_preferred: body.isPreferred === true,
        notes: emptyToNull(body.notes),
      })
      .eq("organization_id", gate.organizationId)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.isPreferred) {
      await admin
        .from("article_supplier_prices")
        .update({ is_preferred: false })
        .eq("organization_id", gate.organizationId)
        .eq("article_id", existing.article_id)
        .neq("id", id);
      await admin
        .from("article_supplier_prices")
        .update({ is_preferred: true })
        .eq("id", id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireWritableApiStaff();
    if ("error" in gate) return gate.error;

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("article_supplier_prices")
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
