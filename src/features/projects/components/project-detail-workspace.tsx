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
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Send,
  Share2,
  Star,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerRow } from "@/features/customers/customers-actions";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import type { ProjectRow } from "@/features/projects/projects-actions";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import type { ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type WorkItem = { id: string; title: string; status: string };

type ProjectDetailWorkspaceProps = {
  project: ProjectRow;
  customer: CustomerRow | null;
  customers: Array<{ id: string; name: string }>;
  quotes: QuoteListItem[];
  workItems: WorkItem[];
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

function shortProjectRef(id: string) {
  return `PRJ-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function formatShortDay(iso: string) {
  try {
    const d = new Date(iso);
    const weekday = new Intl.DateTimeFormat("nl-NL", { weekday: "short" })
      .format(d)
      .replace(".", "")
      .toUpperCase()
      .slice(0, 2);
    const day = d.getDate();
    return { weekday, day };
  } catch {
    return { weekday: "—", day: "—" as const };
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

function ProgressRing({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative size-28 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${clamped}%, color-mix(in oklab, var(--muted) 80%, transparent) 0)`,
      }}
    >
      <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-card text-center">
        <span className="text-xl font-semibold tabular-nums">{clamped}%</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function ProjectDetailWorkspace({
  project,
  customer,
  customers,
  quotes,
  workItems,
  initialTab = "overview",
}: ProjectDetailWorkspaceProps) {
  const t = useTranslations("projects");
  const tQuotes = useTranslations("quotes");
  const [tab, setTab] = useState<TabId>(
    (["overview", "quotes", "tasks", "workOrders", "planning", "files", "financial", "communication", "activity"].includes(
      initialTab,
    )
      ? initialTab
      : "overview") as TabId,
  );
  const [editing, setEditing] = useState(false);

  const doneItems = workItems.filter((w) => w.status === "done").length;
  const openItems = workItems.filter((w) => w.status !== "done");
  const progressPercent =
    workItems.length === 0
      ? 0
      : Math.round((doneItems / workItems.length) * 100);

  const acceptedQuotes = quotes.filter((q) => q.status === "accepted").length;

  const timeline = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      tone: "success" | "primary" | "muted" | "warning";
      at: string;
    }> = [];

    events.push({
      id: `created-${project.id}`,
      title: t("detail.timeline.created"),
      subtitle: formatDate(project.createdAt),
      badge: t("detail.timeline.badges.done"),
      tone: "success",
      at: project.createdAt,
    });

    for (const quote of quotes) {
      events.push({
        id: `quote-${quote.id}`,
        title: quote.title,
        subtitle: `${tQuotes(`status.${quote.status}`)} · ${formatDate(quote.updatedAt)}`,
        badge: tQuotes(`status.${quote.status}`),
        tone:
          quote.status === "accepted"
            ? "success"
            : quote.status === "sent"
              ? "primary"
              : "muted",
        at: quote.updatedAt,
      });
    }

    for (const item of workItems.slice(0, 5)) {
      events.push({
        id: `wi-${item.id}`,
        title: item.title,
        subtitle: t(`detail.timeline.workItem`, {
          status: item.status === "done" ? t("detail.done") : t("detail.open"),
        }),
        badge:
          item.status === "done" ? t("detail.done") : t("detail.open"),
        tone: item.status === "done" ? "success" : "warning",
        at: project.updatedAt,
      });
    }

    return events
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 6);
  }, [project, quotes, workItems, t, tQuotes]);

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
    { id: "activity", label: t("detail.tabs.activity") },
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

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled>
          <Share2 className="size-3.5" />
          {t("detail.share")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setTab("overview");
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5" />
          {t("detail.edit")}
        </Button>
      </div>

      <PageCard className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-xl sm:size-24">
              <Building2 className="size-8" />
            </div>
            <div className="min-w-0 space-y-3">
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
                  disabled
                  className="text-muted-foreground"
                >
                  <Star className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled
                  className="text-muted-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  {shortProjectRef(project.id)}
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
                  {formatDate(project.createdAt)} – —
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="size-3.5" />—
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {t("detail.labelsStub")}
                </span>
                <Button type="button" variant="outline" size="sm" disabled>
                  <Plus className="size-3.5" />
                  {t("detail.addLabel")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[22rem] lg:shrink-0">
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.revenue")}
              </p>
              <p className="mt-1 text-lg font-semibold">—</p>
              <div className="bg-muted mt-2 h-1.5 rounded-full">
                <div className="bg-primary/40 h-1.5 w-0 rounded-full" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("detail.invoicedStub")}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.margin")}
              </p>
              <p className="mt-1 text-lg font-semibold">—</p>
              <p className="mt-1 text-[11px] text-muted-foreground">—</p>
            </div>
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
                <h3 className="text-sm font-medium">
                  {t("detail.infoTitle")}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>
              {editing ? (
                <ProjectDetailForm
                  project={project}
                  customers={customers}
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
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
                      value="—"
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
                      value="—"
                    />
                    <InfoRow
                      icon={<Calendar className="size-3.5" />}
                      label={t("detail.startDate")}
                      value={formatDate(project.createdAt)}
                    />
                    <InfoRow
                      icon={<Calendar className="size-3.5" />}
                      label={t("detail.endDate")}
                      value="—"
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
                    <InfoRow
                      icon={<CheckCircle2 className="size-3.5" />}
                      label={t("detail.chance")}
                      value="—"
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
              <div className="flex items-center gap-4">
                <ProgressRing
                  percent={progressPercent}
                  label={t("detail.completedLabel")}
                />
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {t("detail.tabs.quotes")}
                    </span>
                    <span className="tabular-nums">
                      {acceptedQuotes}/{quotes.length || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4 opacity-60">
                    <span className="text-muted-foreground">
                      {t("detail.tabs.workOrders")}
                    </span>
                    <span className="tabular-nums">—/—</span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {t("detail.tabs.tasks")}
                    </span>
                    <span className="tabular-nums">
                      {doneItems}/{workItems.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4 opacity-60">
                    <span className="text-muted-foreground">
                      {t("detail.tabs.files")}
                    </span>
                    <span className="tabular-nums">—/—</span>
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
            </PageCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <PageCard className="p-5 lg:col-span-1 xl:col-span-1">
              <h3 className="mb-4 text-sm font-medium">
                {t("detail.timelineTitle")}
              </h3>
              <ul className="space-y-3">
                {timeline.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                        event.tone === "success" &&
                          "bg-success text-success-foreground",
                        event.tone === "primary" &&
                          "bg-primary/10 text-primary",
                        event.tone === "warning" &&
                          "bg-amber-100 text-amber-800",
                        event.tone === "muted" &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <Badge variant="secondary" className="shrink-0">
                          {event.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.subtitle}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
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
                {t("detail.upcomingTitle")}
              </h3>
              {openItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("detail.upcomingEmpty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {openItems.slice(0, 5).map((item) => {
                    const day = formatShortDay(project.updatedAt);
                    return (
                      <li key={item.id} className="flex items-center gap-3">
                        <div className="bg-muted flex size-11 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-medium">
                          <span>{day.weekday}</span>
                          <span className="text-sm">{day.day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {t("detail.open")}
                          </Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                className="mt-4 text-sm font-medium text-primary hover:underline"
                disabled
              >
                {t("detail.viewPlanning")}
              </button>
            </PageCard>

            <div className="space-y-5">
              <PageCard className="p-5">
                <h3 className="mb-3 text-sm font-medium">
                  {t("detail.financialTitle")}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("detail.quotesTotal")}
                    </dt>
                    <dd className="tabular-nums">{quotes.length}</dd>
                  </div>
                  <div className="flex justify-between gap-3 opacity-60">
                    <dt className="text-muted-foreground">
                      {t("detail.invoicesTotal")}
                    </dt>
                    <dd>—</dd>
                  </div>
                  <div className="flex justify-between gap-3 opacity-60">
                    <dt className="text-muted-foreground">
                      {t("detail.paid")}
                    </dt>
                    <dd className="text-emerald-700">—</dd>
                  </div>
                  <div className="flex justify-between gap-3 opacity-60">
                    <dt className="text-muted-foreground">
                      {t("detail.openAmount")}
                    </dt>
                    <dd className="text-destructive">—</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-primary hover:underline"
                  onClick={() => setTab("financial")}
                >
                  {t("detail.viewFinancial")}
                </button>
              </PageCard>

              <PageCard className="p-5 opacity-80">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {t("detail.filesTitle")}
                  </h3>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    disabled
                  >
                    {t("detail.viewAll")}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("detail.filesEmpty")}
                </p>
              </PageCard>
            </div>
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
                    {item.status === "done" ? t("detail.done") : t("detail.open")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PageCard>
      ) : null}

      {tab === "workOrders" ||
      tab === "planning" ||
      tab === "files" ||
      tab === "financial" ||
      tab === "communication" ||
      tab === "activity" ? (
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
        <div className="mx-auto flex w-[90%] items-center gap-2">
          <Pencil className="size-4 shrink-0 text-muted-foreground" />
          <input
            disabled
            placeholder={t("detail.notePlaceholder")}
            className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none"
          />
          <Button type="button" size="icon" disabled>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
