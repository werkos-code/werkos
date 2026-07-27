"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";

export type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  kvkNumber: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
  createdAt: string;
  priceCount: number;
  purchaseOrderCount: number;
};

async function priceCountsBySupplier(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("article_supplier_prices")
    .select("supplier_id")
    .eq("organization_id", organizationId)
    .not("supplier_id", "is", null);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    if (!row.supplier_id) continue;
    counts.set(row.supplier_id, (counts.get(row.supplier_id) ?? 0) + 1);
  }
  return counts;
}

async function purchaseOrderCountsBySupplier(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("supplier_id")
    .eq("organization_id", organizationId);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    counts.set(row.supplier_id, (counts.get(row.supplier_id) ?? 0) + 1);
  }
  return counts;
}

export async function listSuppliers(): Promise<{
  suppliers?: SupplierRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [{ data, error }, priceCounts, poCounts] = await Promise.all([
    ctx.supabase
      .from("suppliers")
      .select(
        "id, name, email, phone, address, kvk_number, payment_terms_days, notes, created_at",
      )
      .eq("organization_id", ctx.organizationId)
      .order("name"),
    priceCountsBySupplier(ctx.supabase, ctx.organizationId),
    purchaseOrderCountsBySupplier(ctx.supabase, ctx.organizationId),
  ]);

  if (error) return { error: error.message };

  return {
    suppliers: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      kvkNumber: row.kvk_number,
      paymentTermsDays: row.payment_terms_days,
      notes: row.notes,
      createdAt: row.created_at,
      priceCount: priceCounts.get(row.id) ?? 0,
      purchaseOrderCount: poCounts.get(row.id) ?? 0,
    })),
  };
}

export async function listSupplierOptions(): Promise<{
  suppliers?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("suppliers")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };
  return { suppliers: data ?? [] };
}

export async function getSupplier(supplierId: string): Promise<{
  supplier?: SupplierRow;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [{ data, error }, priceCount, poCount] = await Promise.all([
    ctx.supabase
      .from("suppliers")
      .select(
        "id, name, email, phone, address, kvk_number, payment_terms_days, notes, created_at",
      )
      .eq("organization_id", ctx.organizationId)
      .eq("id", supplierId)
      .maybeSingle(),
    ctx.supabase
      .from("article_supplier_prices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("supplier_id", supplierId),
    ctx.supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("supplier_id", supplierId),
  ]);

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  return {
    supplier: {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      kvkNumber: data.kvk_number,
      paymentTermsDays: data.payment_terms_days,
      notes: data.notes,
      createdAt: data.created_at,
      priceCount: priceCount.count ?? 0,
      purchaseOrderCount: poCount.count ?? 0,
    },
  };
}
