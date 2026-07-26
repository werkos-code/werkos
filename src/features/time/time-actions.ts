import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import {
  sumMinutesByWorkItem,
  type TimeEntryRow,
} from "@/features/time/lib/time-entry";

export async function listTimeEntriesForProject(projectId: string): Promise<{
  entries?: TimeEntryRow[];
  minutesByWorkItem?: Record<string, number>;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("time_entries")
    .select(
      "id, project_id, work_item_id, work_order_id, user_id, work_date, minutes, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("project_id", projectId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const userIds = [
    ...new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
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

  const entries: TimeEntryRow[] = (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workItemId: row.work_item_id,
    workOrderId: row.work_order_id,
    userId: row.user_id,
    userName: nameById.get(row.user_id) ?? "—",
    workDate: row.work_date,
    minutes: row.minutes,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  const byItem = sumMinutesByWorkItem(entries);
  return {
    entries,
    minutesByWorkItem: Object.fromEntries(byItem),
  };
}

export async function listTimeEntriesForWorkItem(workItemId: string): Promise<{
  entries?: TimeEntryRow[];
  totalMinutes?: number;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("time_entries")
    .select(
      "id, project_id, work_item_id, work_order_id, user_id, work_date, minutes, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("work_item_id", workItemId)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const userIds = [
    ...new Set((data ?? []).map((row) => row.user_id).filter(Boolean)),
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

  const entries: TimeEntryRow[] = (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    workItemId: row.work_item_id,
    workOrderId: row.work_order_id,
    userId: row.user_id,
    userName: nameById.get(row.user_id) ?? "—",
    workDate: row.work_date,
    minutes: row.minutes,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  return {
    entries,
    totalMinutes: entries.reduce((sum, entry) => sum + entry.minutes, 0),
  };
}
