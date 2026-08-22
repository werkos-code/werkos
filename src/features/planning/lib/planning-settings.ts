export const DEFAULT_PLANNING_WORK_DAYS = [1, 2, 3, 4, 5] as const;

export type PlanningSettings = {
  workDays: number[];
  dayStartHour: number;
  dayEndHour: number;
  setupCompleted: boolean;
};

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  workDays: [...DEFAULT_PLANNING_WORK_DAYS],
  dayStartHour: 7,
  dayEndHour: 17,
  setupCompleted: false,
};

export function minutesPerWorkDay(settings: PlanningSettings) {
  return Math.max(0, (settings.dayEndHour - settings.dayStartHour) * 60);
}

/** ISO weekday: Mon=1 … Sun=7 */
export function isoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function isWorkDay(date: Date, workDays: number[]) {
  return workDays.includes(isoWeekday(date));
}

export function normalizePlanningSettings(input: {
  workDays?: number[] | null;
  dayStartHour?: number | null;
  dayEndHour?: number | null;
  setupCompleted?: boolean | null;
}): PlanningSettings {
  const workDays =
    input.workDays?.filter((day) => day >= 1 && day <= 7) ??
    DEFAULT_PLANNING_SETTINGS.workDays;
  const dayStartHour = input.dayStartHour ?? DEFAULT_PLANNING_SETTINGS.dayStartHour;
  const dayEndHour = input.dayEndHour ?? DEFAULT_PLANNING_SETTINGS.dayEndHour;
  return {
    workDays: workDays.length > 0 ? workDays : [...DEFAULT_PLANNING_WORK_DAYS],
    dayStartHour: Math.max(0, Math.min(23, dayStartHour)),
    dayEndHour: Math.max(dayStartHour + 1, Math.min(24, dayEndHour)),
    setupCompleted: Boolean(input.setupCompleted),
  };
}

export function startOfWorkDay(date: Date, settings: PlanningSettings) {
  const d = new Date(date);
  d.setHours(settings.dayStartHour, 0, 0, 0);
  return d;
}

export function endOfWorkDay(date: Date, settings: PlanningSettings) {
  const d = new Date(date);
  d.setHours(settings.dayEndHour, 0, 0, 0);
  return d;
}

export function nextWorkDayStart(from: Date, settings: PlanningSettings) {
  let d = new Date(from);
  d.setDate(d.getDate() + 1);
  d.setHours(settings.dayStartHour, 0, 0, 0);
  for (let i = 0; i < 14; i += 1) {
    if (isWorkDay(d, settings.workDays)) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Spread total work minutes from start across configured work days/hours. */
export function computeEndAcrossWorkDays(
  start: Date,
  totalMinutes: number,
  settings: PlanningSettings,
) {
  if (totalMinutes <= 0) return new Date(start);

  let remaining = totalMinutes;
  let cursor = new Date(start);

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

    const available = Math.min(
      (dayEnd.getTime() - cursor.getTime()) / 60_000,
      minutesPerWorkDay(settings),
    );
    const chunk = Math.min(remaining, available);
    remaining -= chunk;
    cursor = new Date(cursor.getTime() + chunk * 60_000);

    if (remaining > 0) {
      cursor = nextWorkDayStart(cursor, settings);
    }
  }

  return cursor;
}
