"use server";

import {
  PROJECT_FILTER_STATUSES,
  type ProjectListFilter,
} from "@/features/projects/lib/project-status";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type { ProjectStatus } from "@/types/database";

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string | null;
  customerId: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
};

export async function listProjects(
  filter: ProjectListFilter = "all",
): Promise<{ projects?: ProjectRow[]; error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  let query = ctx.supabase
    .from("projects")
    .select("id, name, status, notes, customer_id, created_at, updated_at")
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false });

  const statuses = PROJECT_FILTER_STATUSES[filter];
  if (statuses) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const customerIds = [
    ...new Set((data ?? []).map((row) => row.customer_id)),
  ];
  const nameById = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: customers } = await ctx.supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organizationId)
      .in("id", customerIds);

    for (const customer of customers ?? []) {
      nameById.set(customer.id, customer.name);
    }
  }

  return {
    projects: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      notes: row.notes,
      customerId: row.customer_id,
      customerName: nameById.get(row.customer_id) ?? "—",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function getProject(projectId: string): Promise<{
  project?: ProjectRow;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("projects")
    .select("id, name, status, notes, customer_id, created_at, updated_at")
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .eq("id", data.customer_id)
    .maybeSingle();

  return {
    project: {
      id: data.id,
      name: data.name,
      status: data.status,
      notes: data.notes,
      customerId: data.customer_id,
      customerName: customer?.name ?? "—",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  };
}
