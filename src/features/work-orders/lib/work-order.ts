import type { WorkOrderPriority, WorkOrderStatus } from "@/types/database";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "open",
  "planned",
  "in_progress",
  "done",
  "cancelled",
];

export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = [
  "low",
  "normal",
  "high",
];

export type WorkOrderChecklistItem = {
  id: string;
  title: string;
  done: boolean;
  sortOrder: number;
};

export type WorkOrderRow = {
  id: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  workType: string | null;
  projectId: string;
  projectName: string;
  projectAddress: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneePhone: string | null;
  plannedStart: string | null;
  estimatedMinutes: number | null;
  checklist: WorkOrderChecklistItem[];
  createdAt: string;
};

export type WorkOrderProjectOption = {
  id: string;
  name: string;
};

export function workOrderStats(orders: WorkOrderRow[]) {
  return {
    total: orders.length,
    open: orders.filter((o) => o.status === "open").length,
    planned: orders.filter((o) => o.status === "planned").length,
    inProgress: orders.filter((o) => o.status === "in_progress").length,
    done: orders.filter((o) => o.status === "done").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };
}
