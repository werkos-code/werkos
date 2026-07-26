"use server";

import {
  PROJECT_FILTER_STATUSES,
  PROJECT_STATUSES,
  type ProjectListFilter,
  isOrgStaffRole,
} from "@/features/projects/lib/project-status";
import { createClient } from "@/lib/supabase/server";
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

function mapProject(row: {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string | null;
  customer_id: string;
  created_at: string;
  updated_at: string;
  customers:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
}): ProjectRow {
  const customer = Array.isArray(row.customers)
    ? row.customers[0]
    : row.customers;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    notes: row.notes,
    customerId: row.customer_id,
    customerName: customer?.name ?? "—",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(
  filter: ProjectListFilter = "all",
): Promise<{ projects?: ProjectRow[]; error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  let query = ctx.supabase
    .from("projects")
    .select(
      "id, name, status, notes, customer_id, created_at, updated_at, customers(id, name)",
    )
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false });

  const statuses = PROJECT_FILTER_STATUSES[filter];
  if (statuses) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    projects: (data ?? []).map((row) =>
      mapProject(row as Parameters<typeof mapProject>[0]),
    ),
  };
}

export async function getProject(projectId: string): Promise<{
  project?: ProjectRow;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("projects")
    .select(
      "id, name, status, notes, customer_id, created_at, updated_at, customers(id, name)",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  return { project: mapProject(data as Parameters<typeof mapProject>[0]) };
}

export async function createProject(input: {
  name: string;
  customerId: string;
  notes?: string;
}): Promise<{ error?: string; projectId?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const name = input.name.trim();
  const customerId = input.customerId.trim();
  if (!name) return { error: "name_required" };
  if (!customerId) return { error: "customer_required" };

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) return { error: "customer_not_found" };

  const { data, error } = await ctx.supabase
    .from("projects")
    .insert({
      organization_id: ctx.organizationId,
      customer_id: customerId,
      name,
      status: "preparation",
      notes: input.notes?.trim() || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { projectId: data.id };
}

export async function updateProject(input: {
  id: string;
  name: string;
  customerId: string;
  status: ProjectStatus;
  notes?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  const name = input.name.trim();
  if (!name) return { error: "name_required" };
  if (!PROJECT_STATUSES.includes(input.status)) {
    return { error: "invalid_status" };
  }

  const { error } = await ctx.supabase
    .from("projects")
    .update({
      name,
      customer_id: input.customerId,
      status: input.status,
      notes: input.notes?.trim() || null,
    })
    .eq("organization_id", ctx.organizationId)
    .eq("id", input.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateProjectStatus(input: {
  id: string;
  status: ProjectStatus;
}): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx && ctx.error) return { error: ctx.error };

  if (!PROJECT_STATUSES.includes(input.status)) {
    return { error: "invalid_status" };
  }

  const { error } = await ctx.supabase
    .from("projects")
    .update({ status: input.status })
    .eq("organization_id", ctx.organizationId)
    .eq("id", input.id);

  if (error) return { error: error.message };
  return { success: true };
}
