import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type {
  WorkOrderChecklistItem,
  WorkOrderProjectOption,
  WorkOrderRow,
} from "@/features/work-orders/lib/work-order";
import type { WorkOrderPriority, WorkOrderStatus } from "@/types/database";

export async function listWorkOrders(options?: {
  projectId?: string;
}): Promise<{
  workOrders?: WorkOrderRow[];
  projects?: WorkOrderProjectOption[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  let query = ctx.supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, description, status, priority, work_type, project_id, assignee_user_id, planned_start, estimated_minutes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }

  const [ordersResult, projectsResult] = await Promise.all([
    query,
    ctx.supabase
      .from("projects")
      .select("id, name, customer_id")
      .eq("organization_id", ctx.organizationId)
      .order("name", { ascending: true }),
  ]);

  if (ordersResult.error) return { error: ordersResult.error.message };
  if (projectsResult.error) return { error: projectsResult.error.message };

  const orders = ordersResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const projectIds = [...new Set(orders.map((row) => row.project_id))];
  const customerIds = [
    ...new Set(projects.map((row) => row.customer_id).filter(Boolean)),
  ];
  const assigneeIds = [
    ...new Set(
      orders.map((row) => row.assignee_user_id).filter(Boolean) as string[],
    ),
  ];
  const orderIds = orders.map((row) => row.id);

  const [customersResult, profilesResult, checklistResult] = await Promise.all([
    customerIds.length
      ? ctx.supabase
          .from("customers")
          .select("id, name, address")
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; address: string | null }[],
        }),
    assigneeIds.length
      ? ctx.supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assigneeIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string | null }[],
        }),
    orderIds.length
      ? ctx.supabase
          .from("work_order_checklist_items")
          .select("id, work_order_id, title, done, sort_order")
          .eq("organization_id", ctx.organizationId)
          .in("work_order_id", orderIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({
          data: [] as {
            id: string;
            work_order_id: string;
            title: string;
            done: boolean;
            sort_order: number;
          }[],
        }),
  ]);

  const customerById = new Map(
    (customersResult.data ?? []).map((row) => [row.id, row] as const),
  );
  const projectMeta = new Map(
    projects.map((row) => {
      const customer = customerById.get(row.customer_id);
      return [
        row.id,
        {
          name: row.name,
          address: customer?.address ?? null,
        },
      ] as const;
    }),
  );
  const nameById = new Map(
    (profilesResult.data ?? []).map(
      (row) => [row.id, row.full_name?.trim() || "—"] as const,
    ),
  );

  const checklistByOrder = new Map<string, WorkOrderChecklistItem[]>();
  for (const item of checklistResult.data ?? []) {
    const list = checklistByOrder.get(item.work_order_id) ?? [];
    list.push({
      id: item.id,
      title: item.title,
      done: Boolean(item.done),
      sortOrder: item.sort_order,
    });
    checklistByOrder.set(item.work_order_id, list);
  }

  return {
    workOrders: orders.map((row) => {
      const meta = projectMeta.get(row.project_id);
      return {
        id: row.id,
        workOrderNumber: row.work_order_number,
        title: row.title,
        description: row.description,
        status: row.status as WorkOrderStatus,
        priority: row.priority as WorkOrderPriority,
        workType: row.work_type,
        projectId: row.project_id,
        projectName: meta?.name ?? "—",
        projectAddress: meta?.address ?? null,
        assigneeUserId: row.assignee_user_id,
        assigneeName: row.assignee_user_id
          ? (nameById.get(row.assignee_user_id) ?? "—")
          : null,
        assigneePhone: null,
        plannedStart: row.planned_start,
        estimatedMinutes: row.estimated_minutes,
        checklist: checklistByOrder.get(row.id) ?? [],
        createdAt: row.created_at,
      };
    }),
    projects: projects.map((row) => ({ id: row.id, name: row.name })),
  };
}
