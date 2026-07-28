"use server";

import {
  type WorkItemPriority,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type { WorkItemStatus } from "@/types/database";

export type OrgWorkItemRow = WorkItemRow & {
  projectId: string;
  projectName: string;
  projectNumber: string | null;
};

export async function listWorkItemsForOrganization(): Promise<{
  workItems?: OrgWorkItemRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("work_items")
    .select(
      "id, title, status, parent_id, description, category, assignee_user_id, planned_start, planned_end, estimated_minutes, priority, labels, is_group, sort_order, project_id, projects!inner(id, name, project_number)",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("is_group", false)
    .order("planned_end", { ascending: true });

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
    workItems: (data ?? []).map((row) => {
      const project = row.projects as unknown as {
        id: string;
        name: string;
        project_number: string | null;
      };

      return {
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
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.project_number,
      };
    }),
  };
}
