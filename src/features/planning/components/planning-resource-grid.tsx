"use client";

import type { StaffOption } from "@/features/projects/projects-actions";
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
import { resourceDropId } from "@/features/planning/lib/planning-drop-target";
import { cn } from "@/lib/utils";

type ResourceColumn = {
  id: string | null;
  name: string;
  initials?: string;
};

type PlanningResourceGridProps = {
  day: Date;
  locale: string;
  now: Date;
  staff: StaffOption[];
  includeUnassigned: boolean;
  hours: number[];
  gridHeight: number;
  timedEvents: AppointmentRow[];
  allDayEvents: AppointmentRow[];
  selectedId: string | null;
  activeDropColumn: string | null;
  dropPreviewMinutes: number | null;
  dropPreviewDurationMinutes: number;
  unassignedLabel: string;
  onColumnRef: (key: string, node: HTMLDivElement | null) => void;
  onSlotClick: (day: Date, minutesFromStart: number, assigneeUserId: string | null) => void;
  onEventClick: (item: AppointmentRow) => void;
  onEventDoubleClick?: (item: AppointmentRow) => void;
  onAllDayClick: (item: AppointmentRow) => void;
  onEventResize: (item: AppointmentRow, newEndIso: string) => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlanningResourceGrid({
  day,
  locale,
  now,
  staff,
  includeUnassigned,
  hours,
  gridHeight,
  timedEvents,
  allDayEvents,
  selectedId,
  activeDropColumn,
  dropPreviewMinutes,
  dropPreviewDurationMinutes,
  unassignedLabel,
  onColumnRef,
  onSlotClick,
  onEventClick,
  onEventDoubleClick,
  onAllDayClick,
  onEventResize,
}: PlanningResourceGridProps) {
  const dateKey = toDateKey(day);
  const today = isSameDay(day, now);
  const nowLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const nowTop = minutesSinceDayStart(now) * (PLANNING_HOUR_HEIGHT / 60);
  const showNow = today;

  const columns: ResourceColumn[] = [
    ...staff.map((member) => ({
      id: member.id,
      name: member.name,
      initials: initials(member.name),
    })),
    ...(includeUnassigned
      ? [{ id: null, name: unassignedLabel, initials: "?" }]
      : []),
  ];

  const dayAllDay = allDayEvents.filter((item) => {
    const start = parseIsoDate(item.startsAt);
    const end = parseIsoDate(item.endsAt);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return start <= dayEnd && end >= dayStart;
  });

  const columnCount = Math.max(columns.length, 1);
  const gridTemplate = `3.5rem repeat(${columnCount}, minmax(8rem, 1fr))`;

  return (
    <div className="min-w-[48rem]">
      <div
        className="sticky top-0 z-30 border-b border-border bg-card px-4 py-2"
      >
        <p className="text-sm font-medium">
          {new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(day)}
        </p>
      </div>

      <div className="grid border-b border-border" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="border-r border-border px-1 py-2 text-[10px] text-muted-foreground">
          Hele dag
        </div>
        {columns.map((column) => {
          const items = dayAllDay.filter((item) =>
            column.id
              ? item.assigneeUserId === column.id
              : !item.assigneeUserId,
          );
          return (
            <div
              key={`allday-${column.id ?? "unassigned"}`}
              className="min-h-12 space-y-1 border-r border-border p-1 last:border-r-0"
            >
              {items.map((item) => {
                const color = planningColorForItem(item);
                return (
                  <button
                    key={item.id}
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
        className="sticky top-[2.75rem] z-20 grid border-b border-border bg-card"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="border-r border-border" />
        {columns.map((column) => (
          <div
            key={`header-${column.id ?? "unassigned"}`}
            className="border-r border-border px-2 py-2 text-center last:border-r-0"
          >
            <div className="mx-auto flex flex-col items-center gap-1">
              <span className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
                {column.initials}
              </span>
              <p className="truncate text-xs font-medium">{column.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
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

        {columns.map((column) => {
          const dropId = resourceDropId(dateKey, column.id);
          const columnEvents = timedEvents.filter((item) => {
            if (!isSameDay(parseIsoDate(item.startsAt), day)) return false;
            if (column.id) return item.assigneeUserId === column.id;
            return !item.assigneeUserId;
          });

          return (
            <PlanningTimeColumn
              key={dropId}
              dropId={dropId}
              day={day}
              gridHeight={gridHeight}
              hours={hours}
              locale={locale}
              events={columnEvents}
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
              onSlotClick={(slotDay, minutes) =>
                onSlotClick(slotDay, minutes, column.id)
              }
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
