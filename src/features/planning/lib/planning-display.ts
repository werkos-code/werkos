import {
  addDays,
  durationMinutes,
  toDateKey,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import {
  endOfWorkDay,
  isWorkDay,
  minutesPerWorkDay,
  nextWorkDayStart,
  startOfWorkDay,
  type PlanningSettings,
} from "@/features/planning/lib/planning-settings";

export type CalendarDisplaySegment = {
  segmentKey: string;
  appointment: AppointmentRow;
  segmentIndex: number;
  segmentCount: number;
  startsAt: string;
  endsAt: string;
  dayKey: string;
  isContinuation: boolean;
  totalWorkMinutes: number;
};

export type LayoutedSegment = CalendarDisplaySegment & {
  columnIndex: number;
  columnCount: number;
};

/** Split appointment duration across work days for calendar display. */
export function expandAppointmentSegments(
  item: AppointmentRow,
  settings: PlanningSettings,
): CalendarDisplaySegment[] {
  if (item.allDay) {
    return [
      {
        segmentKey: `${item.id}:0`,
        appointment: item,
        segmentIndex: 0,
        segmentCount: 1,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        dayKey: toDateKey(new Date(item.startsAt)),
        isContinuation: false,
        totalWorkMinutes: durationMinutes(item.startsAt, item.endsAt),
      },
    ];
  }

  const totalWorkMinutes = durationMinutes(item.startsAt, item.endsAt);
  if (totalWorkMinutes <= 0) return [];

  const perDay = minutesPerWorkDay(settings);
  const segments: CalendarDisplaySegment[] = [];
  let remaining = totalWorkMinutes;
  let cursor = new Date(item.startsAt);
  let segmentIndex = 0;

  for (let guard = 0; guard < 366 && remaining > 0; guard += 1) {
    while (!isWorkDay(cursor, settings.workDays)) {
      cursor = nextWorkDayStart(cursor, settings);
    }

    const dayStart = startOfWorkDay(cursor, settings);
    const dayEnd = endOfWorkDay(cursor, settings);
    if (cursor < dayStart) cursor = new Date(dayStart);
    if (cursor >= dayEnd) {
      cursor = nextWorkDayStart(cursor, settings);
      continue;
    }

    const availableToday = Math.min(
      (dayEnd.getTime() - cursor.getTime()) / 60_000,
      perDay,
    );
    const chunk = Math.min(remaining, availableToday);
    const segEnd = new Date(cursor.getTime() + chunk * 60_000);

    segments.push({
      segmentKey: `${item.id}:${segmentIndex}`,
      appointment: item,
      segmentIndex,
      segmentCount: 0,
      startsAt: cursor.toISOString(),
      endsAt: segEnd.toISOString(),
      dayKey: toDateKey(cursor),
      isContinuation: segmentIndex > 0,
      totalWorkMinutes,
    });

    remaining -= chunk;
    segmentIndex += 1;
    if (remaining > 0) {
      cursor = nextWorkDayStart(cursor, settings);
    }
  }

  const count = segments.length;
  return segments.map((segment) => ({ ...segment, segmentCount: count }));
}

export function expandAppointmentsForDay(
  items: AppointmentRow[],
  day: Date,
  settings: PlanningSettings,
) {
  const dayKey = toDateKey(day);
  const segments = items.flatMap((item) =>
    expandAppointmentSegments(item, settings),
  );
  return segments.filter((segment) => segment.dayKey === dayKey);
}

/** Side-by-side columns for overlapping segments on the same day. */
export function layoutOverlappingSegments(
  segments: CalendarDisplaySegment[],
): LayoutedSegment[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort(
    (a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() ||
      a.segmentKey.localeCompare(b.segmentKey),
  );

  type Cluster = CalendarDisplaySegment[];
  const clusters: Cluster[] = [];
  let current: Cluster = [];
  let currentEnd = 0;

  for (const segment of sorted) {
    const start = new Date(segment.startsAt).getTime();
    const end = new Date(segment.endsAt).getTime();
    if (current.length > 0 && start >= currentEnd) {
      clusters.push(current);
      current = [];
    }
    current.push(segment);
    currentEnd = Math.max(currentEnd, end);
  }
  if (current.length > 0) clusters.push(current);

  const layouts: LayoutedSegment[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const clusterStartIndex = layouts.length;

    for (const segment of cluster) {
      const start = new Date(segment.startsAt).getTime();
      const end = new Date(segment.endsAt).getTime();
      let columnIndex = columnEnds.findIndex((columnEnd) => columnEnd <= start);
      if (columnIndex === -1) {
        columnIndex = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[columnIndex] = end;
      }

      layouts.push({
        ...segment,
        columnIndex,
        columnCount: 0,
      });
    }

    const maxColumns = columnEnds.length;
    for (let i = clusterStartIndex; i < layouts.length; i += 1) {
      layouts[i]!.columnCount = maxColumns;
    }
  }

  return layouts;
}

export function layoutDayAppointments(
  items: AppointmentRow[],
  day: Date,
  settings: PlanningSettings,
) {
  const daySegments = expandAppointmentsForDay(items, day, settings);
  return layoutOverlappingSegments(daySegments);
}

/** Filter week grid days to work days only (optional visual dim for non-work days). */
export function isVisibleWorkDay(day: Date, settings: PlanningSettings) {
  return isWorkDay(day, settings.workDays);
}

export function hoursForSettings(settings: PlanningSettings) {
  return Array.from(
    { length: settings.dayEndHour - settings.dayStartHour },
    (_, index) => settings.dayStartHour + index,
  );
}
