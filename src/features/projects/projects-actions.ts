"use server";

import {
  PROJECT_FILTER_STATUSES,
  type ProjectListFilter,
} from "@/features/projects/lib/project-status";
import { projectCoverPublicUrl } from "@/features/projects/lib/project-cover";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type { Json, ProjectActivityType, ProjectStatus } from "@/types/database";

export type ProjectLabel = {
  id: string;
  name: string;
};

export type ProjectActivityRow = {
  id: string;
  type: ProjectActivityType;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type StaffOption = {
  id: string;
  name: string;
};

export type ProjectRow = {
  id: string;
  name: string;
  status: ProjectStatus;
  notes: string | null;
  customerId: string;
  customerName: string;
  projectNumber: string;
  startDate: string | null;
  endDate: string | null;
  leadUserId: string | null;
  leadName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  isFavorite: boolean;
  labels: ProjectLabel[];
  createdAt: string;
  updatedAt: string;
};

function mapProjectBase(
  row: {
    id: string;
    name: string;
    status: ProjectStatus;
    notes: string | null;
    customer_id: string;
    project_number: string;
    start_date: string | null;
    end_date: string | null;
    lead_user_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    cover_path: string | null;
    created_at: string;
    updated_at: string;
  },
  customerName: string,
  leadName: string | null,
  labels: ProjectLabel[] = [],
  isFavorite = false,
): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    notes: row.notes,
    customerId: row.customer_id,
    customerName,
    projectNumber: row.project_number,
    startDate: row.start_date,
    endDate: row.end_date,
    leadUserId: row.lead_user_id,
    leadName,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    coverPath: row.cover_path,
    coverUrl: projectCoverPublicUrl(row.cover_path),
    isFavorite,
    labels,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PROJECT_SELECT =
  "id, name, status, notes, customer_id, project_number, start_date, end_date, lead_user_id, contact_name, contact_email, contact_phone, cover_path, created_at, updated_at";

function asMetadata(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function listProjects(
  filter: ProjectListFilter = "all",
): Promise<{ projects?: ProjectRow[]; error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  let query = ctx.supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false });

  const statuses = PROJECT_FILTER_STATUSES[filter];
  if (statuses) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  const rows = data ?? [];
  const customerIds = [...new Set(rows.map((row) => row.customer_id))];
  const leadIds = [
    ...new Set(
      rows.map((row) => row.lead_user_id).filter(Boolean) as string[],
    ),
  ];
  const projectIds = rows.map((row) => row.id);

  const nameById = new Map<string, string>();
  const leadNameById = new Map<string, string>();
  const labelsByProject = new Map<string, ProjectLabel[]>();
  const favoriteIds = new Set<string>();

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

  if (leadIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", leadIds);

    for (const profile of profiles ?? []) {
      leadNameById.set(profile.id, profile.full_name?.trim() || "—");
    }
  }

  if (projectIds.length > 0) {
    const [{ data: labels }, { data: favorites }] = await Promise.all([
      ctx.supabase
        .from("project_labels")
        .select("id, name, project_id")
        .eq("organization_id", ctx.organizationId)
        .in("project_id", projectIds)
        .order("name"),
      ctx.supabase
        .from("project_favorites")
        .select("project_id")
        .eq("organization_id", ctx.organizationId)
        .eq("user_id", ctx.userId)
        .in("project_id", projectIds),
    ]);

    for (const label of labels ?? []) {
      const list = labelsByProject.get(label.project_id) ?? [];
      list.push({ id: label.id, name: label.name });
      labelsByProject.set(label.project_id, list);
    }
    for (const favorite of favorites ?? []) {
      favoriteIds.add(favorite.project_id);
    }
  }

  return {
    projects: rows.map((row) =>
      mapProjectBase(
        row,
        nameById.get(row.customer_id) ?? "—",
        row.lead_user_id
          ? (leadNameById.get(row.lead_user_id) ?? "—")
          : null,
        labelsByProject.get(row.id) ?? [],
        favoriteIds.has(row.id),
      ),
    ),
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
    .select(PROJECT_SELECT)
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "not_found" };

  const [{ data: customer }, { data: labels }, leadProfile, { data: favorite }] =
    await Promise.all([
      ctx.supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", ctx.organizationId)
        .eq("id", data.customer_id)
        .maybeSingle(),
      ctx.supabase
        .from("project_labels")
        .select("id, name")
        .eq("organization_id", ctx.organizationId)
        .eq("project_id", projectId)
        .order("name"),
      data.lead_user_id
        ? ctx.supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", data.lead_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      ctx.supabase
        .from("project_favorites")
        .select("project_id")
        .eq("organization_id", ctx.organizationId)
        .eq("project_id", projectId)
        .eq("user_id", ctx.userId)
        .maybeSingle(),
    ]);

  return {
    project: mapProjectBase(
      data,
      customer?.name ?? "—",
      data.lead_user_id
        ? (leadProfile.data?.full_name?.trim() || "—")
        : null,
      (labels ?? []).map((label) => ({ id: label.id, name: label.name })),
      Boolean(favorite),
    ),
  };
}

export async function listProjectActivities(projectId: string): Promise<{
  activities?: ProjectActivityRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: project } = await ctx.supabase
    .from("projects")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { error: "not_found" };

  const { data, error } = await ctx.supabase
    .from("project_activities")
    .select("id, type, title, body, metadata, created_by, created_at")
    .eq("organization_id", ctx.organizationId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) return { error: error.message };

  const userIds = [
    ...new Set(
      (data ?? []).map((row) => row.created_by).filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      nameById.set(profile.id, profile.full_name?.trim() || "—");
    }
  }

  return {
    activities: (data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      metadata: asMetadata(row.metadata),
      createdBy: row.created_by,
      createdByName: row.created_by
        ? (nameById.get(row.created_by) ?? null)
        : null,
      createdAt: row.created_at,
    })),
  };
}

export async function listOrgStaffOptions(): Promise<{
  staff?: StaffOption[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: memberships, error } = await ctx.supabase
    .from("organization_memberships")
    .select("user_id, role")
    .eq("organization_id", ctx.organizationId)
    .in("role", ["owner", "office_employee", "field_employee"]);

  if (error) return { error: error.message };

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return { staff: [] };

  const { data: profiles } = await ctx.supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "—"] as const),
  );

  return {
    staff: userIds
      .map((id) => ({
        id,
        name: nameById.get(id) ?? "—",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl")),
  };
}
