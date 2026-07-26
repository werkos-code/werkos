"use server";

import { createClient } from "@/lib/supabase/server";
import { isOrgStaffRole } from "@/features/projects/lib/project-status";

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

async function getStaffOrgContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return { error: "no_organization" as const };
  if (!isOrgStaffRole(membership.role)) return { error: "forbidden" as const };

  return {
    supabase,
    userId: user.id,
    organizationId: membership.organization_id,
  };
}

async function projectCountForCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  customerId: string,
) {
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId);

  if (error) return 0;
  return count ?? 0;
}

export async function listCustomers(): Promise<{
  customers?: CustomerRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("id, name, email, phone, address, notes, created_at")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };

  const customers: CustomerRow[] = await Promise.all(
    (data ?? []).map(async (row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at,
      projectCount: await projectCountForCustomer(
        ctx.supabase,
        ctx.organizationId,
        row.id,
      ),
    })),
  );

  return { customers };
}

export async function listCustomerOptions(): Promise<{
  customers?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

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
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("customers")
    .select("id, name, email, phone, address, notes, created_at")
    .eq("organization_id", ctx.organizationId)
    .eq("id", customerId)
    .maybeSingle();

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
      projectCount: await projectCountForCustomer(
        ctx.supabase,
        ctx.organizationId,
        data.id,
      ),
    },
  };
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<{ error?: string; customerId?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const name = input.name.trim();
  if (!name) return { error: "name_required" };

  const { data, error } = await ctx.supabase
    .from("customers")
    .insert({
      organization_id: ctx.organizationId,
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "create_failed" };
  return { customerId: data.id };
}

export async function updateCustomer(input: {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const name = input.name.trim();
  if (!name) return { error: "name_required" };

  const { error } = await ctx.supabase
    .from("customers")
    .update({
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("organization_id", ctx.organizationId)
    .eq("id", input.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteCustomer(
  customerId: string,
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const { count } = await ctx.supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organizationId)
    .eq("customer_id", customerId);

  if ((count ?? 0) > 0) return { error: "has_projects" };

  const { error } = await ctx.supabase
    .from("customers")
    .delete()
    .eq("organization_id", ctx.organizationId)
    .eq("id", customerId);

  if (error) return { error: error.message };
  return { success: true };
}
