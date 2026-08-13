"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Ellipsis,
  Flag,
  Home,
  Package,
  Pencil,
  Plus,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageCard } from "@/features/shell/components/page-card";
import type { ProjectActivityRow } from "@/features/projects/projects-actions";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATUSES,
  actualMinutesForItem,
  formatEstimatedHours,
  plannedDurationDays,
  workItemProgressPercent,
  type WorkItemPriority,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { WorkItemHoursPanel } from "@/features/time/components/work-item-hours-panel";
import { WorkItemMaterialsPanel } from "@/features/materials/components/work-item-materials-panel";
import type { ArticleRow } from "@/features/materials/lib/materials";
import { cn } from "@/lib/utils";
import type { WorkItemStatus } from "@/types/database";

type DetailTab = "overview" | "planning" | "hours" | "materials";

type WorkItemDetailSheetProps = {
  item: WorkItemRow | null;
  items: WorkItemRow[];
  staff: StaffOption[];
  activities: ProjectActivityRow[];
  projectId: string;
  minutesByWorkItem?: Record<string, number>;
  articles?: ArticleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function statusVariant(
  status: WorkItemStatus,
): "success" | "default" | "secondary" {
  if (status === "done") return "success";
  if (status === "in_progress") return "default";
  return "secondary";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLongDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function formatRange(start: string | null, end: string | null, locale: string) {
  if (start && end && start !== end) {
    return `${formatLongDate(start, locale)} – ${formatLongDate(end, locale)}`;
  }
  return formatLongDate(end ?? start, locale);
}

function formatActivityWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function WorkItemDetailSheet({
  item,
  items,
  staff,
  activities,
  projectId,
  minutesByWorkItem = {},
  articles = [],
  open,
  onOpenChange,
  onChanged,
}: WorkItemDetailSheetProps) {
  const t = useTranslations("projects.workItems");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [draft, setDraft] = useState<WorkItemRow | null>(item);
  const [editingDescription, setEditingDescription] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(item);
    setEditingDescription(false);
    setError(null);
    if (item) setTab("overview");
  }, [item?.id]);

  useEffect(() => {
    if (item) setDraft(item);
  }, [item]);

  const parent = useMemo(() => {
    if (!draft?.parentId) return null;
    return items.find((row) => row.id === draft.parentId) ?? null;
  }, [draft?.parentId, items]);

  const children = useMemo(() => {
    if (!draft) return [];
    return items
      .filter((row) => row.parentId === draft.id && !row.isGroup)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [draft, items]);

  const progress = draft ? workItemProgressPercent(draft, children) : 0;
  const durationDays = draft
    ? plannedDurationDays(draft.plannedStart, draft.plannedEnd)
    : null;
  const actualMinutes = draft
    ? actualMinutesForItem(draft, items, minutesByWorkItem)
    : 0;

  const linkedActivities = useMemo(() => {
    if (!draft) return [];
    return activities.filter((event) => {
      const meta = event.metadata as { work_item_id?: string } | null;
      return meta?.work_item_id === draft.id;
    });
  }, [activities, draft]);

  const modes: Array<{ id: DetailTab; label: string; icon: LucideIcon }> = [
    { id: "overview", label: t("detail.tabs.overview"), icon: Home },
    { id: "planning", label: t("detail.tabs.planning"), icon: Calendar },
    { id: "hours", label: t("detail.tabs.hours"), icon: Clock },
    { id: "materials", label: t("detail.tabs.materials"), icon: Package },
  ];

  function patchLocal(partial: Partial<WorkItemRow>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  function persist(partial: Record<string, unknown>, local?: Partial<WorkItemRow>) {
    if (!draft) return;
    if (local) patchLocal(local);
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/work-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: draft.id, ...partial }),
            signal: AbortSignal.timeout(20_000),
          });
          if (!res.ok) {
            setError(tCommon("error"));
            return;
          }
          onChanged();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function addSubtask(event?: FormEvent) {
    event?.preventDefault();
    if (!draft) return;
    const title = subtaskTitle.trim();
    if (!title) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/work-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              title,
              parentId: draft.id,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          if (!res.ok) {
            setError(tCommon("error"));
            return;
          }
          setSubtaskTitle("");
          onChanged();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function addLabel() {
    if (!draft) return;
    const name = labelDraft.trim();
    if (!name) return;
    if (draft.labels.includes(name)) {
      setLabelDraft("");
      return;
    }
    const labels = [...draft.labels, name];
    setLabelDraft("");
    persist({ labels }, { labels });
  }

  function removeLabel(name: string) {
    if (!draft) return;
    const labels = draft.labels.filter((label) => label !== name);
    persist({ labels }, { labels });
  }

  function cycleChildStatus(child: WorkItemRow) {
    const idx = WORK_ITEM_STATUSES.indexOf(child.status);
    const next = WORK_ITEM_STATUSES[(idx + 1) % WORK_ITEM_STATUSES.length]!;
    startTransition(() => {
      void (async () => {
        try {
          await fetch("/api/work-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: child.id, status: next }),
            signal: AbortSignal.timeout(20_000),
          });
          onChanged();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function deleteItem() {
    if (!draft) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/work-items", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: draft.id }),
            signal: AbortSignal.timeout(20_000),
          });
          if (!res.ok) {
            setError(tCommon("error"));
            return;
          }
          onOpenChange(false);
          onChanged();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full w-[min(100%,70vw)] gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,70vw)] data-[side=right]:sm:max-w-[70vw]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3">
          <SheetTitle className="text-sm font-medium">
            {t("detailTitle")}
          </SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label={tCommon("close")}
          >
            <X className="size-4" />
          </Button>
        </SheetHeader>

        {!draft ? (
          <div className="p-6 text-sm text-muted-foreground">
            {t("detail.empty")}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="space-y-4 border-b border-border bg-card px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draft.title}
                      disabled={isPending}
                      onChange={(event) =>
                        patchLocal({ title: event.target.value })
                      }
                      onBlur={() => {
                        const title = draft.title.trim();
                        if (!title || title === item?.title) {
                          if (!title && item) patchLocal({ title: item.title });
                          return;
                        }
                        persist({ title });
                      }}
                      className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none sm:text-2xl"
                    />
                    <Badge variant={statusVariant(draft.status)}>
                      {t(`status.${draft.status}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {parent?.title ?? t("detail.noGroup")}
                    {" · "}
                    {formatRange(draft.plannedStart, draft.plannedEnd, locale)}
                  </p>
                  <div className="space-y-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.progress")} · {progress}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatEstimatedHours(
                        actualMinutes > 0 ? actualMinutes : draft.estimatedMinutes,
                      )}
                      {actualMinutes > 0 && draft.estimatedMinutes
                        ? ` / ${formatEstimatedHours(draft.estimatedMinutes)}`
                        : null}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {draft.assigneeName || t("detail.unassigned")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList className="size-3.5" />
                      {t("detail.subtasksTitle", { count: children.length })}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={isPending}
                      aria-label={t("rowMenu")}
                    >
                      <Ellipsis className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {WORK_ITEM_STATUSES.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => persist({ status }, { status })}
                      >
                        {t(`status.${status}`)}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={deleteItem}
                    >
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                {modes.map((entry) => {
                  const Icon = entry.icon;
                  const active = tab === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTab(entry.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border bg-card text-foreground hover:bg-muted/40",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      {entry.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <p className="border-b border-destructive/20 bg-destructive/5 px-5 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-5">
              {tab === "overview" ? (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
                  <div className="space-y-5">
                    <PageCard className="overflow-hidden p-0">
                      <div className="flex items-center justify-between gap-2 px-5 py-3">
                        <h3 className="text-sm font-medium">
                          {t("detail.description")}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={isPending}
                          onClick={() =>
                            setEditingDescription((value) => !value)
                          }
                          aria-label={t("detail.editDescription")}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                      <div className="px-5 pb-5">
                        {editingDescription ? (
                          <div className="space-y-2">
                            <textarea
                              value={draft.description ?? ""}
                              disabled={isPending}
                              rows={6}
                              onChange={(event) =>
                                patchLocal({ description: event.target.value })
                              }
                              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none"
                              placeholder={t("detail.descriptionPlaceholder")}
                            />
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() => {
                                  persist(
                                    { description: draft.description },
                                    { description: draft.description },
                                  );
                                  setEditingDescription(false);
                                }}
                              >
                                {tCommon("save")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                onClick={() => {
                                  patchLocal({
                                    description: item?.description ?? null,
                                  });
                                  setEditingDescription(false);
                                }}
                              >
                                {tCommon("cancel")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {draft.description?.trim()
                              ? draft.description
                              : t("detail.descriptionEmpty")}
                          </p>
                        )}
                      </div>
                    </PageCard>

                    <SubtasksCard
                      children={children}
                      subtaskTitle={subtaskTitle}
                      setSubtaskTitle={setSubtaskTitle}
                      onAdd={addSubtask}
                      onCycleStatus={cycleChildStatus}
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-5">
                    <PageCard className="overflow-hidden p-0">
                      <div className="px-5 py-3">
                        <h3 className="text-sm font-medium">
                          {t("detail.personnel", {
                            count: draft.assigneeUserId ? 1 : 0,
                          })}
                        </h3>
                      </div>
                      <div className="space-y-3 px-5 pb-5">
                        {draft.assigneeUserId && draft.assigneeName ? (
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {initials(draft.assigneeName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {draft.assigneeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("detail.assigneeRole")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("detail.noAssignee")}
                          </p>
                        )}
                        <select
                          value={draft.assigneeUserId ?? ""}
                          disabled={isPending}
                          onChange={(event) => {
                            const assigneeUserId =
                              event.target.value || null;
                            const member = staff.find(
                              (row) => row.id === assigneeUserId,
                            );
                            persist(
                              { assigneeUserId },
                              {
                                assigneeUserId,
                                assigneeName: member?.name ?? null,
                              },
                            );
                          }}
                          className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
                        >
                          <option value="">{t("detail.unassigned")}</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </PageCard>

                    <PageCard className="overflow-hidden p-0">
                      <div className="flex items-center justify-between gap-2 px-5 py-3">
                        <h3 className="text-sm font-medium">
                          {t("detail.planningTitle")}
                        </h3>
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => setTab("planning")}
                        >
                          {t("detail.editPlanning")}
                        </button>
                      </div>
                      <dl className="space-y-2 px-5 pb-5 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {t("detail.startDate")}
                          </dt>
                          <dd>
                            {formatLongDate(draft.plannedStart, locale)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {t("detail.endDate")}
                          </dt>
                          <dd>{formatLongDate(draft.plannedEnd, locale)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {t("detail.duration")}
                          </dt>
                          <dd>
                            {durationDays == null
                              ? "—"
                              : t("detail.durationDays", {
                                  count: durationDays,
                                })}
                          </dd>
                        </div>
                      </dl>
                    </PageCard>

                    <PageCard className="overflow-hidden p-0">
                      <div className="px-5 py-3">
                        <h3 className="text-sm font-medium">
                          {t("detail.properties")}
                        </h3>
                      </div>
                      <div className="space-y-4 px-5 pb-5">
                        <label className="block space-y-1 text-sm">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("columns.status")}
                          </span>
                          <select
                            value={draft.status}
                            disabled={isPending}
                            onChange={(event) => {
                              const status = event.target
                                .value as WorkItemStatus;
                              persist({ status }, { status });
                            }}
                            className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm"
                          >
                            {WORK_ITEM_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {t(`status.${status}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("detail.priority")}
                          </span>
                          <div className="flex items-center gap-2">
                            <select
                              value={draft.priority}
                              disabled={isPending}
                              onChange={(event) => {
                                const priority = event.target
                                  .value as WorkItemPriority;
                                persist({ priority }, { priority });
                              }}
                              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm"
                            >
                              {WORK_ITEM_PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>
                                  {t(`detail.priorities.${priority}`)}
                                </option>
                              ))}
                            </select>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                                draft.priority === "high"
                                  ? "bg-destructive/10 text-destructive"
                                  : draft.priority === "low"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary/10 text-primary",
                              )}
                            >
                              <Flag className="size-3" />
                              {t(`detail.priorities.${draft.priority}`)}
                            </span>
                          </div>
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("columns.category")}
                          </span>
                          <input
                            value={draft.category ?? ""}
                            disabled={isPending}
                            onChange={(event) =>
                              patchLocal({ category: event.target.value })
                            }
                            onBlur={() =>
                              persist(
                                { category: draft.category },
                                { category: draft.category },
                              )
                            }
                            placeholder="—"
                            className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm outline-none"
                          />
                        </label>
                        <div className="space-y-1.5">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {t("detail.labels")}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {draft.labels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                              >
                                {label}
                                <button
                                  type="button"
                                  disabled={isPending}
                                  className="rounded-full p-0.5 hover:bg-primary/15"
                                  onClick={() => removeLabel(label)}
                                  aria-label={t("detail.removeLabel")}
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              value={labelDraft}
                              disabled={isPending}
                              onChange={(event) =>
                                setLabelDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addLabel();
                                }
                              }}
                              placeholder="+"
                              className="border-input h-7 w-16 rounded-full border px-2 text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </PageCard>

                    <PageCard className="overflow-hidden p-0">
                      <div className="px-5 py-3">
                        <h3 className="text-sm font-medium">
                          {t("detail.tabs.activity")}
                        </h3>
                      </div>
                      <div className="px-5 pb-5">
                        {linkedActivities.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {t("detail.activityEmpty")}
                          </p>
                        ) : (
                          <ul className="space-y-3">
                            {linkedActivities.slice(0, 6).map((event) => (
                              <li key={event.id}>
                                <p className="text-sm font-medium">
                                  {event.title}
                                </p>
                                {event.body ? (
                                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                                    {event.body}
                                  </p>
                                ) : null}
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formatActivityWhen(event.createdAt, locale)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </PageCard>
                  </div>
                </div>
              ) : null}

              {tab === "planning" ? (
                <PageCard className="mx-auto max-w-lg space-y-4 p-5">
                  <h3 className="text-sm font-medium">
                    {t("detail.planningTitle")}
                  </h3>
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {t("detail.startDate")}
                    </span>
                    <input
                      type="date"
                      value={draft.plannedStart ?? ""}
                      disabled={isPending}
                      onChange={(event) =>
                        patchLocal({
                          plannedStart: event.target.value || null,
                        })
                      }
                      onBlur={() =>
                        persist(
                          { plannedStart: draft.plannedStart },
                          { plannedStart: draft.plannedStart },
                        )
                      }
                      className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {t("detail.endDate")}
                    </span>
                    <input
                      type="date"
                      value={draft.plannedEnd ?? ""}
                      disabled={isPending}
                      onChange={(event) =>
                        patchLocal({
                          plannedEnd: event.target.value || null,
                        })
                      }
                      onBlur={() =>
                        persist(
                          { plannedEnd: draft.plannedEnd },
                          { plannedEnd: draft.plannedEnd },
                        )
                      }
                      className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                    />
                  </label>
                </PageCard>
              ) : null}

              {tab === "hours" && draft ? (
                <WorkItemHoursPanel
                  workItemId={draft.id}
                  isGroup={draft.isGroup}
                  estimatedMinutes={
                    draft.isGroup
                      ? children.reduce(
                          (sum, child) =>
                            sum + (child.estimatedMinutes ?? 0),
                          0,
                        )
                      : draft.estimatedMinutes
                  }
                  actualMinutesOverride={
                    draft.isGroup ? actualMinutes : undefined
                  }
                  staff={staff}
                  onChanged={onChanged}
                  onEstimatedSaved={(minutes) =>
                    patchLocal({ estimatedMinutes: minutes })
                  }
                />
              ) : null}

              {tab === "materials" && draft ? (
                <WorkItemMaterialsPanel
                  workItemId={draft.id}
                  projectId={projectId}
                  isGroup={draft.isGroup}
                  articles={articles}
                  onChanged={onChanged}
                />
              ) : null}

            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SubtasksCard({
  children,
  subtaskTitle,
  setSubtaskTitle,
  onAdd,
  onCycleStatus,
  disabled,
}: {
  children: WorkItemRow[];
  subtaskTitle: string;
  setSubtaskTitle: (value: string) => void;
  onAdd: (event?: FormEvent) => void;
  onCycleStatus: (child: WorkItemRow) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("projects.workItems");
  const done = children.filter((child) => child.status === "done").length;

  return (
    <PageCard className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-5 py-3">
        <h3 className="text-sm font-medium">
          {t("detail.subtasksTitle", { count: children.length })}
        </h3>
        {children.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">
            {done} / {children.length}
          </span>
        ) : null}
      </div>
      <div className="px-5 pb-5">
        {children.length > 0 ? (
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${(done / children.length) * 100}%`,
              }}
            />
          </div>
        ) : null}
        <SubtaskList
          items={children}
          onCycleStatus={onCycleStatus}
          disabled={disabled}
        />
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={onAdd}
        >
          <input
            value={subtaskTitle}
            disabled={disabled}
            onChange={(event) => setSubtaskTitle(event.target.value)}
            placeholder={t("detail.subtaskPlaceholder")}
            className="border-input bg-background h-8 min-w-[12rem] flex-1 rounded-lg border px-2.5 text-sm outline-none"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="text-primary"
            disabled={disabled}
          >
            <Plus className="size-3.5" />
            {t("detail.addSubtask")}
          </Button>
        </form>
      </div>
    </PageCard>
  );
}

function SubtaskList({
  items,
  onCycleStatus,
  disabled,
}: {
  items: WorkItemRow[];
  onCycleStatus: (child: WorkItemRow) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("projects.workItems");
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("detail.subtasksEmpty")}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((child) => {
        const done = child.status === "done";
        return (
          <li key={child.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onCycleStatus(child)}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded border",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
              aria-label={t(`status.${child.status}`)}
            >
              {done ? <Check className="size-3" /> : null}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                done && "text-muted-foreground line-through",
              )}
            >
              {child.title}
            </span>
            <Badge variant={statusVariant(child.status)}>
              {t(`status.${child.status}`)}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
