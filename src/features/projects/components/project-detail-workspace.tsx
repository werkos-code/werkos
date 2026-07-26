"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Send,
  StickyNote,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerRow } from "@/features/customers/customers-actions";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import type {
  ProjectActivityRow,
  ProjectRow,
  StaffOption,
} from "@/features/projects/projects-actions";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import type { ProjectActivityType, ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type WorkItem = { id: string; title: string; status: string };

type ProjectDetailWorkspaceProps = {
  project: ProjectRow;
  customer: CustomerRow | null;
  customers: Array<{ id: string; name: string }>;
  staff: StaffOption[];
  quotes: QuoteListItem[];
  workItems: WorkItem[];
  activities: ProjectActivityRow[];
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

function formatDate(iso: string | null | undefined, locale = "nl-NL") {
  if (!iso) return "—";
  try {
    const value = iso.length === 10 ? `${iso}T12:00:00` : iso;
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string, locale = "nl-NL") {
  try {
    return new Intl.DateTimeFormat(locale, {
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
    type === "work_item_created"
  ) {
    return "success";
  }
  if (type === "quote_sent" || type === "status_changed" || type === "note") {
    return "primary";
  }
  if (type === "quote_rejected" || type === "quote_cancelled") {
    return "warning";
  }
  return "muted";
}

function ActivityIcon({ type }: { type: ProjectActivityType }) {
  if (type === "note") return <StickyNote className="size-3.5" />;
  if (type === "quote_created" || type === "quote_updated" || type === "quote_sent")
    return <FileText className="size-3.5" />;
  if (type === "status_changed") return <Circle className="size-3.5" />;
  return <CheckCircle2 className="size-3.5" />;
}

function ProgressRing({
  percent,
  label,
  empty,
}: {
  percent: number | null;
  label: string;
  empty?: boolean;
}) {
  const clamped =
    percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative size-28 shrink-0 rounded-full"
      style={{
        background: empty
          ? `conic-gradient(color-mix(in oklab, var(--muted) 80%, transparent) 100%, transparent 0)`
          : `conic-gradient(var(--primary) ${clamped}%, color-mix(in oklab, var(--muted) 80%, transparent) 0)`,
      }}
    >
      <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-card text-center">
        <span className="text-xl font-semibold tabular-nums">
          {empty ? "—" : `${clamped}%`}
        </span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function ActivityFeed({
  activities,
  emptyLabel,
  limit,
}: {
  activities: ProjectActivityRow[];
  emptyLabel: string;
  limit?: number;
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
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
                {event.createdByName ? ` · ${event.createdByName}` : ""}
              </p>
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
  activities,
  initialTab = "overview",
}: ProjectDetailWorkspaceProps) {
  const t = useTranslations("projects");
  const tQuotes = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();
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
  const [isNotePending, startNoteTransition] = useTransition();
  const [isLabelPending, startLabelTransition] = useTransition();

  const doneItems = workItems.filter((w) => w.status === "done").length;
  const openItems = workItems.filter((w) => w.status !== "done");
  const hasWorkItems = workItems.length > 0;
  const progressPercent = hasWorkItems
    ? Math.round((doneItems / workItems.length) * 100)
    : null;

  const acceptedQuotes = quotes.filter((q) => q.status === "accepted").length;
  const contactDisplay =
    [project.contactName, project.contactPhone, project.contactEmail]
      .filter(Boolean)
      .join(" · ") || "—";

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "overview", label: t("detail.tabs.overview") },
    { id: "quotes", label: t("detail.tabs.quotes"), count: quotes.length },
    { id: "workOrders", label: t("detail.tabs.workOrders") },
    { id: "planning", label: t("detail.tabs.planning") },
    {
      id: "tasks",
      label: t("detail.tabs.tasks"),
      count: workItems.length || undefined,
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
      <div className="flex flex-wrap items-center justify-end gap-2">
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

      <PageCard className="p-5">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center rounded-xl sm:size-20">
            <Building2 className="size-7" />
          </div>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {project.name}
              </h2>
              <Badge variant={statusBadgeVariant(project.status)}>
                {t(`status.${project.status}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-3.5" />
                {project.projectNumber}
              </span>
              <Link
                href={`/bedrijf/klanten/${project.customerId}`}
                className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
              >
                <Building2 className="size-3.5" />
                {project.customerName}
              </Link>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {formatDate(project.startDate)} – {formatDate(project.endDate)}
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
                  <InputLike
                    value={labelDraft}
                    onChange={setLabelDraft}
                    placeholder={t("detail.labelPlaceholder")}
                    disabled={isLabelPending}
                    onSubmit={addLabel}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLabelPending}
                    onClick={addLabel}
                  >
                    {isLabelPending ? tCommon("loading") : t("detail.saveLabel")}
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
                          href={`/bedrijf/klanten/${project.customerId}`}
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
                          {doneItems}/{workItems.length}
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
              />
              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary hover:underline"
                onClick={() => setTab("activity")}
              >
                {t("detail.showAllActivity")}
              </button>
            </PageCard>

            <PageCard className="p-5">
              <h3 className="mb-4 text-sm font-medium">
                {t("detail.openTasksTitle")}
              </h3>
              {openItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("detail.upcomingEmpty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {openItems.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2"
                    >
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <Badge variant="secondary">{t("detail.open")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary hover:underline"
                onClick={() => setTab("tasks")}
              >
                {t("detail.viewAllTasks")}
              </button>
            </PageCard>
          </div>
        </div>
      ) : null}

      {tab === "quotes" ? (
        <QuotesList quotes={quotes} projectId={project.id} />
      ) : null}

      {tab === "tasks" ? (
        <PageCard className="p-5">
          <h3 className="mb-4 text-sm font-medium">{t("sections.workItems")}</h3>
          {workItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tQuotes("noWorkItems")}
            </p>
          ) : (
            <ul className="space-y-2">
              {workItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2 text-sm"
                >
                  <span>{item.title}</span>
                  <Badge variant="secondary">
                    {item.status === "done"
                      ? t("detail.done")
                      : t("detail.open")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PageCard>
      ) : null}

      {tab === "activity" ? (
        <PageCard className="p-5">
          <h3 className="mb-4 text-sm font-medium">
            {t("detail.tabs.activity")}
          </h3>
          <ActivityFeed
            activities={activities}
            emptyLabel={t("detail.activityEmpty")}
          />
        </PageCard>
      ) : null}

      {tab === "workOrders" ||
      tab === "planning" ||
      tab === "files" ||
      tab === "financial" ||
      tab === "communication" ? (
        <PageCard className="flex flex-col items-start gap-3 p-8">
          <div className="text-muted-foreground">
            {tab === "workOrders" ? (
              <ClipboardList className="size-6" />
            ) : tab === "files" ? (
              <FolderOpen className="size-6" />
            ) : tab === "communication" ? (
              <MessageSquare className="size-6" />
            ) : (
              <Calendar className="size-6" />
            )}
          </div>
          <h3 className="text-sm font-medium">{t(`detail.tabs.${tab}`)}</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("detail.tabComingSoon")}
          </p>
        </PageCard>
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

function InputLike({
  value,
  onChange,
  placeholder,
  disabled,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  onSubmit: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSubmit();
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className="border-input bg-background h-8 w-40 rounded-lg border px-2.5 text-sm outline-none"
    />
  );
}
