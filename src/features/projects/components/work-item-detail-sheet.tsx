"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Check,
  ClipboardList,
  Clock,
  Flag,
  Folder,
  MoreHorizontal,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  formatEstimatedHours,
  plannedDurationDays,
  workItemProgressPercent,
  type WorkItemPriority,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { cn } from "@/lib/utils";
import type { WorkItemStatus } from "@/types/database";

type DetailTab =
  | "overview"
  | "subtasks"
  | "planning"
  | "hours"
  | "files"
  | "communication"
  | "activity";

type WorkItemDetailSheetProps = {
  item: WorkItemRow | null;
  items: WorkItemRow[];
  staff: StaffOption[];
  activities: ProjectActivityRow[];
  projectId: string;
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
  const [editingPlanning, setEditingPlanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(item);
    setEditingDescription(false);
    setEditingPlanning(false);
    setMenuOpen(false);
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

  const linkedActivities = useMemo(() => {
    if (!draft) return [];
    return activities.filter((event) => {
      const meta = event.metadata as { work_item_id?: string } | null;
      return meta?.work_item_id === draft.id;
    });
  }, [activities, draft]);

  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "overview", label: t("detail.tabs.overview") },
    {
      id: "subtasks",
      label: t("detail.tabs.subtasks"),
      count: children.length || undefined,
    },
    { id: "planning", label: t("detail.tabs.planning") },
    { id: "hours", label: t("detail.tabs.hours") },
    { id: "files", label: t("detail.tabs.files") },
    { id: "communication", label: t("detail.tabs.communication") },
    {
      id: "activity",
      label: t("detail.tabs.activity"),
      count: linkedActivities.length || undefined,
    },
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
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <ClipboardList className="size-5" />
                </div>
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
                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label={t("rowMenu")}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                      {menuOpen ? (
                        <div className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-md">
                          {WORK_ITEM_STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className="hover:bg-muted block w-full rounded-md px-2.5 py-1.5 text-left text-sm"
                              onClick={() => {
                                setMenuOpen(false);
                                persist({ status }, { status });
                              }}
                            >
                              {t(`status.${status}`)}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="text-destructive hover:bg-destructive/10 block w-full rounded-md px-2.5 py-1.5 text-left text-sm"
                            onClick={() => {
                              setMenuOpen(false);
                              deleteItem();
                            }}
                          >
                            {t("delete")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Folder className="size-3.5" />
                      {parent?.title ?? t("detail.noGroup")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {formatRange(
                        draft.plannedStart,
                        draft.plannedEnd,
                        locale,
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatEstimatedHours(draft.estimatedMinutes)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="flex min-w-max gap-1">
                  {tabs.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTab(entry.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                        tab === entry.id
                          ? "border-b-2 border-primary font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {entry.label}
                      {entry.count !== undefined ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            tab === entry.id
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {entry.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <p className="border-b border-destructive/20 bg-destructive/5 px-5 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-5">
              {tab === "overview" ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.9fr)]">
                  <div className="space-y-5">
                    <PageCard className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
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
                    </PageCard>

                    <PageCard className="divide-y divide-border/80 p-0">
                      <DetailRow label={t("columns.category")}>
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
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      </DetailRow>
                      <DetailRow label={t("columns.status")}>
                        <select
                          value={draft.status}
                          disabled={isPending}
                          onChange={(event) => {
                            const status = event.target
                              .value as WorkItemStatus;
                            persist({ status }, { status });
                          }}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                        >
                          {WORK_ITEM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {t(`status.${status}`)}
                            </option>
                          ))}
                        </select>
                      </DetailRow>
                      <DetailRow label={t("detail.priority")}>
                        <select
                          value={draft.priority}
                          disabled={isPending}
                          onChange={(event) => {
                            const priority = event.target
                              .value as WorkItemPriority;
                            persist({ priority }, { priority });
                          }}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                        >
                          {WORK_ITEM_PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                              {t(`detail.priorities.${priority}`)}
                            </option>
                          ))}
                        </select>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
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
                      </DetailRow>
                      <DetailRow label={t("detail.estimatedHours")}>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          disabled={isPending}
                          value={
                            draft.estimatedMinutes == null
                              ? ""
                              : draft.estimatedMinutes / 60
                          }
                          onChange={(event) => {
                            const raw = event.target.value;
                            patchLocal({
                              estimatedMinutes:
                                raw === ""
                                  ? null
                                  : Math.round(Number(raw) * 60),
                            });
                          }}
                          onBlur={() =>
                            persist(
                              { estimatedMinutes: draft.estimatedMinutes },
                              {
                                estimatedMinutes: draft.estimatedMinutes,
                              },
                            )
                          }
                          className="w-24 bg-transparent text-sm tabular-nums outline-none"
                          placeholder="—"
                        />
                      </DetailRow>
                      <DetailRow label={t("detail.realizedHours")}>
                        <span className="text-sm text-muted-foreground">—</span>
                        <span className="text-xs text-muted-foreground">
                          {t("detail.realizedHoursSoon")}
                        </span>
                      </DetailRow>
                      <DetailRow label={t("detail.progress")}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full rounded-full transition-[width]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {progress}%
                          </span>
                        </div>
                      </DetailRow>
                      <DetailRow label={t("detail.labels")}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {draft.labels.map((label) => (
                            <span
                              key={label}
                              className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
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
                      </DetailRow>
                    </PageCard>

                    <PageCard className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">
                          {t("detail.personnel", {
                            count: draft.assigneeUserId ? 1 : 0,
                          })}
                        </h3>
                      </div>
                      {draft.assigneeUserId && draft.assigneeName ? (
                        <div className="flex items-center gap-3">
                          <span className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
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
                      <div className="mt-3 flex flex-wrap items-center gap-2">
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
                          className="h-8 max-w-full rounded-lg border border-border bg-background px-2.5 text-sm"
                        >
                          <option value="">{t("detail.unassigned")}</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          disabled
                        >
                          <Plus className="size-3.5" />
                          {t("detail.addPerson")}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("detail.multiAssigneeSoon")}
                      </p>
                    </PageCard>
                  </div>

                  <div className="space-y-5">
                    <PageCard className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium">
                          {t("detail.planningTitle")}
                        </h3>
                      </div>
                      {editingPlanning ? (
                        <div className="space-y-3">
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
                              className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                            />
                          </label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={isPending}
                              onClick={() => {
                                persist(
                                  {
                                    plannedStart: draft.plannedStart,
                                    plannedEnd: draft.plannedEnd,
                                  },
                                  {
                                    plannedStart: draft.plannedStart,
                                    plannedEnd: draft.plannedEnd,
                                  },
                                );
                                setEditingPlanning(false);
                              }}
                            >
                              {tCommon("save")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                patchLocal({
                                  plannedStart: item?.plannedStart ?? null,
                                  plannedEnd: item?.plannedEnd ?? null,
                                });
                                setEditingPlanning(false);
                              }}
                            >
                              {tCommon("cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <dl className="space-y-2 text-sm">
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
                            <dd>
                              {formatLongDate(draft.plannedEnd, locale)}
                            </dd>
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
                      )}
                      {!editingPlanning ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 w-full"
                          disabled={isPending}
                          onClick={() => setEditingPlanning(true)}
                        >
                          <Calendar className="size-3.5" />
                          {t("detail.editPlanning")}
                        </Button>
                      ) : null}
                    </PageCard>

                    <SubtasksCard
                      children={children}
                      subtaskTitle={subtaskTitle}
                      setSubtaskTitle={setSubtaskTitle}
                      onAdd={addSubtask}
                      onCycleStatus={cycleChildStatus}
                      disabled={isPending}
                      onOpenAll={() => setTab("subtasks")}
                    />

                    <PageCard className="p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">
                          {t("detail.communicationTitle")}
                        </h3>
                        <button
                          type="button"
                          className="text-primary text-xs font-medium"
                          onClick={() => setTab("communication")}
                        >
                          {t("detail.viewAll")}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("detail.communicationSoon")}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary mt-3 px-0"
                        disabled
                      >
                        <Plus className="size-3.5" />
                        {t("detail.sendMessage")}
                      </Button>
                    </PageCard>
                  </div>
                </div>
              ) : null}

              {tab === "subtasks" ? (
                <PageCard className="p-4">
                  <SubtasksCard
                    children={children}
                    subtaskTitle={subtaskTitle}
                    setSubtaskTitle={setSubtaskTitle}
                    onAdd={addSubtask}
                    onCycleStatus={cycleChildStatus}
                    disabled={isPending}
                    expanded
                  />
                </PageCard>
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
                  <p className="text-sm text-muted-foreground">
                    {t("detail.planningAppointmentsSoon")}
                  </p>
                </PageCard>
              ) : null}

              {tab === "hours" ||
              tab === "files" ||
              tab === "communication" ? (
                <ComingSoonCard
                  title={t(`detail.tabs.${tab}`)}
                  body={t(`detail.soon.${tab}`)}
                />
              ) : null}

              {tab === "activity" ? (
                <PageCard className="p-4">
                  <h3 className="mb-3 text-sm font-medium">
                    {t("detail.tabs.activity")}
                  </h3>
                  {linkedActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("detail.activityEmpty")}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {linkedActivities.map((event) => (
                        <li
                          key={event.id}
                          className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
                        >
                          <p className="text-sm font-medium">{event.title}</p>
                          {event.body ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {event.body}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatActivityWhen(event.createdAt, locale)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </PageCard>
              ) : null}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {children}
      </dd>
    </div>
  );
}

function ComingSoonCard({ title, body }: { title: string; body: string }) {
  return (
    <PageCard className="mx-auto max-w-lg space-y-2 p-8 text-center">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </PageCard>
  );
}

function SubtasksCard({
  children,
  subtaskTitle,
  setSubtaskTitle,
  onAdd,
  onCycleStatus,
  disabled,
  onOpenAll,
  expanded,
}: {
  children: WorkItemRow[];
  subtaskTitle: string;
  setSubtaskTitle: (value: string) => void;
  onAdd: (event?: FormEvent) => void;
  onCycleStatus: (child: WorkItemRow) => void;
  disabled?: boolean;
  onOpenAll?: () => void;
  expanded?: boolean;
}) {
  const t = useTranslations("projects.workItems");
  const done = children.filter((child) => child.status === "done").length;
  const visible = expanded ? children : children.slice(0, 6);

  return (
    <div className={cn(!expanded && "space-y-0")}>
      {!expanded ? (
        <PageCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">
              {t("detail.subtasksTitle", { count: children.length })}
            </h3>
            {onOpenAll ? (
              <button
                type="button"
                className="text-primary text-xs font-medium"
                onClick={onOpenAll}
              >
                {t("detail.viewAll")}
              </button>
            ) : null}
          </div>
          <SubtaskList
            items={visible}
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
            <Button type="submit" size="sm" variant="ghost" className="text-primary" disabled={disabled}>
              <Plus className="size-3.5" />
              {t("detail.addSubtask")}
            </Button>
          </form>
          {children.length > 0 ? (
            <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <div className="bg-muted flex h-1.5 w-20 overflow-hidden rounded-full">
                <div
                  className="bg-success-foreground/80 h-full"
                  style={{
                    width: `${children.length ? (done / children.length) * 100 : 0}%`,
                  }}
                />
              </div>
              {done} / {children.length}
            </div>
          ) : null}
        </PageCard>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">
              {t("detail.subtasksTitle", { count: children.length })}
            </h3>
          </div>
          <SubtaskList
            items={visible}
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
            <Button type="submit" size="sm" disabled={disabled}>
              <Plus className="size-3.5" />
              {t("detail.addSubtask")}
            </Button>
          </form>
        </>
      )}
    </div>
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
