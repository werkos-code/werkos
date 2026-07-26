"use client";

import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function formatPlan(start: string | null, end: string | null) {
  const fmt = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${iso}T12:00:00`));
    } catch {
      return iso;
    }
  };
  if (start && end && start !== end) return `${fmt(start)} – ${fmt(end)}`;
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

function CategoryDonut({
  slices,
}: {
  slices: Array<{ name: string; count: number; color: string }>;
}) {
  const total = slices.reduce((sum, s) => sum + s.count, 0) || 1;
  let cursor = 0;
  const gradient = slices
    .map((slice) => {
      const start = (cursor / total) * 100;
      cursor += slice.count;
      const end = (cursor / total) * 100;
      return `${slice.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div
      className="mx-auto size-28 rounded-full"
      style={{
        background:
          slices.length === 0
            ? "color-mix(in oklab, var(--muted) 80%, transparent)"
            : `conic-gradient(${gradient})`,
      }}
    >
      <div className="absolute" />
    </div>
  );
}

const CATEGORY_COLORS = [
  "var(--primary)",
  "#64748b",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#db2777",
];

export function ProjectWorkItemsWorkspace({
  projectId,
  workItems,
  staff,
}: ProjectWorkItemsWorkspaceProps) {
  const t = useTranslations("projects.workItems");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => workItemStats(workItems), [workItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of workItems) {
      if (item.category) set.add(item.category);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
  }, [workItems]);

  const categorySlices = useMemo(() => {
    const leaves = workItems.filter(
      (item) => !workItems.some((other) => other.parentId === item.id),
    );
    const counts = new Map<string, number>();
    for (const item of leaves) {
      const key = item.category?.trim() || t("uncategorized");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count], index) => ({
      name,
      count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]!,
      percent: leaves.length
        ? Math.round((count / leaves.length) * 100)
        : 0,
    }));
  }, [workItems, t]);

  const groups = useMemo(() => {
    const parents = workItems.filter((item) => item.parentId == null);
    const childrenByParent = new Map<string, WorkItemRow[]>();
    for (const item of workItems) {
      if (!item.parentId) continue;
      const list = childrenByParent.get(item.parentId) ?? [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    }

    const q = query.trim().toLowerCase();
    function matches(item: WorkItemRow) {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (assigneeFilter !== "all" && item.assigneeUserId !== assigneeFilter)
        return false;
      if (categoryFilter !== "all" && (item.category ?? "") !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
      );
    }

    const result: Array<{
      group: WorkItemRow | null;
      children: WorkItemRow[];
    }> = [];

    for (const parent of parents) {
      const kids = childrenByParent.get(parent.id) ?? [];
      if (kids.length > 0) {
        const filteredKids = kids.filter(matches);
        if (
          filteredKids.length > 0 ||
          (!q && statusFilter === "all" && assigneeFilter === "all" && categoryFilter === "all")
        ) {
          result.push({
            group: parent,
            children:
              q || statusFilter !== "all" || assigneeFilter !== "all" || categoryFilter !== "all"
                ? filteredKids
                : kids,
          });
        }
      } else if (matches(parent)) {
        // leaf at root → collect later
      }
    }

    const rootLeaves = parents.filter(
      (p) => (childrenByParent.get(p.id) ?? []).length === 0 && matches(p),
    );
    if (rootLeaves.length > 0) {
      result.unshift({ group: null, children: rootLeaves });
    }

    return result;
  }, [workItems, query, statusFilter, assigneeFilter, categoryFilter]);

  const selectedItem =
    workItems.find((item) => item.id === selectedId) ?? null;

  function refresh() {
    router.refresh();
  }

  function openItem(item: WorkItemRow) {
    setSelectedId(item.id);
    setSheetOpen(true);
  }

  function createItem(input?: { parentId?: string | null; asGroup?: boolean }) {
    const title = window.prompt(
      input?.asGroup ? t("promptGroup") : t("promptItem"),
    );
    if (!title?.trim()) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/work-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              title: title.trim(),
              parentId: input?.parentId ?? null,
              asGroup: Boolean(input?.asGroup),
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          if (input?.parentId) {
            setExpanded((prev) => ({ ...prev, [input.parentId!]: true }));
          }
          refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function cycleStatus(item: WorkItemRow) {
    const next: WorkItemStatus =
      item.status === "open"
        ? "in_progress"
        : item.status === "in_progress"
          ? "done"
          : "open";
    startTransition(() => {
      void (async () => {
        await fetch("/api/work-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: next }),
          signal: AbortSignal.timeout(20_000),
        });
        refresh();
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
        refresh();
      })();
    });
  }

  function isGroupExpanded(groupId: string) {
    return expanded[groupId] ?? true;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {(
            [
              { id: "list" as const, icon: List, label: t("views.list") },
              { id: "tree" as const, icon: Network, label: t("views.tree") },
              { id: "kanban" as const, icon: LayoutGrid, label: t("views.kanban") },
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

        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => createItem({ asGroup: true })}
          >
            {t("addGroup")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => createItem()}
          >
            <Plus className="size-3.5" />
            {t("add")}
          </Button>
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <PageCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <th className="w-10 px-3 py-2.5" />
                    <th className="px-3 py-2.5">{t("columns.title")}</th>
                    <th className="px-3 py-2.5">{t("columns.category")}</th>
                    <th className="px-3 py-2.5">{t("columns.assignee")}</th>
                    <th className="px-3 py-2.5">{t("columns.status")}</th>
                    <th className="px-3 py-2.5">{t("columns.planning")}</th>
                    <th className="px-3 py-2.5 text-right">
                      {t("columns.hours")}
                    </th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {t("empty")}
                      </td>
                    </tr>
                  ) : (
                    groups.map(({ group, children }) => {
                      const groupKey = group?.id ?? "root";
                      const open = group ? isGroupExpanded(group.id) : true;
                      const doneCount = children.filter(
                        (c) => c.status === "done",
                      ).length;
                      const progress =
                        children.length === 0
                          ? 0
                          : Math.round((doneCount / children.length) * 100);

                      return (
                        <GroupRows
                          key={groupKey}
                          group={group}
                          childrenItems={children}
                          open={open}
                          progress={progress}
                          doneCount={doneCount}
                          disabled={isPending}
                          onToggle={() =>
                            group &&
                            setExpanded((prev) => ({
                              ...prev,
                              [group.id]: !isGroupExpanded(group.id),
                            }))
                          }
                          onOpen={openItem}
                          onCycleStatus={cycleStatus}
                          onDelete={deleteItem}
                          onAddChild={() =>
                            createItem({ parentId: group?.id ?? null })
                          }
                          t={(key, values) =>
                            t(key as Parameters<typeof t>[0], values)
                          }
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                {t("footer.count", { count: stats.total })}
              </span>
              <span>
                {t("footer.hours", {
                  hours: formatEstimatedHours(stats.estimatedMinutes),
                })}
              </span>
            </div>
          </PageCard>

          <div className="space-y-4">
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
                  <div className="relative mx-auto mb-4 w-fit">
                    <CategoryDonut slices={categorySlices} />
                  </div>
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
          </div>
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

function GroupRows({
  group,
  childrenItems,
  open,
  progress,
  doneCount,
  disabled,
  onToggle,
  onOpen,
  onCycleStatus,
  onDelete,
  onAddChild,
  t,
}: {
  group: WorkItemRow | null;
  childrenItems: WorkItemRow[];
  open: boolean;
  progress: number;
  doneCount: number;
  disabled: boolean;
  onToggle: () => void;
  onOpen: (item: WorkItemRow) => void;
  onCycleStatus: (item: WorkItemRow) => void;
  onDelete: (item: WorkItemRow) => void;
  onAddChild: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <>
      {group ? (
        <tr className="border-b border-border/80 bg-muted/20">
          <td className="px-3 py-2.5">
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
          </td>
          <td className="px-3 py-2.5" colSpan={2}>
            <button
              type="button"
              className="text-left font-medium hover:text-primary"
              onClick={() => onOpen(group)}
            >
              {group.title}
            </button>
            <p className="text-xs text-muted-foreground">
              {t("groupCount", { count: childrenItems.length })}
            </p>
          </td>
          <td className="px-3 py-2.5" colSpan={3}>
            <div className="flex items-center gap-3">
              <div className="bg-muted h-1.5 w-32 rounded-full">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {doneCount}/{childrenItems.length}
              </span>
            </div>
          </td>
          <td className="px-3 py-2.5" />
        </tr>
      ) : null}

      {open
        ? childrenItems.map((item) => {
            const overdue = isWorkItemOverdue(item);
            return (
              <tr
                key={item.id}
                className="border-b border-border/70 last:border-0 hover:bg-muted/30"
              >
                <td className="px-3 py-2.5">
                  <input type="checkbox" aria-label={item.title} disabled />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onOpen(item)}
                  >
                    <span className="font-medium hover:text-primary">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {item.category || "—"}
                </td>
                <td className="px-3 py-2.5">
                  {item.assigneeName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-muted flex size-6 items-center justify-center rounded-full">
                        <UserRound className="size-3.5 text-muted-foreground" />
                      </span>
                      {item.assigneeName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onCycleStatus(item)}
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
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {formatPlan(item.plannedStart, item.plannedEnd)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatEstimatedHours(item.estimatedMinutes)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    onClick={() => onDelete(item)}
                    aria-label={t("rowMenu")}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })
        : null}

      {group && open ? (
        <tr className="border-b border-border/70">
          <td />
          <td className="px-3 py-2" colSpan={7}>
            <button
              type="button"
              disabled={disabled}
              onClick={onAddChild}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              {t("addInGroup")}
            </button>
          </td>
        </tr>
      ) : null}
    </>
  );
}
