"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";

export type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  projectCount: number;
};

async function projectCountsByCustomer(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .select("customer_id")
    .eq("organization_id", organizationId);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }
  return counts;
}

export async function listCustomers(): Promise<{
  customers?: CustomerRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [{ data, error }, counts] = await Promise.all([
    ctx.supabase
      .from("customers")
      .select("id, name, email, phone, address, notes, created_at")
      .eq("organization_id", ctx.organizationId)
      .order("name"),
    projectCountsByCustomer(ctx.supabase, ctx.organizationId),
  ]);

  if (error) return { error: error.message };

  const customers: CustomerRow[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    projectCount: counts.get(row.id) ?? 0,
  }));

  return { customers };
}

export async function listCustomerOptions(): Promise<{
  customers?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };
  return { customers: data ?? [] };
}

export async function getCustomer(customerId: string): Promise<{
  customer?: CustomerRow;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [{ data, error }, countResult] = await Promise.all([
    ctx.supabase
      .from("customers")
      .select("id, name, email, phone, address, notes, created_at")
      .eq("organization_id", ctx.organizationId)
      .eq("id", customerId)
      .maybeSingle(),
    ctx.supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId)
      .eq("customer_id", customerId),
  ]);

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  return {
    customer: {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      notes: data.notes,
      createdAt: data.created_at,
      projectCount: countResult.count ?? 0,
    },
  };
}
