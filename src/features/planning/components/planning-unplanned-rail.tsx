"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";

import { formatEstimatedHours } from "@/features/projects/lib/work-item";
import {
  planningColorForKey,
  type UnplannedWorkItem,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type UnplannedWorkItemCardProps = {
  item: UnplannedWorkItem;
  isDragging?: boolean;
};

export function UnplannedWorkItemCard({ item, isDragging }: UnplannedWorkItemCardProps) {
  const color = planningColorForKey(item.projectId);

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-left transition-opacity",
        color.bg,
        color.border,
        color.text,
        isDragging && "opacity-40",
      )}
    >
      <p className="truncate text-sm font-medium">{item.title}</p>
      <p className="truncate text-[11px] opacity-80">
        {item.projectName}
        {item.assigneeName ? ` · ${item.assigneeName}` : ""}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-[11px] opacity-70">
          {formatEstimatedHours(item.estimatedMinutes)}
        </span>
        {item.assigneeName ? (
          <span className="bg-background/70 flex size-5 items-center justify-center rounded-full text-[9px] font-medium">
            {initials(item.assigneeName)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type DraggableUnplannedItemProps = {
  item: UnplannedWorkItem;
};

export function DraggableUnplannedItem({ item }: DraggableUnplannedItemProps) {
  const t = useTranslations("planning");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `unplanned:${item.id}`,
    data: {
      kind: "unplanned" as const,
      item,
      durationMinutes: Math.max(
        30,
        item.estimatedMinutes && item.estimatedMinutes > 0
          ? Math.round(item.estimatedMinutes / 15) * 15
          : 120,
      ),
    },
  });

  return (
    <li ref={setNodeRef} className="touch-manipulation">
      <div
        {...listeners}
        {...attributes}
        className="group cursor-grab active:cursor-grabbing"
        aria-label={t("dragToSchedule", { title: item.title })}
      >
        <div className="relative">
          <UnplannedWorkItemCard item={item} isDragging={isDragging} />
          <GripVertical className="text-muted-foreground/60 pointer-events-none absolute top-2 right-1.5 size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </li>
  );
}

type PlanningUnplannedRailProps = {
  items: UnplannedWorkItem[];
  query: string;
  onQueryChange: (value: string) => void;
};

export function PlanningUnplannedRail({
  items,
  query,
  onQueryChange,
}: PlanningUnplannedRailProps) {
  const t = useTranslations("planning");

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-muted/20 xl:w-60">
      <div className="space-y-2 border-b border-border px-3 py-2.5">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("unplanned")}
        </h3>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("unplannedSearchPlaceholder")}
          className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs outline-none"
        />
      </div>
      <ul className="max-h-[40rem] space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <li className="px-1 py-6 text-center text-xs text-muted-foreground">
            {query.trim() ? t("unplannedNoResults") : t("unplannedEmpty")}
          </li>
        ) : (
          items.map((item) => <DraggableUnplannedItem key={item.id} item={item} />)
        )}
      </ul>
    </aside>
  );
}

export { UnplannedWorkItemCard as UnplannedDragOverlayCard };
