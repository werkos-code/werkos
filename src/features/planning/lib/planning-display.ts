import {
  addDays,
  durationMinutes,
  toDateKey,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import {
  CALENDAR_GRID_END_HOUR,
  CALENDAR_GRID_START_HOUR,
  endOfWorkDay,
  hoursForGrid,
  isPreferredWorkSlot,
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

function expandWallClockSegments(item: AppointmentRow): CalendarDisplaySegment[] {
  const start = new Date(item.startsAt);
  const end = new Date(item.endsAt);
  const totalWorkMinutes = durationMinutes(item.startsAt, item.endsAt);
  if (totalWorkMinutes <= 0) return [];

  const segments: CalendarDisplaySegment[] = [];
  let cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  let segmentIndex = 0;

  while (cursor <= end) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    const segStart = new Date(Math.max(start.getTime(), cursor.getTime()));
    const segEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

    if (segStart < segEnd) {
      segments.push({
        segmentKey: `${item.id}:${segmentIndex}`,
        appointment: item,
        segmentIndex,
        segmentCount: 0,
        startsAt: segStart.toISOString(),
        endsAt: segEnd.toISOString(),
        dayKey: toDateKey(cursor),
        isContinuation: segmentIndex > 0,
        totalWorkMinutes,
      });
      segmentIndex += 1;
    }
    cursor = addDays(cursor, 1);
  }

  const count = segments.length;
  return segments.map((segment) => ({ ...segment, segmentCount: count }));
}

function expandWorkDaySegments(
  item: AppointmentRow,
  settings: PlanningSettings,
): CalendarDisplaySegment[] {
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

/**
 * Split for display: work-day distribution for long tasks in preferred slots;
 * wall-clock segments for weekend/evening or short tasks.
 */
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

  const start = new Date(item.startsAt);
  const useWorkDaySplit =
    isPreferredWorkSlot(start, settings) &&
    totalWorkMinutes > minutesPerWorkDay(settings);

  if (useWorkDaySplit) {
    return expandWorkDaySegments(item, settings);
  }
  return expandWallClockSegments(item);
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

/** Visual hint only — scheduling is never blocked on non-work days. */
export function isVisibleWorkDay(day: Date, settings: PlanningSettings) {
  return isWorkDay(day, settings.workDays);
}

export { hoursForGrid, CALENDAR_GRID_START_HOUR, CALENDAR_GRID_END_HOUR };

export function hoursForSettings(settings: PlanningSettings) {
  return hoursForGrid();
}

export function preferredWorkBandTop(settings: PlanningSettings, hourHeight: number) {
  return (settings.dayStartHour - CALENDAR_GRID_START_HOUR) * hourHeight;
}

export function preferredWorkBandHeight(settings: PlanningSettings, hourHeight: number) {
  return (settings.dayEndHour - settings.dayStartHour) * hourHeight;
}
