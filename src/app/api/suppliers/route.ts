import { NextResponse } from "next/server";

import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parsePaymentTerms(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      kvkNumber?: string;
      paymentTermsDays?: number | string | null;
      notes?: string;
    };

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }

    const supplierId = crypto.randomUUID();
    const admin = createAdminClient();
    const { error } = await admin.from("suppliers").insert({
      id: supplierId,
      organization_id: gate.organizationId,
      name,
      email: emptyToNull(body.email),
      phone: emptyToNull(body.phone),
      address: emptyToNull(body.address),
      kvk_number: emptyToNull(body.kvkNumber),
      payment_terms_days: parsePaymentTerms(body.paymentTermsDays),
      notes: emptyToNull(body.notes),
      created_by: gate.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplierId });
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
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      kvkNumber?: string;
      paymentTermsDays?: number | string | null;
      notes?: string;
    };

    const id = body.id?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!id || !name) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("suppliers")
      .update({
        name,
        email: emptyToNull(body.email),
        phone: emptyToNull(body.phone),
        address: emptyToNull(body.address),
        kvk_number: emptyToNull(body.kvkNumber),
        payment_terms_days: parsePaymentTerms(body.paymentTermsDays),
        notes: emptyToNull(body.notes),
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

export async function DELETE(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const admin = createAdminClient();

    const [{ count: priceCount }, { count: poCount }] = await Promise.all([
      admin
        .from("article_supplier_prices")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", gate.organizationId)
        .eq("supplier_id", id),
      admin
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", gate.organizationId)
        .eq("supplier_id", id),
    ]);

    if ((priceCount ?? 0) > 0 || (poCount ?? 0) > 0) {
      return NextResponse.json({ error: "has_links" }, { status: 409 });
    }

    const { error } = await admin
      .from("suppliers")
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
