"use client";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  Receipt,
  StickyNote,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CustomerRow } from "@/features/customers/customers-actions";
import { dayDelta, formatShortDate } from "@/features/dashboard/lib/dates";
import { isInvoiceOverdue } from "@/features/invoices/lib/invoice";
import type { InvoiceListItem } from "@/features/invoices/invoices-actions";
import {
  isWorkItemOverdue,
  workItemStats,
  type WorkItemRow,
} from "@/features/projects/lib/work-item";
import type {
  ProjectActivityRow,
  ProjectRow,
} from "@/features/projects/projects-actions";
import type { QuoteListItem } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import { formatEuroFromCents } from "@/utils/format";
import type { ProjectActivityType } from "@/types/database";
import { cn } from "@/lib/utils";

export type ProjectDetailMode =
  | "overview"
  | "work"
  | "quotes"
  | "files"
  | "money";

type ProjectDetailOverviewProps = {
  project: ProjectRow;
  customer: CustomerRow | null;
  quotes: QuoteListItem[];
  workItems: WorkItemRow[];
  activities: ProjectActivityRow[];
  invoices: InvoiceListItem[];
  taskStats: ReturnType<typeof workItemStats>;
  onOpenMode: (mode: ProjectDetailMode) => void;
};

type ActivityFilter = "all" | "notes" | "quotes" | "tasks" | "project";

type AttentionItem = {
  id: string;
  kind: "work" | "quote" | "invoice";
  title: string;
  dueDate: string | null;
  overdue: boolean;
  href?: string;
  mode?: ProjectDetailMode;
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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

function initials(name: string | null) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  const second = parts[1];
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0]}${second[0]}`.toUpperCase();
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function RelativeDate({
  iso,
  overdue,
  locale,
}: {
  iso: string | null;
  overdue?: boolean;
  locale: string;
}) {
  const t = useTranslations("projects");
  if (!iso) return <span className="text-xs text-muted-foreground">—</span>;
  const delta = dayDelta(iso);
  let label = formatShortDate(iso, locale);
  if (delta === 0) label = t("detail.relative.today");
  else if (delta === -1) label = t("detail.relative.yesterday");
  else if (delta != null && delta < -1 && delta >= -14) {
    label = t("detail.relative.daysAgo", { count: Math.abs(delta) });
  }
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        overdue ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function ProjectDetailOverview({
  project,
  customer,
  quotes,
  workItems,
  activities,
  invoices,
  taskStats,
  onOpenMode,
}: ProjectDetailOverviewProps) {
  const t = useTranslations("projects");
  const tQuotes = useTranslations("quotes");
  const tInvoices = useTranslations("invoices");
  const locale = useLocale();
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  const openItems = useMemo(() => {
    return workItems
      .filter((item) => !item.isGroup && item.status !== "done")
      .slice()
      .sort((a, b) => {
        const aOver = isWorkItemOverdue(a) ? 0 : 1;
        const bOver = isWorkItemOverdue(b) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        if (a.plannedEnd && b.plannedEnd) {
          return a.plannedEnd.localeCompare(b.plannedEnd);
        }
        if (a.plannedEnd) return -1;
        if (b.plannedEnd) return 1;
        return 0;
      });
  }, [workItems]);

  const previewItems = openItems.slice(0, 5);
  const progressPercent = taskStats.progressPercent ?? 0;
  const hasWorkItems = taskStats.total > 0;

  const sentQuotes = quotes.filter((quote) => quote.status === "sent");
  const lastInvoice = useMemo(() => {
    if (invoices.length === 0) return null;
    return [...invoices].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];
  }, [invoices]);

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    for (const item of workItems) {
      if (item.isGroup || !isWorkItemOverdue(item)) continue;
      items.push({
        id: `work-${item.id}`,
        kind: "work",
        title: item.title,
        dueDate: item.plannedEnd,
        overdue: true,
        mode: "work",
      });
    }
    for (const quote of sentQuotes) {
      items.push({
        id: `quote-${quote.id}`,
        kind: "quote",
        title: quote.quoteNumber || quote.title,
        dueDate: quote.validUntil,
        overdue: Boolean(
          quote.validUntil &&
            new Date(`${quote.validUntil}T23:59:59`) < new Date(),
        ),
        href: `/projecten/${project.id}/offertes/${quote.id}`,
      });
    }
    for (const invoice of invoices) {
      if (!isInvoiceOverdue(invoice)) continue;
      items.push({
        id: `invoice-${invoice.id}`,
        kind: "invoice",
        title: invoice.invoiceNumber,
        dueDate: invoice.dueDate,
        overdue: true,
        href: `/facturen/${invoice.id}`,
      });
    }
    return items.slice(0, 6);
  }, [workItems, sentQuotes, invoices, project.id]);

  const visibleActivities = useMemo(() => {
    const filtered = activities.filter((item) =>
      matchesActivityFilter(item.type, activityFilter),
    );
    return showAllActivity ? filtered : filtered.slice(0, 6);
  }, [activities, activityFilter, showAllActivity]);

  const phone = project.contactPhone || customer?.phone || null;
  const address = customer?.address || null;
  const contactName = project.contactName || project.customerName;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.9fr)]">
      <div className="space-y-5">
        <PageCard className="overflow-hidden p-0">
          <div className="px-5 py-3">
            <h3 className="text-sm font-medium">{t("detail.attentionTitle")}</h3>
          </div>
          {attention.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              {t("detail.attentionEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {attention.map((item) => {
                const tone =
                  item.kind === "invoice"
                    ? "bg-destructive/10 text-destructive"
                    : item.kind === "quote"
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-500/10 text-amber-700";
                const Icon =
                  item.kind === "invoice"
                    ? Receipt
                    : item.kind === "quote"
                      ? FileText
                      : AlertCircle;
                const actionLabel =
                  item.kind === "invoice"
                    ? t("detail.openInvoice")
                    : item.kind === "quote"
                      ? t("detail.openQuote")
                      : t("detail.openWork");
                const inner = (
                  <>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        tone,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="text-xs font-medium text-primary">
                        {actionLabel}
                      </span>
                    </span>
                    <RelativeDate
                      iso={item.dueDate}
                      overdue={item.overdue}
                      locale={locale}
                    />
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/30"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => item.mode && onOpenMode(item.mode)}
                        className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/30"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </PageCard>

        <PageCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 px-5 py-3">
            <h3 className="text-sm font-medium">{t("detail.workCardTitle")}</h3>
            <button
              type="button"
              onClick={() => onOpenMode("work")}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("detail.openWorkspace")}
            </button>
          </div>
          <div className="px-5 pb-4">
            {hasWorkItems ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t("detail.workDoneOf", {
                      done: taskStats.done,
                      total: taskStats.total,
                    })}
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {progressPercent}%
                  </span>
                </div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">
                {t("detail.progressEmpty")}
              </p>
            )}
            {previewItems.length === 0 ? (
              hasWorkItems ? (
                <p className="text-sm text-muted-foreground">
                  {t("detail.upcomingEmpty")}
                </p>
              ) : null
            ) : (
              <ul className="divide-y divide-border/70">
                {previewItems.map((item) => {
                  const mark = initials(item.assigneeName);
                  const overdue = isWorkItemOverdue(item);
                  return (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {item.title}
                      </span>
                      {mark ? (
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary"
                          title={item.assigneeName ?? undefined}
                        >
                          {mark}
                        </span>
                      ) : null}
                      <RelativeDate
                        iso={item.plannedEnd}
                        overdue={overdue}
                        locale={locale}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PageCard>

        <PageCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 px-5 py-3">
            <h3 className="text-sm font-medium">
              {t("detail.timelineTitle")}
            </h3>
            {activities.length > 6 ? (
              <button
                type="button"
                onClick={() => setShowAllActivity((value) => !value)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {showAllActivity
                  ? t("detail.showLessActivity")
                  : t("detail.allActivity")}
              </button>
            ) : null}
          </div>
          {showAllActivity ? (
            <div className="flex flex-wrap gap-1 px-5 pb-3">
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
          ) : null}
          <div className="px-5 pb-5">
            {visibleActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("detail.activityEmpty")}
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleActivities.map((event) => {
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
                          tone === "success" &&
                            "bg-success text-success-foreground",
                          tone === "primary" && "bg-primary/10 text-primary",
                          tone === "warning" && "bg-amber-100 text-amber-800",
                          tone === "muted" && "bg-muted text-muted-foreground",
                        )}
                      >
                        <ActivityIcon type={event.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.body ? (
                          <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                            {event.body}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                          {event.createdByName
                            ? ` · ${event.createdByName}`
                            : ""}
                          {quoteId ? (
                            <>
                              {" · "}
                              <Link
                                href={`/projecten/${project.id}/offertes/${quoteId}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {t("detail.openQuote")}
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </PageCard>
      </div>

      <div className="space-y-5">
        <PageCard className="p-5">
          <h3 className="mb-4 text-sm font-medium">
            {t("detail.commercialTitle")}
          </h3>
          <button
            type="button"
            onClick={() => onOpenMode("quotes")}
            className="flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:bg-muted/30"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-medium">
                {t("detail.quotesSummary", { count: quotes.length })}
              </span>
              {sentQuotes.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {t("detail.quotesWaiting", { waiting: sentQuotes.length })}
                </span>
              ) : quotes.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  {tQuotes("empty")}
                </span>
              ) : null}
            </span>
          </button>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("detail.lastInvoice")}
            </p>
            {lastInvoice ? (
              <Link
                href={`/facturen/${lastInvoice.id}`}
                className="mt-2 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-semibold tabular-nums">
                  {formatEuroFromCents(lastInvoice.totalCents)}
                </span>
                <Badge
                  variant={
                    lastInvoice.status === "paid" ? "success" : "secondary"
                  }
                >
                  {tInvoices(`status.${lastInvoice.status}`)}
                </Badge>
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("detail.noInvoice")}
              </p>
            )}
          </div>
        </PageCard>

        <PageCard className="flex flex-col p-5">
          <h3 className="mb-4 text-sm font-medium">
            {t("detail.customerLocation")}
          </h3>
          <Link
            href={`/klanten/${project.customerId}`}
            className="text-sm font-medium hover:text-primary hover:underline"
          >
            {contactName}
          </Link>
          {phone ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              {phone}
            </p>
          ) : null}
          {address ? (
            <p className="mt-1.5 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="size-3.5 mt-0.5 shrink-0" />
              {address}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">—</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!phone}
              asChild={Boolean(phone)}
            >
              {phone ? (
                <a href={`tel:${phone.replace(/\s+/g, "")}`}>
                  <Phone className="size-3.5" />
                  {t("detail.call")}
                </a>
              ) : (
                <>
                  <Phone className="size-3.5" />
                  {t("detail.call")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!address}
              asChild={Boolean(address)}
            >
              {address ? (
                <a
                  href={mapsUrl(address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" />
                  {t("detail.route")}
                </a>
              ) : (
                <>
                  <ExternalLink className="size-3.5" />
                  {t("detail.route")}
                </>
              )}
            </Button>
          </div>
        </PageCard>
      </div>
    </div>
  );
}
