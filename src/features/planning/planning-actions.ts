import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type {
  AppointmentRow,
  PlanningProjectOption,
  UnplannedWorkItem,
} from "@/features/planning/lib/planning";
import {
  DEFAULT_PLANNING_SETTINGS,
  normalizePlanningSettings,
  type PlanningSettings,
} from "@/features/planning/lib/planning-settings";
import type { AppointmentStatus, AppointmentType } from "@/types/database";

function mapNames(
  profiles: { id: string; full_name: string | null }[] | null,
) {
  const map = new Map<string, string>();
  for (const profile of profiles ?? []) {
    map.set(profile.id, profile.full_name?.trim() || "—");
  }
  return map;
}

export async function listPlanningWorkspaceData(range: {
  from: string;
  to: string;
}): Promise<{
  appointments?: AppointmentRow[];
  unplanned?: UnplannedWorkItem[];
  projects?: PlanningProjectOption[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [appointmentsResult, workItemsResult, projectsResult] =
    await Promise.all([
      ctx.supabase
        .from("appointments")
        .select(
          "id, title, starts_at, ends_at, all_day, status, type, project_id, work_item_id, assignee_user_id, location, notes",
        )
        .eq("organization_id", ctx.organizationId)
        .lt("starts_at", range.to)
        .gt("ends_at", range.from)
        .order("starts_at", { ascending: true }),
      ctx.supabase
        .from("work_items")
        .select(
          "id, title, status, project_id, estimated_minutes, assignee_user_id, category, planned_start, planned_end, is_group",
        )
        .eq("organization_id", ctx.organizationId)
        .eq("is_group", false)
        .neq("status", "done")
        .order("sort_order", { ascending: true }),
      ctx.supabase
        .from("projects")
        .select("id, name, customers(name)")
        .eq("organization_id", ctx.organizationId)
        .order("name", { ascending: true }),
    ]);

  if (appointmentsResult.error) {
    return { error: appointmentsResult.error.message };
  }
  if (workItemsResult.error) {
    return { error: workItemsResult.error.message };
  }
  if (projectsResult.error) {
    return { error: projectsResult.error.message };
  }

  const projectNameById = new Map(
    (projectsResult.data ?? []).map((row) => [row.id, row.name] as const),
  );
  const projectCustomerById = new Map(
    (projectsResult.data ?? []).map((row) => {
      const customer = row.customers as { name?: string } | { name?: string }[] | null;
      const customerName = Array.isArray(customer)
        ? customer[0]?.name
        : customer?.name;
      return [row.id, customerName ?? null] as const;
    }),
  );

  const appointmentWorkItemIds = new Set(
    (appointmentsResult.data ?? [])
      .map((row) => row.work_item_id)
      .filter(Boolean) as string[],
  );

  const assigneeIds = [
    ...new Set(
      [
        ...(appointmentsResult.data ?? []).map((row) => row.assignee_user_id),
        ...(workItemsResult.data ?? []).map((row) => row.assignee_user_id),
      ].filter(Boolean) as string[],
    ),
  ];

  const workItemIds = [
    ...new Set(
      (appointmentsResult.data ?? [])
        .map((row) => row.work_item_id)
        .filter(Boolean) as string[],
    ),
  ];

  const [profilesResult, linkedItemsResult] = await Promise.all([
    assigneeIds.length
      ? ctx.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    workItemIds.length
      ? ctx.supabase
          .from("work_items")
          .select("id, title")
          .in("id", workItemIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const nameById = mapNames(profilesResult.data ?? []);
  const workItemTitleById = new Map(
    (linkedItemsResult.data ?? []).map((row) => [row.id, row.title] as const),
  );

  const appointments: AppointmentRow[] = (appointmentsResult.data ?? []).map(
    (row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: Boolean(row.all_day),
      status: row.status as AppointmentStatus,
      type: row.type as AppointmentType,
      projectId: row.project_id,
      projectName: row.project_id
        ? (projectNameById.get(row.project_id) ?? null)
        : null,
      workItemId: row.work_item_id,
      workItemTitle: row.work_item_id
        ? (workItemTitleById.get(row.work_item_id) ?? null)
        : null,
      assigneeUserId: row.assignee_user_id,
      assigneeName: row.assignee_user_id
        ? (nameById.get(row.assignee_user_id) ?? "—")
        : null,
      location: row.location,
      notes: row.notes,
    }),
  );

  // Also surface date-planned work items without an appointment as all-day bars
  const syntheticFromWorkItems: AppointmentRow[] = [];
  for (const item of workItemsResult.data ?? []) {
    if (appointmentWorkItemIds.has(item.id)) continue;
    if (!item.planned_start && !item.planned_end) continue;
    const start = item.planned_start ?? item.planned_end!;
    const end = item.planned_end ?? item.planned_start!;
    syntheticFromWorkItems.push({
      id: `work:${item.id}`,
      title: item.title,
      startsAt: `${start}T00:00:00.000Z`,
      endsAt: `${end}T23:59:59.000Z`,
      allDay: true,
      status: "planned",
      type: "work",
      projectId: item.project_id,
      projectName: projectNameById.get(item.project_id) ?? null,
      workItemId: item.id,
      workItemTitle: item.title,
      assigneeUserId: item.assignee_user_id,
      assigneeName: item.assignee_user_id
        ? (nameById.get(item.assignee_user_id) ?? "—")
        : null,
      location: null,
      notes: null,
    });
  }

  const unplanned: UnplannedWorkItem[] = (workItemsResult.data ?? [])
    .filter((item) => {
      if (appointmentWorkItemIds.has(item.id)) return false;
      return !item.planned_start && !item.planned_end;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      projectId: item.project_id,
      projectName: projectNameById.get(item.project_id) ?? "—",
      status: item.status,
      estimatedMinutes: item.estimated_minutes,
      assigneeUserId: item.assignee_user_id,
      assigneeName: item.assignee_user_id
        ? (nameById.get(item.assignee_user_id) ?? "—")
        : null,
      category: item.category,
    }));

  return {
    appointments: [...appointments, ...syntheticFromWorkItems],
    unplanned,
    projects: (projectsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      customerName: projectCustomerById.get(row.id) ?? null,
    })),
  };
}

export async function getPlanningSettings(): Promise<{
  settings?: PlanningSettings;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("organizations")
    .select(
      "planning_work_days, planning_day_start_hour, planning_day_end_hour, planning_setup_completed_at",
    )
    .eq("id", ctx.organizationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("planning_work_days")) {
      return { settings: DEFAULT_PLANNING_SETTINGS };
    }
    return { error: error.message };
  }

  if (!data) return { settings: DEFAULT_PLANNING_SETTINGS };

  return {
    settings: normalizePlanningSettings({
      workDays: data.planning_work_days as number[] | null,
      dayStartHour: data.planning_day_start_hour,
      dayEndHour: data.planning_day_end_hour,
      setupCompleted: Boolean(data.planning_setup_completed_at),
    }),
  };
}

export async function savePlanningSettings(input: {
  workDays: number[];
  dayStartHour: number;
  dayEndHour: number;
  markComplete?: boolean;
}): Promise<{ settings?: PlanningSettings; error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const settings = normalizePlanningSettings({
    workDays: input.workDays,
    dayStartHour: input.dayStartHour,
    dayEndHour: input.dayEndHour,
    setupCompleted: input.markComplete ?? true,
  });

  const { error } = await ctx.supabase
    .from("organizations")
    .update({
      planning_work_days: settings.workDays,
      planning_day_start_hour: settings.dayStartHour,
      planning_day_end_hour: settings.dayEndHour,
      planning_setup_completed_at: settings.setupCompleted
        ? new Date().toISOString()
        : null,
    })
    .eq("id", ctx.organizationId);

  if (error) return { error: error.message };
  return { settings };
}
