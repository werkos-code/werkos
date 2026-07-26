export type TimeEntryRow = {
  id: string;
  projectId: string;
  workItemId: string;
  workOrderId: string | null;
  userId: string;
  userName: string;
  workDate: string;
  minutes: number;
  notes: string | null;
  createdAt: string;
};

export function sumMinutesByWorkItem(
  entries: Pick<TimeEntryRow, "workItemId" | "minutes">[],
) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.workItemId, (map.get(entry.workItemId) ?? 0) + entry.minutes);
  }
  return map;
}

export function hoursInputToMinutes(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}

export function minutesToHoursInput(minutes: number | null | undefined) {
  if (minutes == null) return "";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return String(hours);
  return String(Math.round(hours * 100) / 100);
}
