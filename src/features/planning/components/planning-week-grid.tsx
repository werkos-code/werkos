"use client";

import { PlanningTimeColumn } from "@/features/planning/components/planning-time-column";
import {
  PLANNING_HOUR_HEIGHT,
  formatHourLabel,
  isSameDay,
  minutesSinceDayStart,
  parseIsoDate,
  planningColorForItem,
  toDateKey,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { dayDropId } from "@/features/planning/lib/planning-drop-target";
import { cn } from "@/lib/utils";

export type { CalendarDragData } from "@/features/planning/lib/planning";
export { CalendarEventOverlay } from "@/features/planning/components/planning-calendar-event";

type PlanningWeekGridProps = {
  days: Date[];
  hours: number[];
  gridHeight: number;
  locale: string;
  now: Date;
  allDayLabel: string;
  timedEvents: AppointmentRow[];
  allDayEvents: AppointmentRow[];
  selectedId: string | null;
  activeDropColumn: string | null;
  dropPreviewMinutes: number | null;
  dropPreviewDurationMinutes: number;
  onColumnRef: (key: string, node: HTMLDivElement | null) => void;
  onSlotClick: (day: Date, minutesFromStart: number) => void;
  onEventClick: (item: AppointmentRow) => void;
  onEventDoubleClick?: (item: AppointmentRow) => void;
  onAllDayClick: (item: AppointmentRow) => void;
  onEventResize: (item: AppointmentRow, newEndIso: string) => void;
};

export function PlanningWeekGrid({
  days,
  hours,
  gridHeight,
  locale,
  now,
  allDayLabel,
  timedEvents,
  allDayEvents,
  selectedId,
  activeDropColumn,
  dropPreviewMinutes,
  dropPreviewDurationMinutes,
  onColumnRef,
  onSlotClick,
  onEventClick,
  onEventDoubleClick,
  onAllDayClick,
  onEventResize,
}: PlanningWeekGridProps) {
  const nowLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return (
    <div className="min-w-[52rem]">
      <div
        className="sticky top-0 z-30 grid border-b border-border bg-card"
        style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-r border-border" />
        {days.map((day) => {
          const today = isSameDay(day, now);
          return (
            <div
              key={toDateKey(day)}
              className="border-r border-border px-2 py-2 text-center last:border-r-0"
            >
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="grid border-b border-border"
        style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-r border-border px-1 py-2 text-[10px] text-muted-foreground">
          {allDayLabel}
        </div>
        {days.map((day) => {
          const key = toDateKey(day);
          const items = allDayEvents.filter((item) => {
            const start = parseIsoDate(item.startsAt);
            const end = parseIsoDate(item.endsAt);
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            return start <= dayEnd && end >= dayStart;
          });
          return (
            <div
              key={`allday-${key}`}
              className="min-h-12 space-y-1 border-r border-border p-1 last:border-r-0"
            >
              {items.map((item) => {
                const color = planningColorForItem(item);
                return (
                  <button
                    key={`${item.id}-${key}`}
                    type="button"
                    onClick={() => onAllDayClick(item)}
                    className={cn(
                      "block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium",
                      color.bg,
                      color.border,
                      color.text,
                      selectedId === item.id && "ring-2 ring-primary/40",
                    )}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}
      >
        <div className="relative border-r border-border">
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/70 pr-1 text-right text-[10px] text-muted-foreground"
              style={{ height: PLANNING_HOUR_HEIGHT }}
            >
              <span className="-translate-y-1.5 inline-block">
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = toDateKey(day);
          const dropId = dayDropId(key);
          const dayEvents = timedEvents.filter(
            (item) => !item.allDay && isSameDay(parseIsoDate(item.startsAt), day),
          );
          const showNow = isSameDay(day, now);
          const nowTop = minutesSinceDayStart(now) * (PLANNING_HOUR_HEIGHT / 60);

          return (
            <PlanningTimeColumn
              key={`grid-${key}`}
              dropId={dropId}
              day={day}
              gridHeight={gridHeight}
              hours={hours}
              locale={locale}
              events={dayEvents}
              selectedId={selectedId}
              showNow={showNow}
              nowTop={nowTop}
              nowLabel={nowLabel}
              dropPreviewMinutes={
                activeDropColumn === dropId ? dropPreviewMinutes : null
              }
              dropPreviewDurationMinutes={dropPreviewDurationMinutes}
              isDropTarget={activeDropColumn === dropId}
              onColumnRef={onColumnRef}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
              onEventDoubleClick={onEventDoubleClick}
              onEventResize={onEventResize}
            />
          );
        })}
      </div>
    </div>
  );
}
