"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  ExternalLink,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageCard } from "@/features/shell/components/page-card";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  workOrderStats,
  type WorkOrderProjectOption,
  type WorkOrderRow,
} from "@/features/work-orders/lib/work-order";
import { formatEstimatedHours } from "@/features/projects/lib/work-item";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { WorkOrderPriority, WorkOrderStatus } from "@/types/database";

type TabId = "overview" | "kanban" | "planning" | "mine";

type WorkOrdersWorkspaceProps = {
  workOrders: WorkOrderRow[];
  projects: WorkOrderProjectOption[];
  staff: StaffOption[];
  currentUserId?: string | null;
};

const PAGE_SIZES = [8, 16, 32] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusVariant(
  status: WorkOrderStatus,
): "default" | "secondary" | "success" | "outline" {
  if (status === "in_progress") return "default";
  if (status === "done") return "success";
  if (status === "cancelled") return "outline";
  return "secondary";
}

function PriorityIcon({ priority }: { priority: WorkOrderPriority }) {
  if (priority === "high") return <ArrowUp className="size-3.5 text-destructive" />;
  if (priority === "low") return <ArrowDown className="size-3.5 text-emerald-600" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

export function WorkOrdersWorkspace({
  workOrders,
  projects,
  staff,
  currentUserId,
}: WorkOrdersWorkspaceProps) {
  const t = useTranslations("workOrders");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const order of workOrders) {
      if (order.workType?.trim()) set.add(order.workType.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, locale));
  }, [workOrders, locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workOrders.filter((order) => {
      if (tab === "mine" && currentUserId && order.assigneeUserId !== currentUserId) {
        return false;
      }
      if (projectFilter !== "all" && order.projectId !== projectFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (typeFilter !== "all" && (order.workType ?? "") !== typeFilter) return false;
      if (assigneeFilter !== "all" && order.assigneeUserId !== assigneeFilter) return false;
      if (!q) return true;
      return (
        order.title.toLowerCase().includes(q) ||
        order.workOrderNumber.toLowerCase().includes(q) ||
        order.projectName.toLowerCase().includes(q) ||
        (order.workType ?? "").toLowerCase().includes(q) ||
        (order.assigneeName ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    workOrders,
    tab,
    currentUserId,
    query,
    projectFilter,
    statusFilter,
    typeFilter,
    assigneeFilter,
  ]);

  const stats = useMemo(() => workOrderStats(workOrders), [workOrders]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selected = workOrders.find((order) => order.id === selectedId) ?? null;

  function formatPlan(iso: string | null) {
    if (!iso) return "—";
    try {
      const date = new Date(iso);
      const today = new Date();
      if (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      ) {
        return t("planningToday", {
          time: new Intl.DateTimeFormat(locale, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(date),
        });
      }
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return iso;
    }
  }

  function refresh() {
    router.refresh();
  }

  function toggleChecklist(orderId: string, itemId: string, done: boolean) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/work-orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: orderId,
            checklistItemId: itemId,
            checklistDone: done,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        refresh();
      })();
    });
  }

  function cycleStatus(order: WorkOrderRow) {
    const idx = WORK_ORDER_STATUSES.indexOf(order.status);
    const next = WORK_ORDER_STATUSES[(idx + 1) % WORK_ORDER_STATUSES.length]!;
    startTransition(() => {
      void (async () => {
        await fetch("/api/work-orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: order.id, status: next }),
          signal: AbortSignal.timeout(20_000),
        });
        refresh();
      })();
    });
  }

  const kpiCards = [
    { key: "total", value: stats.total, hint: t("kpi.totalHint"), icon: ClipboardList, tone: "text-muted-foreground" },
    { key: "open", value: stats.open, hint: t("kpi.openHint"), icon: CircleDashed, tone: "text-amber-600" },
    { key: "planned", value: stats.planned, hint: t("kpi.plannedHint"), icon: ClipboardList, tone: "text-violet-600" },
    { key: "inProgress", value: stats.inProgress, hint: t("kpi.inProgressHint"), icon: ClipboardList, tone: "text-primary" },
    { key: "done", value: stats.done, hint: t("kpi.doneHint"), icon: CheckCircle2, tone: "text-emerald-600" },
    { key: "cancelled", value: stats.cancelled, hint: t("kpi.cancelledHint"), icon: X, tone: "text-muted-foreground" },
  ] as const;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            {t("export")}
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            {t("newWorkOrder")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <PageCard key={card.key} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t(`kpi.${card.key}`)}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{card.hint}</p>
              </div>
              <card.icon className={cn("size-4", card.tone)} />
            </div>
          </PageCard>
        ))}
      </div>

      <div className="overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-1">
          {(["overview", "kanban", "planning", "mine"] as TabId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
              className={cn(
                "px-3 py-2.5 text-sm transition-colors",
                tab === id
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {tab === "kanban" || tab === "planning" ? (
        <PageCard className="p-8 text-center">
          <h3 className="text-sm font-medium">{t(`tabs.${tab}`)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("tabComingSoon")}</p>
          <Button type="button" size="sm" className="mt-4" onClick={() => setTab("overview")}>
            {t("backToOverview")}
          </Button>
        </PageCard>
      ) : (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <PageCard className="p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t("searchPlaceholder")}
                    className="border-input bg-background h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none"
                  />
                </div>
                <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
                  <option value="all">{t("filters.allProjects")}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
                  <option value="all">{t("filters.allStatuses")}</option>
                  {WORK_ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>{t(`status.${status}`)}</option>
                  ))}
                </select>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
                  <option value="all">{t("filters.allTypes")}</option>
                  {types.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
                  <option value="all">{t("filters.allAssignees")}</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </PageCard>

            <PageCard className="overflow-hidden p-0">
              {pageItems.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[64rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        <th className="px-4 py-3">{t("columns.workOrder")}</th>
                        <th className="px-4 py-3">{t("columns.project")}</th>
                        <th className="px-4 py-3">{t("columns.type")}</th>
                        <th className="px-4 py-3">{t("columns.assignee")}</th>
                        <th className="px-4 py-3">{t("columns.planning")}</th>
                        <th className="px-4 py-3">{t("columns.status")}</th>
                        <th className="px-4 py-3">{t("columns.priority")}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((order) => (
                        <tr
                          key={order.id}
                          className={cn(
                            "cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/30",
                            selectedId === order.id && "bg-primary/5",
                          )}
                          onClick={() => setSelectedId(order.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-primary">{order.workOrderNumber}</p>
                            <p className="text-muted-foreground">{order.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{order.projectName}</p>
                            <p className="text-xs text-muted-foreground">{order.projectAddress || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            {order.workType ? (
                              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                                {order.workType}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {order.assigneeName ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="bg-muted flex size-7 items-center justify-center rounded-full text-[10px] font-medium">
                                  {initials(order.assigneeName)}
                                </span>
                                {order.assigneeName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatPlan(order.plannedStart)}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                cycleStatus(order);
                              }}
                            >
                              <Badge variant={statusVariant(order.status)}>
                                {t(`status.${order.status}`)}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <PriorityIcon priority={order.priority} />
                              {t(`priority.${order.priority}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label={t("rowMenu")}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <p>
                  {t("pagination.range", {
                    from: filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
                    to: Math.min(currentPage * pageSize, filtered.length),
                    total: filtered.length,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                      setPage(1);
                    }}
                    className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {t("pagination.perPage", { count: size })}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                    {t("pagination.prev")}
                  </Button>
                  <span className="tabular-nums">{currentPage}/{pageCount}</span>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount} onClick={() => setPage((p) => p + 1)}>
                    {t("pagination.next")}
                  </Button>
                </div>
              </div>
            </PageCard>
          </div>

          {selected ? (
            <WorkOrderDetailSheet
              order={selected}
              open={Boolean(selected)}
              onOpenChange={(open) => {
                if (!open) setSelectedId(null);
              }}
              onToggleChecklist={toggleChecklist}
              disabled={isPending}
              formatPlan={formatPlan}
            />
          ) : null}
        </div>
      )}

      <CreateWorkOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        staff={staff}
        onCreated={() => {
          setCreateOpen(false);
          refresh();
        }}
        onError={setError}
      />
    </div>
  );
}

function WorkOrderDetailSheet({
  order,
  open,
  onOpenChange,
  onToggleChecklist,
  disabled,
  formatPlan,
}: {
  order: WorkOrderRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleChecklist: (orderId: string, itemId: string, done: boolean) => void;
  disabled?: boolean;
  formatPlan: (iso: string | null) => string;
}) {
  const t = useTranslations("workOrders");
  const tCommon = useTranslations("common");
  const doneCount = order.checklist.filter((item) => item.done).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full w-[min(100%,28rem)] gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,28rem)] data-[side=right]:sm:max-w-[28rem]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3">
          <SheetTitle className="text-sm font-medium">
            {t("detailTitle", { number: order.workOrderNumber })}
          </SheetTitle>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label={tCommon("close")}>
            <X className="size-4" />
          </Button>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(order.status)}>{t(`status.${order.status}`)}</Badge>
            <span className="text-sm text-muted-foreground">{formatPlan(order.plannedStart)}</span>
          </div>

          <div>
            <Link
              href={`/projecten/${order.projectId}`}
              className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
            >
              {order.projectName}
              <ExternalLink className="size-3.5" />
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{order.projectAddress || "—"}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium">{t("detail.description")}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {order.description?.trim() || t("detail.descriptionEmpty")}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.type")}</dt>
              <dd>{order.workType || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.assignee")}</dt>
              <dd>{order.assigneeName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("detail.start")}</dt>
              <dd>{formatPlan(order.plannedStart)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("detail.duration")}</dt>
              <dd>{formatEstimatedHours(order.estimatedMinutes)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.priority")}</dt>
              <dd className="inline-flex items-center gap-1.5">
                <PriorityIcon priority={order.priority} />
                {t(`priority.${order.priority}`)}
              </dd>
            </div>
          </dl>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{t("detail.subtasks")}</h3>
              <span className="text-xs text-muted-foreground">
                {doneCount} / {order.checklist.length}
              </span>
            </div>
            {order.checklist.length > 0 ? (
              <div className="bg-muted mb-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{
                    width: `${order.checklist.length ? (doneCount / order.checklist.length) * 100 : 0}%`,
                  }}
                />
              </div>
            ) : null}
            {order.checklist.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("detail.subtasksEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {order.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleChecklist(order.id, item.id, !item.done)}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        item.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {item.done ? <Check className="size-3" /> : null}
                    </button>
                    <span className={cn("text-sm", item.done && "text-muted-foreground line-through")}>
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium">{t("detail.attachments")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("detail.attachmentsSoon")}</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" className="flex-1" disabled>
            {t("detail.openFull")}
          </Button>
          <Button type="button" variant="outline" size="icon-sm" disabled aria-label={t("rowMenu")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateWorkOrderDialog({
  open,
  onOpenChange,
  projects,
  staff,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: WorkOrderProjectOption[];
  staff: StaffOption[];
  onCreated: () => void;
  onError: (message: string | null) => void;
}) {
  const t = useTranslations("workOrders");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workType, setWorkType] = useState("");
  const [priority, setPriority] = useState<WorkOrderPriority>("normal");
  const [status, setStatus] = useState<WorkOrderStatus>("open");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [description, setDescription] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !projectId) {
      onError(t("form.required"));
      return;
    }
    onError(null);
    startTransition(() => {
      void (async () => {
        try {
          const checklist = checklistText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const res = await fetch("/api/work-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              projectId,
              workType: workType || null,
              priority,
              status,
              assigneeUserId: assigneeUserId || null,
              description: description || null,
              plannedStart: plannedStart
                ? new Date(plannedStart).toISOString()
                : null,
              estimatedMinutes:
                estimatedHours === "" ? null : Math.round(Number(estimatedHours) * 60),
              checklist,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await res.json()) as { error?: string };
          if (!res.ok || result.error) {
            onError(result.error || tCommon("error"));
            return;
          }
          setTitle("");
          setProjectId("");
          setWorkType("");
          setPriority("normal");
          setStatus("open");
          setAssigneeUserId("");
          setDescription("");
          setPlannedStart("");
          setEstimatedHours("");
          setChecklistText("");
          onCreated();
        } catch {
          onError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("form.createTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("form.title")}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5" required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("form.project")}</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5" required>
              <option value="">{t("form.selectProject")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("columns.type")}</span>
              <input value={workType} onChange={(e) => setWorkType(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5" placeholder={t("form.typePlaceholder")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("columns.assignee")}</span>
              <select value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5">
                <option value="">{t("form.unassigned")}</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("columns.status")}</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as WorkOrderStatus)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5">
                {WORK_ORDER_STATUSES.map((entry) => (
                  <option key={entry} value={entry}>{t(`status.${entry}`)}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("columns.priority")}</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as WorkOrderPriority)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5">
                {WORK_ORDER_PRIORITIES.map((entry) => (
                  <option key={entry} value={entry}>{t(`priority.${entry}`)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("detail.start")}</span>
              <input type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("detail.duration")}</span>
              <input type="number" min={0} step={0.5} value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} disabled={isPending} className="border-input bg-background h-9 w-full rounded-lg border px-2.5" placeholder="6" />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("detail.description")}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} rows={3} className="border-input bg-background w-full rounded-lg border px-2.5 py-2" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("form.checklist")}</span>
            <textarea value={checklistText} onChange={(e) => setChecklistText(e.target.value)} disabled={isPending} rows={3} className="border-input bg-background w-full rounded-lg border px-2.5 py-2" placeholder={t("form.checklistPlaceholder")} />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => onOpenChange(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
