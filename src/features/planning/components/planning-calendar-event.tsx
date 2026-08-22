"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
  PLANNING_HOUR_HEIGHT,
  PLANNING_SNAP_MINUTES,
  durationMinutes,
  formatTimeRange,
  minutesSinceDayStart,
  planningColorForItem,
  snapToGridMinutes,
  type AppointmentRow,
} from "@/features/planning/lib/planning";
import type { LayoutedSegment } from "@/features/planning/lib/planning-display";
import type { CalendarDragData } from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type DraggableCalendarEventProps = {
  segment: LayoutedSegment;
  locale: string;
  gridStartHour: number;
  gridEndHour: number;
  selected: boolean;
  onClick: () => void;
  onDoubleClick?: (item: AppointmentRow) => void;
  onResize: (newEndIso: string) => void;
};

export function DraggableCalendarEvent({
  segment,
  locale,
  gridStartHour,
  gridEndHour,
  selected,
  onClick,
  onDoubleClick,
  onResize,
}: DraggableCalendarEventProps) {
  const item = segment.appointment;
  const displayDur = Math.max(
    PLANNING_SNAP_MINUTES,
    durationMinutes(segment.startsAt, segment.endsAt),
  );
  const [previewEnd, setPreviewEnd] = useState<string | null>(null);
  const previewEndRef = useRef<string | null>(null);
  const segmentEnd = previewEnd ?? segment.endsAt;
  const segmentDur = Math.max(
    PLANNING_SNAP_MINUTES,
    durationMinutes(segment.startsAt, segmentEnd),
  );

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event:${segment.segmentKey}`,
    data: {
      kind: "event" as const,
      item,
      durationMinutes: durationMinutes(item.startsAt, item.endsAt),
    } satisfies CalendarDragData,
  });

  const start = new Date(segment.startsAt);
  const mins = minutesSinceDayStart(start, gridStartHour);
  const top = (mins / 60) * PLANNING_HOUR_HEIGHT;
  const height = (segmentDur / 60) * PLANNING_HOUR_HEIGHT;
  const color = planningColorForItem(item);
  const widthPct = 100 / segment.columnCount;
  const leftPct = segment.columnIndex * widthPct;
  const resizeRef = useRef<{ startY: number; startEnd: number } | null>(null);

  function onResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (segment.segmentCount > 1) return;
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
      maxEnd.setHours(gridEndHour, 0, 0, 0);
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
        "absolute z-10 touch-manipulation px-0.5",
        isDragging && "opacity-30",
      )}
      style={{
        top: Math.max(0, top),
        height: Math.max(32, height - 2),
        left: `${leftPct}%`,
        width: `calc(${widthPct}% - 2px)`,
      }}
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
          segment.isContinuation && "border-dashed",
        )}
      >
        <p className="truncate text-[10px] font-medium opacity-80">
          {formatTimeRange(segment.startsAt, segmentEnd, locale)}
        </p>
        {segment.segmentCount > 1 ? (
          <p className="truncate text-[9px] opacity-70">
            {segment.segmentIndex + 1}/{segment.segmentCount}
          </p>
        ) : null}
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
        {segment.segmentCount === 1 ? (
          <div
            role="separator"
            aria-orientation="horizontal"
            onPointerDown={onResizePointerDown}
            className="absolute right-0 bottom-0 left-0 h-3 cursor-ns-resize touch-manipulation opacity-0 transition-opacity group-hover:opacity-100"
          />
        ) : null}
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
