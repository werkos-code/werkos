import type {
  AppointmentStatus,
  AppointmentType,
} from "@/types/database";

export const PLANNING_SNAP_MINUTES = 15;

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "planned",
  "in_progress",
  "done",
  "cancelled",
];

export const APPOINTMENT_TYPES: AppointmentType[] = [
  "work",
  "meeting",
  "delivery",
  "other",
];

export type AppointmentRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status: AppointmentStatus;
  type: AppointmentType;
  projectId: string | null;
  projectName: string | null;
  workItemId: string | null;
  workItemTitle: string | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  location: string | null;
  notes: string | null;
};

export type UnplannedWorkItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  status: string;
  estimatedMinutes: number | null;
  assigneeUserId: string | null;
  assigneeName: string | null;
  category: string | null;
};

export type CalendarDragData =
  | {
      kind: "event";
      item: AppointmentRow;
      durationMinutes: number;
    }
  | {
      kind: "unplanned";
      item: UnplannedWorkItem;
      durationMinutes: number;
    };

export type PlanningProjectOption = {
  id: string;
  name: string;
  customerName?: string | null;
};

/** Soft pastel event colors for calendar blocks */
export type PlanningColorClasses = {
  bg: string;
  border: string;
  text: string;
};

export const PLANNING_EVENT_COLORS = [
  { bg: "bg-sky-100", border: "border-sky-300", text: "text-sky-950" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-950" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-950" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-950" },
  { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-950" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-950" },
] as const satisfies readonly PlanningColorClasses[];

/** Functional colors by appointment type (text always carries meaning too). */
export const PLANNING_TYPE_COLORS: Record<AppointmentType, PlanningColorClasses> = {
  work: {
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-950",
  },
  meeting: {
    bg: "bg-violet-100",
    border: "border-violet-300",
    text: "text-violet-950",
  },
  delivery: {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-950",
  },
  other: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-950",
  },
};

export function planningColorForKey(key: string | null | undefined) {
  const seed = key ?? "default";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return PLANNING_EVENT_COLORS[hash % PLANNING_EVENT_COLORS.length]!;
}

export function planningColorForItem(item: {
  type?: AppointmentType;
  status?: AppointmentStatus;
  projectId?: string | null;
  id?: string;
}) {
  if (item.type && PLANNING_TYPE_COLORS[item.type]) {
    const base = PLANNING_TYPE_COLORS[item.type];
    if (item.status === "cancelled") {
      return {
        bg: "bg-muted/60",
        border: "border-border",
        text: "text-muted-foreground line-through",
      };
    }
    if (item.status === "done") {
      return {
        ...base,
        bg: `${base.bg}/70`,
      };
    }
    return base;
  }
  return planningColorForKey(item.projectId ?? item.id);
}

export const PLANNING_DAY_START_HOUR = 7;
export const PLANNING_DAY_END_HOUR = 18;
export const PLANNING_HOUR_HEIGHT = 56;

export function startOfWeek(date: Date, weekStartsOn = 1) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function parseIsoDate(iso: string) {
  return new Date(iso);
}

export function minutesSinceDayStart(date: Date, dayStartHour = PLANNING_DAY_START_HOUR) {
  return date.getHours() * 60 + date.getMinutes() - dayStartHour * 60;
}

export function durationMinutes(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatTimeRange(startsAt: string, endsAt: string, locale: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const fmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function formatDurationHours(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours}u`;
  return `${Math.round(hours * 10) / 10}u`;
}

export function snapToGridMinutes(
  minutes: number,
  snap = PLANNING_SNAP_MINUTES,
) {
  return Math.max(0, Math.round(minutes / snap) * snap);
}

export function minutesToDateOnDay(
  day: Date,
  minutesFromDayStart: number,
  dayStartHour = PLANNING_DAY_START_HOUR,
) {
  const d = new Date(day);
  d.setHours(dayStartHour, 0, 0, 0);
  d.setMinutes(d.getMinutes() + minutesFromDayStart);
  return d;
}

export function dropMinutesFromPointer(
  clientY: number,
  columnTop: number,
  dayStartHour = PLANNING_DAY_START_HOUR,
  dayEndHour = PLANNING_DAY_END_HOUR,
) {
  const y = Math.max(0, clientY - columnTop);
  const rawMinutes = (y / PLANNING_HOUR_HEIGHT) * 60;
  const maxMinutes = (dayEndHour - dayStartHour) * 60 - PLANNING_SNAP_MINUTES;
  return snapToGridMinutes(Math.min(rawMinutes, maxMinutes));
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) {
  return aStart < bEnd && bStart < aEnd;
}

export function findAssigneeConflicts(
  appointments: AppointmentRow[],
  assigneeUserId: string | null | undefined,
  startsAt: string,
  endsAt: string,
  excludeId?: string,
) {
  if (!assigneeUserId) return [];
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

  return appointments.filter((item) => {
    if (excludeId && item.id === excludeId) return false;
    if (item.assigneeUserId !== assigneeUserId) return false;
    if (item.status === "cancelled") return false;
    const itemStart = new Date(item.startsAt).getTime();
    const itemEnd = new Date(item.endsAt).getTime();
    return rangesOverlap(start, end, itemStart, itemEnd);
  });
}

export function startOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
