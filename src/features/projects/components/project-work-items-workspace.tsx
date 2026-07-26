"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  LayoutGrid,
  List,
  Network,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WorkItemDetailSheet } from "@/features/projects/components/work-item-detail-sheet";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  formatEstimatedHours,
  isWorkItemOverdue,
  workItemStats,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { PageCard } from "@/features/shell/components/page-card";
import { useRouter } from "@/i18n/navigation";
import type { WorkItemStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "tree" | "kanban";

type ProjectWorkItemsWorkspaceProps = {
  projectId: string;
  workItems: WorkItemRow[];
  staff: StaffOption[];
};

type ContainerId = "root" | `group:${string}`;

function formatPlan(start: string | null, end: string | null) {
  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "short",
      }).format(new Date(`${iso}T12:00:00`));
    } catch {
      return iso;
    }
  };
  if (start && end && start !== end) return `${fmt(start)}–${fmt(end)}`;
  if (end) return fmt(end);
  if (start) return fmt(start);
  return "—";
}

function statusVariant(
  status: WorkItemStatus,
): "success" | "default" | "secondary" {
  if (status === "done") return "success";
  if (status === "in_progress") return "default";
  return "secondary";
}

const CATEGORY_COLORS = [
  "var(--primary)",
  "#64748b",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#db2777",
];

function applySortOrders(items: WorkItemRow[]): WorkItemRow[] {
  const byParent = new Map<string | null, WorkItemRow[]>();
  for (const item of items) {
    const key = item.parentId;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }
  const next = [...items];
  for (const [, list] of byParent) {
    list
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((item, index) => {
        const row = next.find((candidate) => candidate.id === item.id);
        if (row) row.sortOrder = index;
      });
  }
  return next;
}

export function ProjectWorkItemsWorkspace({
  projectId,
  workItems,
  staff,
}: ProjectWorkItemsWorkspaceProps) {
  const t = useTranslations("projects.workItems");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [items, setItems] = useState(workItems);
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inlineParent, setInlineParent] = useState<string | null | undefined>(
    undefined,
  );
  const [inlineKind, setInlineKind] = useState<"item" | "group">("item");
  const [inlineTitle, setInlineTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(workItems);
  }, [workItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const stats = useMemo(() => workItemStats(items), [items]);
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
  }, [items]);

  const categorySlices = useMemo(() => {
    const leaves = items.filter((item) => !item.isGroup);
    const counts = new Map<string, number>();
    for (const item of leaves) {
      const key = item.category?.trim() || t("uncategorized");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count], index) => ({
      name,
      count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]!,
      percent: leaves.length ? Math.round((count / leaves.length) * 100) : 0,
    }));
  }, [items, t]);

  const groups = useMemo(
    () =>
      items
        .filter((item) => item.isGroup && item.parentId == null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  const rootLeaves = useMemo(
    () =>
      items
        .filter((item) => !item.isGroup && item.parentId == null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [items],
  );

  function childrenOf(groupId: string) {
    return items
      .filter((item) => !item.isGroup && item.parentId === groupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function matches(item: WorkItemRow) {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (assigneeFilter !== "all" && item.assigneeUserId !== assigneeFilter)
      return false;
    if (categoryFilter !== "all" && (item.category ?? "") !== categoryFilter)
      return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.description ?? "").toLowerCase().includes(q) ||
      (item.category ?? "").toLowerCase().includes(q)
    );
  }

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  function persistReorder(nextItems: WorkItemRow[]) {
    const payload = nextItems.map((item) => ({
      id: item.id,
      parentId: item.parentId,
      sortOrder: item.sortOrder,
    }));
    startTransition(() => {
      void (async () => {
        try {
          await fetch("/api/work-items/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, items: payload }),
            signal: AbortSignal.timeout(20_000),
          });
          router.refresh();
        } catch {
          setError(tCommon("error"));
          setItems(workItems);
        }
      })();
    });
  }

  function createItem(input: {
    title: string;
    parentId?: string | null;
    asGroup?: boolean;
  }) {
    const title = input.title.trim();
    if (!title) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/work-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              title,
              parentId: input.parentId ?? null,
              asGroup: Boolean(input.asGroup),
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setInlineTitle("");
          setInlineParent(undefined);
          setInlineKind("item");
          if (input.parentId) {
            setExpanded((prev) => ({ ...prev, [input.parentId!]: true }));
          }
          router.refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function deleteItem(item: WorkItemRow) {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(() => {
      void (async () => {
        await fetch("/api/work-items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
          signal: AbortSignal.timeout(20_000),
        });
        router.refresh();
      })();
    });
  }

  function cycleStatus(item: WorkItemRow) {
    if (item.isGroup) return;
    const next: WorkItemStatus =
      item.status === "open"
        ? "in_progress"
        : item.status === "in_progress"
          ? "done"
          : "open";
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status: next } : row)),
    );
    startTransition(() => {
      void (async () => {
        await fetch("/api/work-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: next }),
          signal: AbortSignal.timeout(20_000),
        });
        router.refresh();
      })();
    });
  }

  function findContainer(id: string): ContainerId | null {
    if (id === "root" || id.startsWith("group:")) return id as ContainerId;
    const item = items.find((row) => row.id === id);
    if (!item) return null;
    if (item.isGroup) return "root";
    if (item.parentId) return `group:${item.parentId}`;
    return "root";
  }

  function idsInContainer(container: ContainerId): string[] {
    if (container === "root") {
      return [
        ...groups.map((g) => g.id),
        ...rootLeaves.map((l) => l.id),
      ];
    }
    const groupId = container.slice("group:".length);
    return childrenOf(groupId).map((c) => c.id);
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeItemId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeItemId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    const moving = items.find((item) => item.id === activeItemId);
    if (!moving || moving.isGroup) return;

    const nextParent =
      overContainer === "root" ? null : overContainer.slice("group:".length);

    setItems((prev) => {
      const without = prev.map((item) =>
        item.id === activeItemId
          ? { ...item, parentId: nextParent }
          : item,
      );
      return applySortOrders(without);
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(overId) ?? findContainer(activeItemId);
    if (!container) return;

    const ids = idsInContainer(container);
    const oldIndex = ids.indexOf(activeItemId);
    let newIndex = ids.indexOf(overId);
    if (overId.startsWith("group:") || overId === "root") {
      newIndex = ids.length - 1;
    }
    if (oldIndex < 0 || newIndex < 0) {
      persistReorder(items);
      return;
    }

    const reorderedIds = arrayMove(ids, oldIndex, newIndex);
    const nextParent =
      container === "root" ? null : container.slice("group:".length);

    const next = items.map((item) => {
      const index = reorderedIds.indexOf(item.id);
      if (index === -1) {
        if (item.id === activeItemId) {
          return { ...item, parentId: nextParent };
        }
        return item;
      }
      return {
        ...item,
        parentId: item.isGroup ? null : nextParent ?? item.parentId,
        sortOrder: index,
      };
    });

    const normalized = applySortOrders(next);
    setItems(normalized);
    persistReorder(normalized);
  }

  const rootSortableIds = [
    ...groups.map((g) => g.id),
    ...rootLeaves.filter(matches).map((l) => l.id),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(
            [
              { id: "list" as const, icon: List, label: t("views.list") },
              { id: "tree" as const, icon: Network, label: t("views.tree") },
              {
                id: "kanban" as const,
                icon: LayoutGrid,
                label: t("views.kanban"),
              },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                view === item.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 pl-8"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
        >
          <option value="all">{t("filters.statusAll")}</option>
          <option value="open">{t("status.open")}</option>
          <option value="in_progress">{t("status.in_progress")}</option>
          <option value="done">{t("status.done")}</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
        >
          <option value="all">{t("filters.assigneeAll")}</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
        >
          <option value="all">{t("filters.categoryAll")}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" variant="outline" disabled>
          {t("filters.more")}
        </Button>

        <div className="ml-auto flex">
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            className="rounded-r-none"
            onClick={() => {
              setInlineKind("item");
              setInlineParent(null);
              setInlineTitle("");
            }}
          >
            <Plus className="size-3.5" />
            {t("add")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
                aria-label={t("addMenu")}
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                onClick={() => {
                  setInlineKind("item");
                  setInlineParent(null);
                  setInlineTitle("");
                }}
              >
                {t("addItem")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setInlineKind("group");
                  setInlineParent(null);
                  setInlineTitle("");
                }}
              >
                {t("addGroup")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {view !== "list" ? (
        <PageCard className="p-8">
          <p className="text-sm text-muted-foreground">
            {view === "tree" ? t("views.treeSoon") : t("views.kanbanSoon")}
          </p>
        </PageCard>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <PageCard className="overflow-hidden p-0">
            <div className="text-muted-foreground grid grid-cols-[1.5rem_1.5rem_minmax(10rem,1.6fr)_7rem_8rem_7rem_7rem_4rem_2rem] items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium tracking-wide uppercase max-xl:hidden">
              <span />
              <span />
              <span>{t("columns.title")}</span>
              <span>{t("columns.category")}</span>
              <span>{t("columns.assignee")}</span>
              <span>{t("columns.status")}</span>
              <span>{t("columns.planning")}</span>
              <span className="text-right">{t("columns.hours")}</span>
              <span />
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <RootDropZone>
                <SortableContext
                  items={rootSortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-border/70">
                    {groups.length === 0 &&
                    rootLeaves.length === 0 &&
                    inlineParent === undefined ? (
                      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {t("empty")}
                      </div>
                    ) : null}

                    {groups.map((group, index) => {
                      const kids = childrenOf(group.id).filter(matches);
                      const allKids = childrenOf(group.id);
                      const open = expanded[group.id] ?? true;
                      const doneCount = allKids.filter(
                        (c) => c.status === "done",
                      ).length;
                      const progress =
                        allKids.length === 0
                          ? 0
                          : Math.round((doneCount / allKids.length) * 100);

                      return (
                        <div key={group.id}>
                          <SortableGroupHeader
                            group={group}
                            index={index + 1}
                            open={open}
                            progress={progress}
                            doneCount={doneCount}
                            total={allKids.length}
                            disabled={isPending}
                            onToggle={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [group.id]: !open,
                              }))
                            }
                            onOpen={() => {
                              setSelectedId(group.id);
                              setSheetOpen(true);
                            }}
                            onDelete={() => deleteItem(group)}
                            t={t}
                          />
                          {open ? (
                            <GroupDropZone groupId={group.id}>
                              <SortableContext
                                items={kids.map((k) => k.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="bg-card">
                                  {kids.map((item) => (
                                    <SortableTaskRow
                                      key={item.id}
                                      item={item}
                                      disabled={isPending}
                                      onOpen={() => {
                                        setSelectedId(item.id);
                                        setSheetOpen(true);
                                      }}
                                      onCycleStatus={() => cycleStatus(item)}
                                      onDelete={() => deleteItem(item)}
                                      t={t}
                                    />
                                  ))}
                                  <InlineComposer
                                    active={inlineParent === group.id}
                                    value={inlineTitle}
                                    disabled={isPending}
                                    placeholder={t("inlinePlaceholder")}
                                    onActivate={() => {
                                      setInlineKind("item");
                                      setInlineParent(group.id);
                                      setInlineTitle("");
                                    }}
                                    onChange={setInlineTitle}
                                    onCancel={() => setInlineParent(undefined)}
                                    onSubmit={() =>
                                      createItem({
                                        title: inlineTitle,
                                        parentId: group.id,
                                      })
                                    }
                                    label={t("addInGroup")}
                                  />
                                </div>
                              </SortableContext>
                            </GroupDropZone>
                          ) : null}
                        </div>
                      );
                    })}

                    {rootLeaves.filter(matches).map((item) => (
                      <SortableTaskRow
                        key={item.id}
                        item={item}
                        disabled={isPending}
                        onOpen={() => {
                          setSelectedId(item.id);
                          setSheetOpen(true);
                        }}
                        onCycleStatus={() => cycleStatus(item)}
                        onDelete={() => deleteItem(item)}
                        t={t}
                      />
                    ))}

                    <InlineComposer
                      active={inlineParent === null}
                      value={inlineTitle}
                      disabled={isPending}
                      placeholder={
                        inlineKind === "group"
                          ? t("inlineGroupPlaceholder")
                          : t("inlinePlaceholder")
                      }
                      onActivate={() => {
                        setInlineKind("item");
                        setInlineParent(null);
                        setInlineTitle("");
                      }}
                      onChange={setInlineTitle}
                      onCancel={() => {
                        setInlineParent(undefined);
                        setInlineKind("item");
                      }}
                      onSubmit={() =>
                        createItem({
                          title: inlineTitle,
                          parentId: null,
                          asGroup: inlineKind === "group",
                        })
                      }
                      label={t("addInRoot")}
                      secondaryLabel={t("addGroupInRoot")}
                      onSecondaryActivate={() => {
                        setInlineKind("group");
                        setInlineParent(null);
                        setInlineTitle("");
                      }}
                    />
                  </div>
                </SortableContext>
              </RootDropZone>

              <DragOverlay>
                {activeItem ? (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
                    {activeItem.title}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>{t("footer.count", { count: stats.total })}</span>
              <span>
                {t("footer.hours", {
                  hours: formatEstimatedHours(stats.estimatedMinutes),
                })}
              </span>
            </div>
          </PageCard>

          <aside className="space-y-4">
            <PageCard className="p-4">
              <h3 className="mb-3 text-sm font-medium">{t("sidebar.overview")}</h3>
              <dl className="space-y-2 text-sm">
                <StatRow label={t("sidebar.total")} value={stats.total} />
                <StatRow label={t("sidebar.done")} value={stats.done} />
                <StatRow
                  label={t("sidebar.inProgress")}
                  value={stats.inProgress}
                />
                <StatRow label={t("sidebar.open")} value={stats.open} />
                <StatRow
                  label={t("sidebar.overdue")}
                  value={stats.overdue}
                  danger={stats.overdue > 0}
                />
              </dl>
            </PageCard>
            <PageCard className="p-4">
              <h3 className="mb-3 text-sm font-medium">
                {t("sidebar.categories")}
              </h3>
              {categorySlices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("sidebar.categoriesEmpty")}
                </p>
              ) : (
                <>
                  <div
                    className="mx-auto mb-4 size-28 rounded-full"
                    style={{
                      background: `conic-gradient(${categorySlices
                        .map((slice, index, all) => {
                          const total = all.reduce((s, x) => s + x.count, 0) || 1;
                          const start =
                            (all
                              .slice(0, index)
                              .reduce((s, x) => s + x.count, 0) /
                              total) *
                            100;
                          const end =
                            (all
                              .slice(0, index + 1)
                              .reduce((s, x) => s + x.count, 0) /
                              total) *
                            100;
                          return `${slice.color} ${start}% ${end}%`;
                        })
                        .join(", ")})`,
                    }}
                  />
                  <ul className="space-y-1.5 text-sm">
                    {categorySlices.map((slice) => (
                      <li
                        key={slice.name}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: slice.color }}
                          />
                          {slice.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {slice.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </PageCard>
            <PageCard className="bg-muted/30 p-4">
              <h3 className="text-sm font-medium">{t("sidebar.templatesTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("sidebar.templatesBody")}
              </p>
              <Button type="button" size="sm" className="mt-3" disabled>
                {t("sidebar.templatesCta")}
              </Button>
            </PageCard>
          </aside>
        </div>
      )}

      <WorkItemDetailSheet
        item={selectedItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function StatRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn(danger && "text-destructive")}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums font-medium",
          danger && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root" });
  return (
    <div
      ref={setNodeRef}
      className={cn(isOver && "bg-primary/5")}
    >
      {children}
    </div>
  );
}

function GroupDropZone({
  groupId,
  children,
}: {
  groupId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${groupId}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-l-2 border-transparent pl-1 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

function SortableGroupHeader({
  group,
  index,
  open,
  progress,
  doneCount,
  total,
  disabled,
  onToggle,
  onOpen,
  onDelete,
  t,
}: {
  group: WorkItemRow;
  index: number;
  open: boolean;
  progress: number;
  doneCount: number;
  total: number;
  disabled: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 bg-muted/25 px-3 py-2.5",
        isDragging && "opacity-60",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={t("dragHandle")}
      >
        <GripVertical className="size-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="text-muted-foreground"
        aria-label={open ? t("collapse") : t("expand")}
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="font-medium">
          {index}. {group.title}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          {t("groupCount", { count: total })}
        </span>
      </button>
      <div className="hidden items-center gap-2 sm:flex">
        <div className="bg-muted h-1.5 w-28 rounded-full">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onDelete}
        aria-label={t("delete")}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function SortableTaskRow({
  item,
  disabled,
  onOpen,
  onCycleStatus,
  onDelete,
  t,
}: {
  item: WorkItemRow;
  disabled: boolean;
  onOpen: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const overdue = isWorkItemOverdue(item);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group grid grid-cols-[1.5rem_1.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:grid-cols-[1.5rem_1.5rem_minmax(10rem,1.6fr)_7rem_8rem_7rem_7rem_4rem_2rem]",
        isDragging && "bg-card opacity-70 shadow-md",
        item.parentId && "sm:pl-8",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground cursor-grab touch-none opacity-60 group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={t("dragHandle")}
      >
        <GripVertical className="size-4" />
      </button>
      <input type="checkbox" aria-label={item.title} disabled className="size-3.5" />
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="inline-flex max-w-full items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium hover:text-primary">
            {item.title}
          </span>
        </span>
        {item.description ? (
          <span className="mt-0.5 block truncate pl-5 text-xs text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </button>
      <span className="hidden truncate text-sm text-muted-foreground sm:block">
        {item.category || "—"}
      </span>
      <span className="hidden sm:block">
        {item.assigneeName ? (
          <span className="inline-flex items-center gap-1.5 truncate text-sm">
            <span className="bg-muted flex size-6 items-center justify-center rounded-full">
              <UserRound className="size-3.5 text-muted-foreground" />
            </span>
            <span className="truncate">{item.assigneeName}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </span>
      <button
        type="button"
        className="hidden justify-self-start sm:inline-flex"
        disabled={disabled}
        onClick={onCycleStatus}
      >
        <Badge
          variant={
            overdue && item.status !== "done"
              ? "destructive"
              : statusVariant(item.status)
          }
        >
          {overdue && item.status !== "done"
            ? t("status.overdue")
            : t(`status.${item.status}`)}
        </Badge>
      </button>
      <span className="hidden text-sm text-muted-foreground sm:block">
        {formatPlan(item.plannedStart, item.plannedEnd)}
      </span>
      <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
        {formatEstimatedHours(item.estimatedMinutes)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        className="opacity-70 group-hover:opacity-100"
        onClick={onDelete}
        aria-label={t("delete")}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

function InlineComposer({
  active,
  value,
  disabled,
  placeholder,
  label,
  secondaryLabel,
  onActivate,
  onSecondaryActivate,
  onChange,
  onCancel,
  onSubmit,
}: {
  active: boolean;
  value: string;
  disabled: boolean;
  placeholder: string;
  label: string;
  secondaryLabel?: string;
  onActivate: () => void;
  onSecondaryActivate?: () => void;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  if (!active) {
    return (
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 pl-12">
        <button
          type="button"
          disabled={disabled}
          onClick={onActivate}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <Plus className="size-3.5" />
          {label}
        </button>
        {secondaryLabel && onSecondaryActivate ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onSecondaryActivate}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Plus className="size-3.5" />
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-primary/5 px-3 py-2 pl-12">
      <Input
        autoFocus
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="h-8"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === "Escape") onCancel();
        }}
      />
      <Button
        type="button"
        size="sm"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
      >
        <Plus className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onCancel}
      >
        Esc
      </Button>
    </div>
  );
}
