"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type { QuoteStatus } from "@/types/database";

export type QuoteListItem = {
  id: string;
  title: string;
  status: QuoteStatus;
  projectId: string;
  projectName: string;
  updatedAt: string;
  validUntil: string | null;
};

export type QuoteLineType =
  | "article"
  | "hours"
  | "labor"
  | "text"
  | "section";

export const QUOTE_LINE_TYPES: QuoteLineType[] = [
  "article",
  "hours",
  "labor",
  "text",
  "section",
];

export type QuoteLineRow = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  title: string;
  description: string | null;
  lineType: QuoteLineType;
  quantity: number | null;
  unit: string | null;
  unitPriceCents: number | null;
  vatRateBps: number;
  discountCents: number;
  estimatedMinutes: number | null;
};

export type QuoteDetail = {
  id: string;
  title: string;
  status: QuoteStatus;
  quoteNumber: string | null;
  projectId: string;
  projectName: string;
  customerId: string | null;
  customerName: string | null;
  validUntil: string | null;
  internalNotes: string | null;
  externalNotes: string | null;
  createdAt: string;
  lines: QuoteLineRow[];
};

export async function listQuotesForProject(projectId: string): Promise<{
  quotes?: QuoteListItem[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: project } = await ctx.supabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { error: "project_not_found" };

  const { data, error } = await ctx.supabase
    .from("quotes")
    .select("id, title, status, project_id, updated_at, valid_until")
    .eq("organization_id", ctx.organizationId)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  return {
    quotes: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.project_id,
      projectName: project.name,
      updatedAt: row.updated_at,
      validUntil: row.valid_until,
    })),
  };
}

export async function listQuotesForOrganization(): Promise<{
  quotes?: QuoteListItem[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("quotes")
    .select("id, title, status, project_id, updated_at, valid_until")
    .eq("organization_id", ctx.organizationId)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  const projectIds = [...new Set((data ?? []).map((q) => q.project_id))];
  const nameById = new Map<string, string>();

  if (projectIds.length > 0) {
    const { data: projects } = await ctx.supabase
      .from("projects")
      .select("id, name")
      .eq("organization_id", ctx.organizationId)
      .in("id", projectIds);

    for (const project of projects ?? []) {
      nameById.set(project.id, project.name);
    }
  }

  return {
    quotes: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      projectId: row.project_id,
      projectName: nameById.get(row.project_id) ?? "—",
      updatedAt: row.updated_at,
      validUntil: row.valid_until,
    })),
  };
}

export async function getQuote(quoteId: string): Promise<{
  quote?: QuoteDetail;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: quote, error } = await ctx.supabase
    .from("quotes")
    .select(
      "id, title, status, quote_number, project_id, valid_until, internal_notes, external_notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("id", quoteId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!quote) return { error: "not_found" };

  const [{ data: project }, { data: lines, error: linesError }] =
    await Promise.all([
      ctx.supabase
        .from("projects")
        .select("id, name, customer_id")
        .eq("organization_id", ctx.organizationId)
        .eq("id", quote.project_id)
        .maybeSingle(),
      ctx.supabase
        .from("quote_lines")
        .select(
          "id, parent_id, sort_order, title, description, line_type, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents, estimated_minutes",
        )
        .eq("organization_id", ctx.organizationId)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
    ]);

  if (linesError) return { error: linesError.message };

  let customerName: string | null = null;
  let customerId: string | null = project?.customer_id ?? null;
  if (customerId) {
    const { data: customer } = await ctx.supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organizationId)
      .eq("id", customerId)
      .maybeSingle();
    customerName = customer?.name ?? null;
  }

  return {
    quote: {
      id: quote.id,
      title: quote.title,
      status: quote.status,
      quoteNumber: quote.quote_number,
      projectId: quote.project_id,
      projectName: project?.name ?? "—",
      customerId,
      customerName,
      validUntil: quote.valid_until,
      internalNotes: quote.internal_notes,
      externalNotes: quote.external_notes,
      createdAt: quote.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        parentId: line.parent_id,
        sortOrder: line.sort_order,
        title: line.title,
        description: line.description,
        lineType: (line.line_type as QuoteLineRow["lineType"]) ?? "article",
        quantity: line.quantity === null ? null : Number(line.quantity),
        unit: line.unit,
        unitPriceCents: line.unit_price_cents,
        vatRateBps: line.vat_rate_bps,
        discountCents: line.discount_cents,
        estimatedMinutes: line.estimated_minutes,
      })),
    },
  };
}

import type { WorkItemRow, WorkItemPriority } from "@/features/projects/lib/work-item";
import type { WorkItemStatus } from "@/types/database";

export async function listWorkItemsForProject(projectId: string): Promise<{
  workItems?: WorkItemRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("work_items")
    .select(
      "id, title, status, parent_id, description, category, assignee_user_id, planned_start, planned_end, estimated_minutes, priority, labels, is_group, sort_order",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message };

  const assigneeIds = [
    ...new Set(
      (data ?? [])
        .map((row) => row.assignee_user_id)
        .filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();

  if (assigneeIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", assigneeIds);
    for (const profile of profiles ?? []) {
      nameById.set(profile.id, profile.full_name?.trim() || "—");
    }
  }

  return {
    workItems: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as WorkItemStatus,
      parentId: row.parent_id,
      description: row.description,
      category: row.category,
      assigneeUserId: row.assignee_user_id,
      assigneeName: row.assignee_user_id
        ? (nameById.get(row.assignee_user_id) ?? "—")
        : null,
      plannedStart: row.planned_start,
      plannedEnd: row.planned_end,
      estimatedMinutes: row.estimated_minutes,
      priority: (row.priority as WorkItemPriority | null) ?? "normal",
      labels: Array.isArray(row.labels) ? row.labels.filter(Boolean) : [],
      isGroup: Boolean(row.is_group),
      sortOrder: row.sort_order,
    })),
  };
}
