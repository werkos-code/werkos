"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";

export type SubcontractorRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  kvkNumber: string | null;
  notes: string | null;
  createdAt: string;
};

export async function listSubcontractors(): Promise<{
  subcontractors?: SubcontractorRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("subcontractors")
    .select("id, name, email, phone, address, kvk_number, notes, created_at")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };

  return {
    subcontractors: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      kvkNumber: row.kvk_number,
      notes: row.notes,
      createdAt: row.created_at,
    })),
  };
}

export async function getSubcontractor(subcontractorId: string): Promise<{
  subcontractor?: SubcontractorRow;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("subcontractors")
    .select("id, name, email, phone, address, kvk_number, notes, created_at")
    .eq("organization_id", ctx.organizationId)
    .eq("id", subcontractorId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  return {
    subcontractor: {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      kvkNumber: data.kvk_number,
      notes: data.notes,
      createdAt: data.created_at,
    },
  };
}
