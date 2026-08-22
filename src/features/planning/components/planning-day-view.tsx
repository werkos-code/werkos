"use client";

import {
  PLANNING_DAY_END_HOUR,
  PLANNING_DAY_START_HOUR,
  PLANNING_HOUR_HEIGHT,
  durationMinutes,
  formatHourLabel,
  formatTimeRange,
  isSameDay,
  minutesSinceDayStart,
  parseIsoDate,
  planningColorForItem,
  snapToGridMinutes,
  toDateKey,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type PlanningDayViewProps = {
  day: Date;
  locale: string;
  now: Date;
  events: AppointmentRow[];
  selectedId: string | null;
  onSlotClick: (day: Date, minutesFromStart: number) => void;
  onEventClick: (item: AppointmentRow) => void;
};

export function PlanningDayView({
  day,
  locale,
  now,
  events,
  selectedId,
  onSlotClick,
  onEventClick,
}: PlanningDayViewProps) {
  const hours = Array.from(
    { length: PLANNING_DAY_END_HOUR - PLANNING_DAY_START_HOUR },
    (_, index) => PLANNING_DAY_START_HOUR + index,
  );
  const gridHeight =
    (PLANNING_DAY_END_HOUR - PLANNING_DAY_START_HOUR) * PLANNING_HOUR_HEIGHT;
  const timedEvents = events.filter((item) => !item.allDay);
  const allDayEvents = events.filter((item) => item.allDay);
  const showNow = isSameDay(day, now);
  const nowTop = minutesSinceDayStart(now) * (PLANNING_HOUR_HEIGHT / 60);
  const nowLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-event-block]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const minutes = snapToGridMinutes((y / PLANNING_HOUR_HEIGHT) * 60);
    onSlotClick(day, minutes);
  }

  return (
    <div className="min-h-[36rem] overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium">
          {new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(day)}
        </p>
      </div>

      {allDayEvents.length > 0 ? (
        <div className="space-y-1 border-b border-border px-4 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">Hele dag</p>
          {allDayEvents.map((item) => {
            const color = planningColorForItem(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onEventClick(item)}
                className={cn(
                  "block w-full rounded-md border px-2 py-1.5 text-left text-sm",
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
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "3.5rem 1fr" }}>
        <div className="border-r border-border">
          {hours.map((hour) => (
            <div
              key={hour}
              className="border-b border-border/70 pr-1 text-right text-[10px] text-muted-foreground"
              style={{ height: PLANNING_HOUR_HEIGHT }}
            >
              <span className="-translate-y-1.5 inline-block">{formatHourLabel(hour)}</span>
            </div>
          ))}
        </div>
        <div
          className="relative"
          style={{ height: gridHeight }}
          onClick={handleClick}
        >
          {hours.map((hour) => (
            <div
              key={`day-${hour}`}
              className="border-b border-border/60"
              style={{ height: PLANNING_HOUR_HEIGHT }}
            />
          ))}
          {showNow && nowTop >= 0 && nowTop <= gridHeight ? (
            <div
              className="pointer-events-none absolute right-0 left-0 z-20"
              style={{ top: nowTop }}
            >
              <div className="relative border-t-2 border-red-500">
                <span className="absolute -top-2.5 -left-1 rounded bg-red-500 px-1 text-[9px] font-medium text-white">
                  {nowLabel}
                </span>
              </div>
            </div>
          ) : null}
          {timedEvents
            .filter((item) => isSameDay(parseIsoDate(item.startsAt), day))
            .map((item) => {
              const start = parseIsoDate(item.startsAt);
              const mins = minutesSinceDayStart(start);
              const dur = Math.max(30, durationMinutes(item.startsAt, item.endsAt));
              const top = (mins / 60) * PLANNING_HOUR_HEIGHT;
              const height = (dur / 60) * PLANNING_HOUR_HEIGHT;
              const color = planningColorForItem(item);
              return (
                <button
                  key={item.id}
                  data-event-block
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEventClick(item);
                  }}
                  className={cn(
                    "absolute right-2 left-2 z-10 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm hover:shadow-md",
                    color.bg,
                    color.border,
                    color.text,
                    selectedId === item.id && "ring-2 ring-primary/50",
                  )}
                  style={{ top: Math.max(0, top), height: Math.max(32, height - 2) }}
                >
                  <p className="truncate text-[10px] font-medium opacity-80">
                    {formatTimeRange(item.startsAt, item.endsAt, locale)}
                  </p>
                  <p className="truncate text-xs font-semibold">{item.title}</p>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
