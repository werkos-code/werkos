"use client";

import { useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo, type MouseEvent as ReactMouseEvent } from "react";

import { DraggableCalendarEvent } from "@/features/planning/components/planning-calendar-event";
import {
  CALENDAR_GRID_END_HOUR,
  CALENDAR_GRID_START_HOUR,
  layoutDayAppointments,
  preferredWorkBandHeight,
  preferredWorkBandTop,
} from "@/features/planning/lib/planning-display";
import {
  PLANNING_HOUR_HEIGHT,
  snapToGridMinutes,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import type { PlanningSettings } from "@/features/planning/lib/planning-settings";
import { cn } from "@/lib/utils";

type PlanningTimeColumnProps = {
  dropId: string;
  day: Date;
  gridHeight: number;
  hours: number[];
  locale: string;
  settings: PlanningSettings;
  events: AppointmentRow[];
  selectedId: string | null;
  showNow: boolean;
  nowTop: number;
  nowLabel: string;
  dropPreviewMinutes: number | null;
  dropPreviewDurationMinutes: number;
  isDropTarget: boolean;
  isWorkDay?: boolean;
  onColumnRef: (key: string, node: HTMLDivElement | null) => void;
  onSlotClick: (day: Date, minutesFromStart: number) => void;
  onEventClick: (item: AppointmentRow) => void;
  onEventDoubleClick?: (item: AppointmentRow) => void;
  onEventResize: (item: AppointmentRow, newEndIso: string) => void;
};

export function PlanningTimeColumn({
  dropId,
  day,
  gridHeight,
  hours,
  locale,
  settings,
  events,
  selectedId,
  showNow,
  nowTop,
  nowLabel,
  dropPreviewMinutes,
  dropPreviewDurationMinutes,
  isDropTarget,
  isWorkDay = true,
  onColumnRef,
  onSlotClick,
  onEventClick,
  onEventDoubleClick,
  onEventResize,
}: PlanningTimeColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { day },
  });

  const layouted = useMemo(
    () => layoutDayAppointments(events, day, settings),
    [events, day, settings],
  );

  const workBandTop = preferredWorkBandTop(settings, PLANNING_HOUR_HEIGHT);
  const workBandHeight = preferredWorkBandHeight(settings, PLANNING_HOUR_HEIGHT);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      onColumnRef(dropId, node);
    },
    [dropId, onColumnRef, setNodeRef],
  );

  function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-event-block]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const rawMinutes = (y / PLANNING_HOUR_HEIGHT) * 60;
    const minutes = snapToGridMinutes(rawMinutes);
    onSlotClick(day, minutes);
  }

  return (
    <div
      ref={setRef}
      className={cn(
        "relative border-r border-border last:border-r-0",
        !isWorkDay && "bg-muted/15",
        (isOver || isDropTarget) && "bg-primary/5",
      )}
      style={{ height: gridHeight }}
      onClick={handleClick}
    >
      {isWorkDay ? (
        <div
          className="pointer-events-none absolute right-0 left-0 bg-primary/[0.03]"
          style={{ top: workBandTop, height: workBandHeight }}
        />
      ) : null}

      {hours.map((hour) => (
        <div
          key={`${dropId}-${hour}`}
          className="border-b border-border/60"
          style={{ height: PLANNING_HOUR_HEIGHT }}
        />
      ))}

      {dropPreviewMinutes !== null ? (
        <div
          className="pointer-events-none absolute right-1 left-1 z-10 rounded-md border-2 border-dashed border-primary/50 bg-primary/10"
          style={{
            top: (dropPreviewMinutes / 60) * PLANNING_HOUR_HEIGHT,
            height: Math.max(
              28,
              (dropPreviewDurationMinutes / 60) * PLANNING_HOUR_HEIGHT,
            ),
          }}
        />
      ) : null}

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

      {layouted.map((segment) => (
        <DraggableCalendarEvent
          key={segment.segmentKey}
          segment={segment}
          locale={locale}
          gridStartHour={CALENDAR_GRID_START_HOUR}
          gridEndHour={CALENDAR_GRID_END_HOUR}
          selected={selectedId === segment.appointment.id}
          onClick={() => onEventClick(segment.appointment)}
          onDoubleClick={onEventDoubleClick}
          onResize={(newEndIso) => onEventResize(segment.appointment, newEndIso)}
        />
      ))}
    </div>
  );
}
