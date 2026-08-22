"use client";

import {
  addDays,
  isSameDay,
  parseIsoDate,
  planningColorForItem,
  startOfMonth,
  toDateKey,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type PlanningMonthViewProps = {
  month: Date;
  locale: string;
  now: Date;
  events: AppointmentRow[];
  selectedId: string | null;
  onDayClick: (day: Date) => void;
  onEventClick: (item: AppointmentRow) => void;
};

export function PlanningMonthView({
  month,
  locale,
  now,
  events,
  selectedId,
  onDayClick,
  onEventClick,
}: PlanningMonthViewProps) {
  const monthStart = startOfMonth(month);
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const weeks = Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) =>
      addDays(gridStart, weekIndex * 7 + dayIndex),
    ),
  );

  return (
    <div className="min-h-[36rem]">
      <div className="grid grid-cols-7 border-b border-border">
        {["ma", "di", "wo", "do", "vr", "za", "zo"].map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const today = isSameDay(day, now);
          const dayEvents = events.filter((item) => {
            const start = parseIsoDate(item.startsAt);
            const end = parseIsoDate(item.endsAt);
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            return start <= dayEnd && end >= dayStart;
          });

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-24 border-r border-b border-border p-1.5 text-left transition-colors hover:bg-muted/30",
                !inMonth && "bg-muted/10 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                  today && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </span>
              <ul className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((item) => {
                  const color = planningColorForItem(item);
                  return (
                    <li key={`${item.id}-${key}`}>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEventClick(item);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.stopPropagation();
                            onEventClick(item);
                          }
                        }}
                        className={cn(
                          "block w-full truncate rounded px-1 py-0.5 text-[10px] font-medium",
                          color.bg,
                          color.text,
                          selectedId === item.id && "ring-1 ring-primary/50",
                        )}
                      >
                        {item.title}
                      </span>
                    </li>
                  );
                })}
                {dayEvents.length > 3 ? (
                  <li className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}
                  </li>
                ) : null}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
