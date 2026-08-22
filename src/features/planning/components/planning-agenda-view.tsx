"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  formatTimeRange,
  parseIsoDate,
  planningColorForItem,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type PlanningAgendaViewProps = {
  rangeStart: Date;
  rangeEnd: Date;
  locale: string;
  events: AppointmentRow[];
  selectedId: string | null;
  onEventClick: (item: AppointmentRow) => void;
};

export function PlanningAgendaView({
  rangeStart,
  rangeEnd,
  locale,
  events,
  selectedId,
  onEventClick,
}: PlanningAgendaViewProps) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const map = new Map<string, AppointmentRow[]>();
    for (const item of sorted) {
      const start = parseIsoDate(item.startsAt);
      if (start < rangeStart || start > rangeEnd) continue;
      const key = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(start);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [events, locale, rangeStart, rangeEnd]);

  if (grouped.length === 0) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Geen geplande items in deze periode.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {grouped.map(([dayLabel, items]) => (
        <section key={dayLabel} className="p-4">
          <h3 className="text-sm font-medium">{dayLabel}</h3>
          <ul className="mt-3 space-y-2">
            {items.map((item) => {
              const color = planningColorForItem(item);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/30",
                      selectedId === item.id && "ring-2 ring-primary/40",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 w-1 shrink-0 self-stretch rounded-full",
                        color.bg,
                        color.border,
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.title}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.allDay
                            ? "Hele dag"
                            : formatTimeRange(item.startsAt, item.endsAt, locale)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {item.projectName ?? "—"}
                        {item.assigneeName ? ` · ${item.assigneeName}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
