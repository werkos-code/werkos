"use client";

import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  Share2,
  Star,
  StickyNote,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerRow } from "@/features/customers/customers-actions";
import { FilesWorkspace } from "@/features/files/components/files-workspace";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import { ProjectWorkItemsPanel } from "@/features/projects/components/project-work-items-panel";
import { ProjectWorkItemsWorkspace } from "@/features/projects/components/project-work-items-workspace";
import type {
  ProjectActivityRow,
  ProjectRow,
  StaffOption,
} from "@/features/projects/projects-actions";
import {
  formatEstimatedHours,
  workItemStats,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import { ProjectFinancialPanel } from "@/features/invoices/components/project-financial-panel";
import type { InvoiceListItem } from "@/features/invoices/invoices-actions";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import type { WorkOrderRow } from "@/features/work-orders/lib/work-order";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import type { ProjectActivityType, ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type ProjectDetailWorkspaceProps = {
  project: ProjectRow;
  customer: CustomerRow | null;
  customers: Array<{ id: string; name: string }>;
  staff: StaffOption[];
  quotes: QuoteListItem[];
  workItems: WorkItemRow[];
  workOrders: WorkOrderRow[];
  activities: ProjectActivityRow[];
  minutesByWorkItem?: Record<string, number>;
  articles?: import("@/features/materials/lib/materials").ArticleRow[];
  invoices?: InvoiceListItem[];
  initialTab?: string;
};

type TabId =
  | "overview"
  | "quotes"
  | "workOrders"
  | "planning"
  | "tasks"
  | "files"
  | "financial"
  | "communication"
  | "activity";

type ActivityFilter = "all" | "notes" | "quotes" | "tasks" | "project";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const value = iso.length === 10 ? `${iso}T12:00:00` : iso;
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadgeVariant(
  status: ProjectStatus,
): "default" | "secondary" | "success" | "outline" {
  if (status === "execution" || status === "completed") return "success";
  if (status === "preparation") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

function activityTone(
  type: ProjectActivityType,
): "success" | "primary" | "muted" | "warning" {
  if (
    type === "quote_accepted" ||
    type === "project_created" ||
    type === "work_item_created" ||
    type === "work_item_completed"
  ) {
    return "success";
  }
  if (
    type === "quote_sent" ||
    type === "status_changed" ||
    type === "note" ||
    type === "cover_updated"
  ) {
    return "primary";
  }
  if (type === "quote_rejected" || type === "quote_cancelled") {
    return "warning";
  }
  return "muted";
}

function matchesActivityFilter(
  type: ProjectActivityType,
  filter: ActivityFilter,
) {
  if (filter === "all") return true;
  if (filter === "notes") return type === "note";
  if (filter === "quotes") return type.startsWith("quote_");
  if (filter === "tasks") return type.startsWith("work_item_");
  return (
    type.startsWith("project_") ||
    type === "status_changed" ||
    type === "cover_updated"
  );
}

function ActivityIcon({ type }: { type: ProjectActivityType }) {
  if (type === "note") return <StickyNote className="size-3.5" />;
  if (type === "cover_updated") return <ImageIcon className="size-3.5" />;
  if (type.startsWith("quote_")) return <FileText className="size-3.5" />;
  if (type === "status_changed") return <Circle className="size-3.5" />;
  return <CheckCircle2 className="size-3.5" />;
}

function ProgressRing({
  percent,
  label,
  empty,
  size = "md",
}: {
  percent: number | null;
  label: string;
  empty?: boolean;
  size?: "sm" | "md";
}) {
  const clamped = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full",
        size === "sm" ? "size-20" : "size-28",
      )}
      style={{
        background: empty
          ? `conic-gradient(color-mix(in oklab, var(--muted) 80%, transparent) 100%, transparent 0)`
          : `conic-gradient(var(--primary) ${clamped}%, color-mix(in oklab, var(--muted) 80%, transparent) 0)`,
      }}
    >
      <div
        className={cn(
          "absolute flex flex-col items-center justify-center rounded-full bg-card text-center",
          size === "sm" ? "inset-1.5" : "inset-2",
        )}
      >
        <span
          className={cn(
            "font-semibold tabular-nums",
            size === "sm" ? "text-base" : "text-xl",
          )}
        >
          {empty ? "—" : `${clamped}%`}
        </span>
        <span className="max-w-[4.5rem] truncate text-[9px] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

function ActivityFeed({
  activities,
  emptyLabel,
  limit,
  projectId,
}: {
  activities: ProjectActivityRow[];
  emptyLabel: string;
  limit?: number;
  projectId: string;
}) {
  const t = useTranslations("projects");
  const items = limit ? activities.slice(0, limit) : activities;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((event) => {
        const tone = activityTone(event.type);
        const quoteId =
          typeof event.metadata.quote_id === "string"
            ? event.metadata.quote_id
            : null;
        return (
          <li key={event.id} className="flex gap-3">
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                tone === "success" && "bg-success text-success-foreground",
                tone === "primary" && "bg-primary/10 text-primary",
                tone === "warning" && "bg-amber-100 text-amber-800",
                tone === "muted" && "bg-muted text-muted-foreground",
              )}
            >
              <ActivityIcon type={event.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{event.title}</p>
                <Badge variant="secondary" className="shrink-0">
                  {t(`detail.activityTypes.${event.type}`)}
                </Badge>
              </div>
              {event.body ? (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">
                  {event.body}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {formatDateTime(event.createdAt)}
                  {event.createdByName ? ` · ${event.createdByName}` : ""}
                </span>
                {quoteId ? (
                  <Link
                    href={`/projecten/${projectId}/offertes/${quoteId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {t("detail.openQuote")}
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectDetailWorkspace({
  project,
  customer,
  customers,
  staff,
  quotes,
  workItems,
  workOrders,
  activities,
  minutesByWorkItem = {},
  articles = [],
  invoices = [],
  initialTab = "overview",
}: ProjectDetailWorkspaceProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const tWorkOrders = useTranslations("workOrders");
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<TabId>(
    ([
      "overview",
      "quotes",
      "tasks",
      "workOrders",
      "planning",
      "files",
      "financial",
      "communication",
      "activity",
    ].includes(initialTab)
      ? initialTab
      : "overview") as TabId,
  );
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [addingLabel, setAddingLabel] = useState(false);
  const [favorited, setFavorited] = useState(project.isFavorite);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [isNotePending, startNoteTransition] = useTransition();
  const [isLabelPending, startLabelTransition] = useTransition();
  const [isFavoritePending, startFavoriteTransition] = useTransition();
  const [isCoverPending, startCoverTransition] = useTransition();

  useEffect(() => {
    setFavorited(project.isFavorite);
  }, [project.isFavorite]);

  const taskStats = useMemo(
    () => workItemStats(workItems, minutesByWorkItem),
    [workItems, minutesByWorkItem],
  );
  const openItems = workItems.filter(
    (w) => !w.isGroup && w.status !== "done",
  );
  const hasWorkItems = taskStats.total > 0;
  const progressPercent = taskStats.progressPercent;
  const acceptedQuotes = quotes.filter((q) => q.status === "accepted").length;
  const contactDisplay =
    [project.contactName, project.contactPhone, project.contactEmail]
      .filter(Boolean)
      .join(" · ") || "—";

  const filteredActivities = useMemo(
    () =>
      activities.filter((item) =>
        matchesActivityFilter(item.type, activityFilter),
      ),
    [activities, activityFilter],
  );

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "overview", label: t("detail.tabs.overview") },
    { id: "quotes", label: t("detail.tabs.quotes"), count: quotes.length },
    { id: "workOrders", label: t("detail.tabs.workOrders"), count: workOrders.length || undefined },
    { id: "planning", label: t("detail.tabs.planning") },
    {
      id: "tasks",
      label: t("detail.tabs.tasks"),
      count: taskStats.total || undefined,
    },
    { id: "files", label: t("detail.tabs.files") },
    { id: "financial", label: t("detail.tabs.financial") },
    { id: "communication", label: t("detail.tabs.communication") },
    {
      id: "activity",
      label: t("detail.tabs.activity"),
      count: activities.length || undefined,
    },
  ];

  function InfoRow({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="flex gap-3 py-2.5">
        <div className="text-muted-foreground mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <div className="mt-0.5 text-sm text-foreground">{value}</div>
        </div>
      </div>
    );
  }

  function toggleFavorite() {
    startFavoriteTransition(() => {
      void (async () => {
        const next = !favorited;
        setFavorited(next);
        try {
          const response = await fetch(
            `/api/projects/${project.id}/favorite`,
            {
              method: next ? "POST" : "DELETE",
              signal: AbortSignal.timeout(20_000),
            },
          );
          if (!response.ok) {
            setFavorited(!next);
          } else {
            router.refresh();
          }
        } catch {
          setFavorited(!next);
        }
      })();
    });
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage(t("detail.shareCopied"));
      window.setTimeout(() => setShareMessage(null), 2000);
    } catch {
      setShareMessage(tCommon("error"));
    }
  }

  function uploadCover(file: File | undefined) {
    if (!file) return;
    setCoverError(null);
    startCoverTransition(() => {
      void (async () => {
        try {
          const form = new FormData();
          form.append("file", file);
          const response = await fetch(`/api/projects/${project.id}/cover`, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(30_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setCoverError(
              result.error === "invalid_type"
                ? t("detail.coverInvalidType")
                : result.error === "file_too_large"
                  ? t("detail.coverTooLarge")
                  : result.error || tCommon("error"),
            );
            return;
          }
          router.refresh();
        } catch {
          setCoverError(tCommon("error"));
        }
      })();
    });
  }

  function removeCover() {
    startCoverTransition(() => {
      void (async () => {
        try {
          await fetch(`/api/projects/${project.id}/cover`, {
            method: "DELETE",
            signal: AbortSignal.timeout(20_000),
          });
          router.refresh();
        } catch {
          setCoverError(tCommon("error"));
        }
      })();
    });
  }

  function submitNote() {
    const body = note.trim();
    if (!body) {
      setNoteError(t("detail.noteRequired"));
      return;
    }
    setNoteError(null);
    startNoteTransition(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/projects/${project.id}/activities`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body }),
              signal: AbortSignal.timeout(20_000),
            },
          );
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setNoteError(result.error || tCommon("error"));
            return;
          }
          setNote("");
          setTab("activity");
          router.refresh();
        } catch {
          setNoteError(tCommon("error"));
        }
      })();
    });
  }

  function addLabel() {
    const name = labelDraft.trim();
    if (!name) {
      setLabelError(t("detail.labelRequired"));
      return;
    }
    setLabelError(null);
    startLabelTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/projects/${project.id}/labels`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setLabelError(
              result.error === "duplicate_label"
                ? t("detail.labelDuplicate")
                : result.error || tCommon("error"),
            );
            return;
          }
          setLabelDraft("");
          setAddingLabel(false);
          router.refresh();
        } catch {
          setLabelError(tCommon("error"));
        }
      })();
    });
  }

  function removeLabel(labelId: string) {
    startLabelTransition(() => {
      void (async () => {
        try {
          await fetch(`/api/projects/${project.id}/labels/${labelId}`, {
            method: "DELETE",
            signal: AbortSignal.timeout(20_000),
          });
          router.refresh();
        } catch {
          /* ignore */
        }
      })();
    });
  }

  return (
    <div className="space-y-5 pb-24">
      {shareMessage ? (
        <p className="text-right text-sm text-muted-foreground">{shareMessage}</p>
      ) : null}

      <PageCard className="relative p-5">
        <div className="absolute top-5 right-5 z-10 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyShareLink}
          >
            <Share2 className="size-3.5" />
            {t("detail.share")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editing ? "outline" : "default"}
            onClick={() => {
              setTab("overview");
              setEditing((v) => !v);
            }}
          >
            <Pencil className="size-3.5" />
            {editing ? t("detail.cancelEdit") : t("detail.edit")}
          </Button>
        </div>

        <div className="flex flex-col gap-6 pt-10 xl:flex-row xl:items-center xl:justify-between xl:gap-8 xl:pt-0">
          <div className="flex min-w-0 flex-1 gap-4 xl:pr-4">
            <div className="relative shrink-0">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                  uploadCover(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={isCoverPending}
                onClick={() => coverInputRef.current?.click()}
                className="group bg-muted text-muted-foreground relative flex size-16 items-center justify-center overflow-hidden rounded-xl sm:size-20"
                aria-label={t("detail.changeCover")}
              >
                {project.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.coverUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Building2 className="size-7" />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="size-5 text-white" />
                </span>
              </button>
              {project.coverUrl ? (
                <button
                  type="button"
                  disabled={isCoverPending}
                  onClick={removeCover}
                  className="bg-background absolute -top-1 -right-1 rounded-full border border-border p-0.5 shadow-sm"
                  aria-label={t("detail.removeCover")}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {project.name}
                </h2>
                <Badge variant={statusBadgeVariant(project.status)}>
                  {t(`status.${project.status}`)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isFavoritePending}
                  onClick={toggleFavorite}
                  className={cn(
                    favorited ? "text-amber-500" : "text-muted-foreground",
                  )}
                  aria-label={
                    favorited
                      ? t("detail.unfavorite")
                      : t("detail.favorite")
                  }
                >
                  <Star
                    className={cn("size-4", favorited && "fill-current")}
                  />
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  {project.projectNumber}
                </span>
                <Link
                  href={`/klanten/${project.customerId}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                >
                  <Building2 className="size-3.5" />
                  {project.customerName}
                </Link>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDate(project.startDate)} –{" "}
                  {formatDate(project.endDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {project.leadName || "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {project.labels.length === 0 && !addingLabel ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {t("detail.noLabels")}
                  </span>
                ) : (
                  project.labels.map((label) => (
                    <span
                      key={label.id}
                      className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    >
                      {label.name}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-primary/15"
                        disabled={isLabelPending}
                        onClick={() => removeLabel(label.id)}
                        aria-label={t("detail.removeLabel")}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
                {addingLabel ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={labelDraft}
                      onChange={(event) => setLabelDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addLabel();
                        }
                      }}
                      disabled={isLabelPending}
                      placeholder={t("detail.labelPlaceholder")}
                      className="border-input bg-background h-8 w-40 rounded-lg border px-2.5 text-sm outline-none"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isLabelPending}
                      onClick={addLabel}
                    >
                      {isLabelPending
                        ? tCommon("loading")
                        : t("detail.saveLabel")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isLabelPending}
                      onClick={() => {
                        setAddingLabel(false);
                        setLabelDraft("");
                        setLabelError(null);
                      }}
                    >
                      {tCommon("cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingLabel(true)}
                  >
                    <Plus className="size-3.5" />
                    {t("detail.addLabel")}
                  </Button>
                )}
              </div>
              {labelError ? (
                <p className="text-sm text-destructive">{labelError}</p>
              ) : null}
              {coverError ? (
                <p className="text-sm text-destructive">{coverError}</p>
              ) : null}
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 sm:grid-cols-4 xl:w-auto xl:min-w-[26rem] xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
            <div className="flex flex-col items-start gap-1.5">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.kpiProgress")}
              </p>
              <ProgressRing
                percent={progressPercent}
                label={
                  hasWorkItems
                    ? t("detail.kpiProgressHint", {
                        done: taskStats.done,
                        total: taskStats.total,
                      })
                    : t("detail.completedLabel")
                }
                empty={!hasWorkItems}
                size="sm"
              />
            </div>
            <HeroMetric
              label={t("detail.kpiTasks")}
              value={String(taskStats.total)}
              hint={t("detail.kpiTasksHint", { done: taskStats.done })}
            />
            <HeroMetric
              label={t("detail.kpiOpen")}
              value={String(taskStats.open + taskStats.inProgress)}
              hint={
                taskStats.overdue > 0
                  ? t("detail.kpiOverdueHint", { count: taskStats.overdue })
                  : t("detail.kpiOpenHint")
              }
              hintDanger={taskStats.overdue > 0}
            />
            <HeroMetric
              label={t("detail.kpiHours")}
              value={formatEstimatedHours(taskStats.estimatedMinutes)}
              hint={
                taskStats.actualMinutes > 0 || taskStats.estimatedMinutes > 0
                  ? t("detail.kpiHoursActualHint", {
                      actual: formatEstimatedHours(
                        taskStats.actualMinutes > 0
                          ? taskStats.actualMinutes
                          : null,
                      ),
                      remaining: formatEstimatedHours(
                        taskStats.remainingMinutes,
                      ),
                    })
                  : t("detail.kpiHoursEmpty")
              }
            />
          </div>
        </div>
      </PageCard>

      <div className="overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors",
                tab === item.id
                  ? "border-b-2 border-primary font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    tab === item.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(16rem,0.9fr)]">
            <PageCard className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{t("detail.infoTitle")}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditing((v) => !v)}
                  aria-label={t("detail.edit")}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
              {editing ? (
                <ProjectDetailForm
                  project={project}
                  customers={customers}
                  staff={staff}
                  onCancel={() => setEditing(false)}
                  onSaved={() => setEditing(false)}
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <InfoRow
                      icon={<FileText className="size-3.5" />}
                      label={t("fields.projectNumber")}
                      value={project.projectNumber}
                    />
                    <InfoRow
                      icon={<Building2 className="size-3.5" />}
                      label={t("fields.customer")}
                      value={
                        <Link
                          href={`/klanten/${project.customerId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {project.customerName}
                        </Link>
                      }
                    />
                    <InfoRow
                      icon={<User className="size-3.5" />}
                      label={t("detail.contact")}
                      value={contactDisplay}
                    />
                    <InfoRow
                      icon={<MapPin className="size-3.5" />}
                      label={t("detail.address")}
                      value={customer?.address || "—"}
                    />
                    <InfoRow
                      icon={<Phone className="size-3.5" />}
                      label={t("detail.phone")}
                      value={customer?.phone || "—"}
                    />
                    <InfoRow
                      icon={<Mail className="size-3.5" />}
                      label={t("detail.email")}
                      value={customer?.email || "—"}
                    />
                  </div>
                  <div>
                    <InfoRow
                      icon={<User className="size-3.5" />}
                      label={t("detail.leader")}
                      value={project.leadName || "—"}
                    />
                    <InfoRow
                      icon={<Calendar className="size-3.5" />}
                      label={t("detail.startDate")}
                      value={formatDate(project.startDate)}
                    />
                    <InfoRow
                      icon={<Calendar className="size-3.5" />}
                      label={t("detail.endDate")}
                      value={formatDate(project.endDate)}
                    />
                    <InfoRow
                      icon={<Circle className="size-3.5" />}
                      label={t("fields.status")}
                      value={
                        <Badge variant={statusBadgeVariant(project.status)}>
                          {t(`status.${project.status}`)}
                        </Badge>
                      }
                    />
                  </div>
                </div>
              )}
              {project.notes && !editing ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("fields.notes")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {project.notes}
                  </p>
                </div>
              ) : null}
            </PageCard>

            <PageCard className="p-5">
              <h3 className="mb-4 text-sm font-medium">
                {t("detail.progressTitle")}
              </h3>
              {hasWorkItems ? (
                <>
                  <div className="flex items-center gap-4">
                    <ProgressRing
                      percent={progressPercent}
                      label={t("detail.completedLabel")}
                    />
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {t("detail.tabs.tasks")}
                        </span>
                        <span className="tabular-nums">
                          {taskStats.done}/{taskStats.total}
                        </span>
                      </li>
                      <li className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {t("detail.tabs.quotes")}
                        </span>
                        <span className="tabular-nums">
                          {acceptedQuotes}/{quotes.length}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-sm font-medium text-primary hover:underline"
                    onClick={() => setTab("tasks")}
                  >
                    {t("detail.viewProgress")}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <ProgressRing
                    percent={null}
                    label={t("detail.completedLabel")}
                    empty
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("detail.progressEmpty")}
                  </p>
                </div>
              )}
            </PageCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <PageCard className="p-5">
              <h3 className="mb-4 text-sm font-medium">
                {t("detail.timelineTitle")}
              </h3>
              <ActivityFeed
                activities={activities}
                emptyLabel={t("detail.activityEmpty")}
                limit={8}
                projectId={project.id}
              />
              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary hover:underline"
                onClick={() => setTab("activity")}
              >
                {t("detail.showAllActivity")}
              </button>
            </PageCard>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-medium">
                  {t("detail.openTasksTitle")}
                </h3>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setTab("tasks")}
                >
                  {t("detail.viewAllTasks")}
                </button>
              </div>
              {openItems.length === 0 ? (
                <PageCard className="p-5">
                  <p className="text-sm text-muted-foreground">
                    {t("detail.upcomingEmpty")}
                  </p>
                </PageCard>
              ) : (
                <ProjectWorkItemsPanel
                  projectId={project.id}
                  workItems={openItems}
                  compact
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "quotes" ? (
        <QuotesList quotes={quotes} projectId={project.id} />
      ) : null}

      {tab === "tasks" ? (
        <ProjectWorkItemsWorkspace
          projectId={project.id}
          workItems={workItems}
          staff={staff}
          activities={activities}
          minutesByWorkItem={minutesByWorkItem}
          articles={articles}
        />
      ) : null}

      {tab === "activity" ? (
        <PageCard className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">{t("detail.tabs.activity")}</h3>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  "all",
                  "notes",
                  "quotes",
                  "tasks",
                  "project",
                ] as ActivityFilter[]
              ).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActivityFilter(filter)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs transition-colors",
                    activityFilter === filter
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`detail.activityFilters.${filter}`)}
                </button>
              ))}
            </div>
          </div>
          <ActivityFeed
            activities={filteredActivities}
            emptyLabel={t("detail.activityEmpty")}
            projectId={project.id}
          />
        </PageCard>
      ) : null}

      {tab === "workOrders" ? (
        <PageCard className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">{t("detail.tabs.workOrders")}</h3>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/werkbonnen">{t("detail.viewAllWorkOrders")}</Link>
            </Button>
          </div>
          {workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.workOrdersEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/80">
              {workOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {order.workOrderNumber}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.title}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === "done"
                        ? "success"
                        : order.status === "in_progress"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {tWorkOrders(`status.${order.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PageCard>
      ) : null}

      {tab === "files" ? (
        <FilesWorkspace
          projectId={project.id}
          projectName={project.name}
          embedded
        />
      ) : null}

      {tab === "planning" || tab === "communication" ? (
        <PageCard className="flex flex-col items-start gap-3 p-8">
          <div className="text-muted-foreground">
            {tab === "communication" ? (
              <MessageSquare className="size-6" />
            ) : (
              <Calendar className="size-6" />
            )}
          </div>
          <h3 className="text-sm font-medium">{t(`detail.tabs.${tab}`)}</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {tab === "planning"
              ? t("detail.planningModuleHint")
              : t("detail.tabComingSoon")}
          </p>
          {tab === "planning" ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/planning">{t("detail.openPlanning")}</Link>
            </Button>
          ) : null}
        </PageCard>
      ) : null}

      {tab === "financial" ? (
        <ProjectFinancialPanel
          projectId={project.id}
          projectName={project.name}
          invoices={invoices ?? []}
        />
      ) : null}

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-border bg-background/95 p-3 backdrop-blur-sm md:left-[calc(var(--sidebar-width)+1.5rem)]">
        <div className="mx-auto flex w-[90%] max-w-5xl items-center gap-2">
          <StickyNote className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitNote();
              }
            }}
            disabled={isNotePending}
            placeholder={t("detail.notePlaceholder")}
            className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <Button
            type="button"
            size="icon"
            disabled={isNotePending || !note.trim()}
            onClick={submitNote}
            aria-label={t("detail.postNote")}
          >
            <Send className="size-4" />
          </Button>
        </div>
        {noteError ? (
          <p className="mx-auto mt-2 w-[90%] max-w-5xl text-sm text-destructive">
            {noteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  hint,
  hintDanger,
}: {
  label: string;
  value: string;
  hint: string;
  hintDanger?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-0.5 text-[11px]",
          hintDanger ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </div>
  );
}
