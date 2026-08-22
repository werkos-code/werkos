"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
  PLANNING_DAY_END_HOUR,
  PLANNING_HOUR_HEIGHT,
  PLANNING_SNAP_MINUTES,
  durationMinutes,
  formatTimeRange,
  minutesSinceDayStart,
  parseIsoDate,
  planningColorForItem,
  snapToGridMinutes,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

import type { CalendarDragData } from "@/features/planning/lib/planning";

type DraggableCalendarEventProps = {
  item: AppointmentRow;
  locale: string;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: (item: AppointmentRow) => void;
  onResize: (newEndIso: string) => void;
};

export function DraggableCalendarEvent({
  item,
  locale,
  selected,
  onClick,
  onDoubleClick,
  onResize,
}: DraggableCalendarEventProps) {
  const dur = Math.max(
    PLANNING_SNAP_MINUTES,
    durationMinutes(item.startsAt, item.endsAt),
  );
  const [previewEnd, setPreviewEnd] = useState<string | null>(null);
  const previewEndRef = useRef<string | null>(null);
  const displayEnd = previewEnd ?? item.endsAt;
  const displayDur = Math.max(
    PLANNING_SNAP_MINUTES,
    durationMinutes(item.startsAt, displayEnd),
  );
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event:${item.id}`,
    data: {
      kind: "event" as const,
      item,
      durationMinutes: dur,
    } satisfies CalendarDragData,
  });

  const start = parseIsoDate(item.startsAt);
  const mins = minutesSinceDayStart(start);
  const top = (mins / 60) * PLANNING_HOUR_HEIGHT;
  const height = (displayDur / 60) * PLANNING_HOUR_HEIGHT;
  const color = planningColorForItem(item);
  const resizeRef = useRef<{ startY: number; startEnd: number } | null>(null);

  function onResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.preventDefault();
    const startEnd = new Date(item.endsAt).getTime();
    resizeRef.current = { startY: event.clientY, startEnd };
    event.currentTarget.setPointerCapture(event.pointerId);

    function onMove(moveEvent: PointerEvent) {
      if (!resizeRef.current) return;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;
      const deltaMinutes = snapToGridMinutes(
        (deltaY / PLANNING_HOUR_HEIGHT) * 60,
      );
      const newEnd = new Date(
        resizeRef.current.startEnd + deltaMinutes * 60_000,
      );
      const minEnd =
        new Date(item.startsAt).getTime() + PLANNING_SNAP_MINUTES * 60_000;
      const maxEnd = new Date(item.startsAt);
      maxEnd.setHours(PLANNING_DAY_END_HOUR, 0, 0, 0);
      const clamped = Math.min(
        maxEnd.getTime(),
        Math.max(minEnd, newEnd.getTime()),
      );
      const iso = new Date(clamped).toISOString();
      previewEndRef.current = iso;
      setPreviewEnd(iso);
    }

    function onUp() {
      const finalEnd = previewEndRef.current;
      if (finalEnd && finalEnd !== item.endsAt) {
        onResize(finalEnd);
      }
      previewEndRef.current = null;
      setPreviewEnd(null);
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={setNodeRef}
      data-event-block
      className={cn(
        "absolute right-1 left-1 z-10 touch-manipulation",
        isDragging && "opacity-30",
      )}
      style={{ top: Math.max(0, top), height: Math.max(32, height - 2) }}
    >
      <div
        {...listeners}
        {...attributes}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onDoubleClick?.(item);
        }}
        className={cn(
          "group relative flex h-full cursor-grab flex-col overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md",
          color.bg,
          color.border,
          color.text,
          selected && "ring-2 ring-primary/50",
        )}
      >
        <p className="truncate text-[10px] font-medium opacity-80">
          {formatTimeRange(item.startsAt, displayEnd, locale)}
        </p>
        {item.projectName ? (
          <p className="truncate text-[10px] opacity-70">{item.projectName}</p>
        ) : null}
        <p className="truncate text-xs font-semibold">
          {item.workItemTitle && item.workItemTitle !== item.title
            ? item.workItemTitle
            : item.title}
        </p>
        {item.assigneeName ? (
          <p className="mt-0.5 truncate text-[10px] opacity-80">
            {item.assigneeName}
          </p>
        ) : null}
        <div
          role="separator"
          aria-orientation="horizontal"
          onPointerDown={onResizePointerDown}
          className="absolute right-0 bottom-0 left-0 h-3 cursor-ns-resize touch-manipulation opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </div>
  );
}

export function CalendarEventOverlay({
  item,
  locale,
}: {
  item: AppointmentRow;
  locale: string;
}) {
  const color = planningColorForItem(item);
  return (
    <div
      className={cn(
        "w-44 rounded-lg border px-2 py-1 shadow-lg",
        color.bg,
        color.border,
        color.text,
      )}
    >
      <p className="truncate text-[10px] font-medium opacity-80">
        {formatTimeRange(item.startsAt, item.endsAt, locale)}
      </p>
      <p className="truncate text-xs font-semibold">{item.title}</p>
    </div>
  );
}
