export type PlanningDropTarget =
  | { kind: "day"; dateKey: string; columnKey: string }
  | {
      kind: "resource";
      dateKey: string;
      assigneeUserId: string | null;
      columnKey: string;
    };

export function planningDropTargetFromId(overId: string): PlanningDropTarget | null {
  if (overId.startsWith("slot:")) {
    const dateKey = overId.slice(5);
    return { kind: "day", dateKey, columnKey: overId };
  }
  if (overId.startsWith("resource:")) {
    const rest = overId.slice(9);
    const separator = rest.indexOf(":");
    if (separator === -1) return null;
    const dateKey = rest.slice(0, separator);
    const assigneePart = rest.slice(separator + 1);
    return {
      kind: "resource",
      dateKey,
      assigneeUserId: assigneePart === "unassigned" ? null : assigneePart,
      columnKey: overId,
    };
  }
  return null;
}

export function resourceDropId(dateKey: string, assigneeUserId: string | null) {
  return `resource:${dateKey}:${assigneeUserId ?? "unassigned"}`;
}

export function dayDropId(dateKey: string) {
  return `slot:${dateKey}`;
}
