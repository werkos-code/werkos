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

export function workItemStats(
  items: WorkItemRow[],
  minutesByWorkItem: Record<string, number> = {},
) {
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
  const actualMinutes = leaves.reduce(
    (sum, item) => sum + (minutesByWorkItem[item.id] ?? 0),
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
    actualMinutes,
    remainingMinutes,
    progressPercent,
  };
}

export function estimatedMinutesForItem(
  item: WorkItemRow,
  items: WorkItemRow[],
) {
  if (!item.isGroup) return item.estimatedMinutes ?? 0;
  return items
    .filter((child) => child.parentId === item.id && !child.isGroup)
    .reduce((sum, child) => sum + (child.estimatedMinutes ?? 0), 0);
}

export function actualMinutesForItem(
  item: WorkItemRow,
  items: WorkItemRow[],
  minutesByWorkItem: Record<string, number>,
) {
  if (!item.isGroup) return minutesByWorkItem[item.id] ?? 0;
  return items
    .filter((child) => child.parentId === item.id && !child.isGroup)
    .reduce((sum, child) => sum + (minutesByWorkItem[child.id] ?? 0), 0);
}

/** Expected / actual, e.g. `2u / 1,5u`. */
export function formatHoursPair(
  estimatedMinutes: number | null | undefined,
  actualMinutes: number | null | undefined,
) {
  const expected = formatEstimatedHours(estimatedMinutes);
  const actual =
    actualMinutes && actualMinutes > 0
      ? formatEstimatedHours(actualMinutes)
      : "—";
  return `${expected} / ${actual}`;
}
