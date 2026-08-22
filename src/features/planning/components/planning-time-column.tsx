"use client";

import { useDroppable } from "@dnd-kit/core";
import { useCallback, type MouseEvent as ReactMouseEvent } from "react";

import { DraggableCalendarEvent } from "@/features/planning/components/planning-calendar-event";
import {
  PLANNING_HOUR_HEIGHT,
  snapToGridMinutes,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type PlanningTimeColumnProps = {
  dropId: string;
  day: Date;
  gridHeight: number;
  hours: number[];
  locale: string;
  events: AppointmentRow[];
  selectedId: string | null;
  showNow: boolean;
  nowTop: number;
  nowLabel: string;
  dropPreviewMinutes: number | null;
  dropPreviewDurationMinutes: number;
  isDropTarget: boolean;
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
  events,
  selectedId,
  showNow,
  nowTop,
  nowLabel,
  dropPreviewMinutes,
  dropPreviewDurationMinutes,
  isDropTarget,
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
        (isOver || isDropTarget) && "bg-primary/5",
      )}
      style={{ height: gridHeight }}
      onClick={handleClick}
    >
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

      {events.map((item) => (
        <DraggableCalendarEvent
          key={item.id}
          item={item}
          locale={locale}
          selected={selectedId === item.id}
          onClick={() => onEventClick(item)}
          onDoubleClick={onEventDoubleClick}
          onResize={(newEndIso) => onEventResize(item, newEndIso)}
        />
      ))}
    </div>
  );
}
