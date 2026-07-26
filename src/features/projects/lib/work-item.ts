import type { WorkItemStatus } from "@/types/database";

export const WORK_ITEM_STATUSES: WorkItemStatus[] = [
  "open",
  "in_progress",
  "done",
];

export const WORK_ITEM_PRIORITIES = ["low", "normal", "high"] as const;
export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export type WorkItemRow = {
  id: string;
  title: string;
  status: WorkItemStatus;
  parentId: string | null;
  description: string | null;
  category: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  estimatedMinutes: number | null;
  priority: WorkItemPriority;
  labels: string[];
  isGroup: boolean;
  sortOrder: number;
};

export function workItemProgressPercent(
  item: WorkItemRow,
  children: WorkItemRow[],
) {
  const leaves = children.filter((child) => !child.isGroup);
  if (leaves.length > 0) {
    const done = leaves.filter((child) => child.status === "done").length;
    return Math.round((done / leaves.length) * 100);
  }
  if (item.status === "done") return 100;
  if (item.status === "in_progress") return 50;
  return 0;
}

export function plannedDurationDays(
  start: string | null,
  end: string | null,
) {
  if (!start || !end) return null;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) {
    return null;
  }
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export function isWorkItemOverdue(item: {
  status: WorkItemStatus;
  plannedEnd: string | null;
}, today = new Date()) {
  if (item.status === "done" || !item.plannedEnd) return false;
  const end = new Date(`${item.plannedEnd}T23:59:59`);
  return end < today;
}

export function formatEstimatedHours(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return "—";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}u`;
  return `${Math.round(hours * 10) / 10}u`;
}

export function workItemStats(items: WorkItemRow[]) {
  const leaves = items.filter((item) => !item.isGroup);
  const total = leaves.length;
  const done = leaves.filter((i) => i.status === "done").length;
  const inProgress = leaves.filter((i) => i.status === "in_progress").length;
  const open = leaves.filter((i) => i.status === "open").length;
  const overdue = leaves.filter((i) => isWorkItemOverdue(i)).length;
  const estimatedMinutes = leaves.reduce(
    (sum, item) => sum + (item.estimatedMinutes ?? 0),
    0,
  );
  const remainingMinutes = leaves
    .filter((i) => i.status !== "done")
    .reduce((sum, item) => sum + (item.estimatedMinutes ?? 0), 0);
  const progressPercent =
    total === 0 ? null : Math.round((done / total) * 100);

  return {
    total,
    done,
    inProgress,
    open,
    overdue,
    estimatedMinutes,
    remainingMinutes,
    progressPercent,
  };
}
