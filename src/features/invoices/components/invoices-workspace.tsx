"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Wallet,
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
import {
  INVOICE_STATUSES,
  computeInvoiceStats,
  daysOverdue,
  daysUntilDue,
  invoiceDisplayStatus,
  isInvoiceOverdue,
  type InvoiceCustomerOption,
  type InvoiceDisplayStatus,
  type InvoiceProjectOption,
  type InvoiceRow,
} from "@/features/invoices/lib/invoice";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatEuroFromCents } from "@/utils/format";
import type { InvoiceStatus } from "@/types/database";

type TabId =
  | "overview"
  | "drafts"
  | "reminders"
  | "sent"
  | "paid"
  | "all";

type InvoicesWorkspaceProps = {
  invoices: InvoiceRow[];
  projects: InvoiceProjectOption[];
  customers: InvoiceCustomerOption[];
};

const PAGE_SIZES = [8, 16, 32] as const;

const AGING_COLORS = {
  overdue: "#ef4444",
  d7: "#f97316",
  d30: "#eab308",
  d30plus: "#94a3b8",
} as const;

function statusBadgeClass(status: InvoiceDisplayStatus) {
  if (status === "overdue") {
    return "border-transparent bg-destructive/10 text-destructive";
  }
  if (status === "open") {
    return "border-transparent bg-amber-500/10 text-amber-700";
  }
  if (status === "sent") {
    return "border-transparent bg-primary/10 text-primary";
  }
  if (status === "paid") {
    return "border-transparent bg-emerald-500/10 text-emerald-700";
  }
  return "border-transparent bg-muted text-muted-foreground";
}

export function InvoicesWorkspace({
  invoices,
  projects,
  customers,
}: InvoicesWorkspaceProps) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => computeInvoiceStats(invoices), [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (tab === "drafts" && invoice.status !== "draft") return false;
      if (tab === "sent" && invoice.status !== "sent") return false;
      if (tab === "paid" && invoice.status !== "paid") return false;
      if (tab === "reminders" && !isInvoiceOverdue(invoice)) return false;
      if (
        tab === "overview" &&
        (invoice.status === "draft" || invoice.status === "paid")
      ) {
        return false;
      }
      if (projectFilter !== "all" && invoice.projectId !== projectFilter) {
        return false;
      }
      if (customerFilter !== "all" && invoice.customerId !== customerFilter) {
        return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "overdue") {
          if (!isInvoiceOverdue(invoice)) return false;
        } else if (invoice.status !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      return (
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        invoice.title.toLowerCase().includes(q) ||
        invoice.projectName.toLowerCase().includes(q) ||
        invoice.projectNumber.toLowerCase().includes(q) ||
        invoice.customerName.toLowerCase().includes(q) ||
        String(invoice.sequenceNumber).includes(q)
      );
    });
  }, [
    invoices,
    tab,
    query,
    projectFilter,
    customerFilter,
    statusFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const selected = invoices.find((row) => row.id === selectedId) ?? null;

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${iso}T12:00:00`));
    } catch {
      return iso;
    }
  }

  function dueHint(invoice: InvoiceRow) {
    if (invoice.status === "paid" || !invoice.dueDate) return null;
    if (isInvoiceOverdue(invoice)) {
      return t("due.overdueDays", { days: daysOverdue(invoice.dueDate) });
    }
    const days = daysUntilDue(invoice.dueDate);
    if (days == null) return null;
    if (days === 0) return t("due.today");
    if (days === 1) return t("due.tomorrow");
    if (days <= 7) return t("due.inDays", { days });
    return null;
  }

  function money(cents: number) {
    return formatEuroFromCents(cents, locale);
  }

  function refresh() {
    router.refresh();
  }

  function setStatus(invoice: InvoiceRow, status: InvoiceStatus) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/invoices", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: invoice.id, status }),
          signal: AbortSignal.timeout(20_000),
        });
        refresh();
      })();
    });
  }

  const kpiCards = [
    {
      key: "outstanding" as const,
      value: money(stats.outstandingCents),
      hint:
        stats.overdueCents > 0
          ? t("kpi.outstandingOverdue", { amount: money(stats.overdueCents) })
          : t("kpi.outstandingHint"),
      hintTone: stats.overdueCents > 0 ? "text-destructive" : "text-muted-foreground",
      icon: FileText,
      tone: "text-destructive",
    },
    {
      key: "paidMonth" as const,
      value: money(stats.paidThisMonthCents),
      hint:
        stats.paidChangePercent === 0
          ? t("kpi.paidMonthHint")
          : t("kpi.paidMonthChange", {
              percent: Math.abs(stats.paidChangePercent),
              sign: stats.paidChangePercent >= 0 ? "+" : "-",
            }),
      hintTone:
        stats.paidChangePercent >= 0
          ? "text-emerald-600"
          : "text-destructive",
      icon: Wallet,
      tone: "text-emerald-600",
    },
    {
      key: "sentMonth" as const,
      value: money(stats.sentThisMonthCents),
      hint: t("kpi.sentMonthHint", { count: stats.sentThisMonthCount }),
      hintTone: "text-muted-foreground",
      icon: Send,
      tone: "text-violet-600",
    },
    {
      key: "avgDays" as const,
      value:
        stats.avgPaymentDays == null
          ? "—"
          : t("kpi.avgDaysValue", { days: stats.avgPaymentDays }),
      hint:
        stats.avgDaysDelta == null
          ? t("kpi.avgDaysHint")
          : t("kpi.avgDaysChange", {
              days: Math.abs(stats.avgDaysDelta),
              sign: stats.avgDaysDelta <= 0 ? "-" : "+",
            }),
      hintTone:
        stats.avgDaysDelta != null && stats.avgDaysDelta <= 0
          ? "text-emerald-600"
          : "text-muted-foreground",
      icon: CalendarDays,
      tone: "text-amber-600",
    },
  ];

  const tabs: TabId[] = [
    "overview",
    "drafts",
    "reminders",
    "sent",
    "paid",
    "all",
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled>
          {t("export")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled>
          <Settings className="size-3.5" />
          {t("settings")}
        </Button>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          {t("newInvoice")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <PageCard key={card.key} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t(`kpi.${card.key}`)}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {card.value}
                </p>
                <p className={cn("mt-0.5 text-[11px]", card.hintTone)}>
                  {card.hint}
                </p>
              </div>
              <card.icon className={cn("size-4", card.tone)} />
            </div>
          </PageCard>
        ))}
      </div>

      <div className="overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-1">
          {tabs.map((id) => (
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

      <div className="flex flex-col gap-4 xl:flex-row">
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
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
              >
                <option value="all">{t("filters.allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setPage(1);
                }}
                className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
              >
                <option value="all">{t("filters.allCustomers")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
              >
                <option value="all">{t("filters.allStatuses")}</option>
                <option value="overdue">{t("status.overdue")}</option>
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
            </div>
          </PageCard>

          <PageCard className="overflow-hidden p-0">
            {pageItems.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table min-w-[64rem]">
                  <thead>
                    <tr>
                      <th>{t("columns.invoice")}</th>
                      <th>{t("columns.project")}</th>
                      <th>{t("columns.customer")}</th>
                      <th>{t("columns.issueDate")}</th>
                      <th>{t("columns.dueDate")}</th>
                      <th>{t("columns.amount")}</th>
                      <th>{t("columns.status")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((invoice) => {
                      const display = invoiceDisplayStatus(invoice);
                      const hint = dueHint(invoice);
                      return (
                        <tr
                          key={invoice.id}
                          className={cn(
                            "cursor-pointer",
                            selectedId === invoice.id && "bg-primary/5",
                          )}
                          onClick={() => setSelectedId(invoice.id)}
                        >
                          <td>
                            <p className="font-medium text-primary">
                              {invoice.invoiceNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              #{invoice.sequenceNumber}
                            </p>
                          </td>
                          <td>
                            <p className="font-medium">
                              {invoice.projectId
                                ? invoice.projectName
                                : t("form.modeStandalone")}
                            </p>
                            {invoice.projectId ? (
                              <p className="text-xs text-muted-foreground">
                                {invoice.projectNumber}
                              </p>
                            ) : null}
                          </td>
                          <td>{invoice.customerName}</td>
                          <td className="text-muted-foreground">
                            {formatDate(invoice.issueDate)}
                          </td>
                          <td>
                            <p>{formatDate(invoice.dueDate)}</p>
                            {hint ? (
                              <p
                                className={cn(
                                  "text-xs",
                                  isInvoiceOverdue(invoice)
                                    ? "text-destructive"
                                    : "text-muted-foreground",
                                )}
                              >
                                {hint}
                              </p>
                            ) : null}
                          </td>
                          <td>
                            <p className="font-medium tabular-nums">
                              {money(invoice.totalCents)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("inclVat")}
                            </p>
                          </td>
                          <td>
                            <Badge
                              variant="outline"
                              className={statusBadgeClass(display)}
                            >
                              {t(`status.${display}`)}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("rowMenu")}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <p>
                {t("pagination.range", {
                  from:
                    filtered.length === 0
                      ? 0
                      : (currentPage - 1) * pageSize + 1,
                  to: Math.min(currentPage * pageSize, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(
                      Number(event.target.value) as (typeof PAGE_SIZES)[number],
                    );
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("pagination.prev")}
                </Button>
                <span className="tabular-nums">
                  {currentPage}/{pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          </PageCard>
        </div>

        <aside className="w-full shrink-0 space-y-4 xl:w-80">
          <AgingWidget
            totalCents={stats.outstandingCents}
            aging={stats.aging}
            money={money}
          />
          <TrendWidget
            thisMonth={stats.trendThis}
            prevMonth={stats.trendPrev}
          />
          <TopOutstandingWidget
            items={stats.topOutstanding}
            money={money}
          />
        </aside>
      </div>

      {selected ? (
        <InvoiceDetailSheet
          invoice={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
          onSetStatus={setStatus}
          disabled={isPending}
          formatDate={formatDate}
          money={money}
        />
      ) : null}

      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        customers={customers}
        onCreated={(invoiceId) => {
          setCreateOpen(false);
          router.push(`/facturen/${invoiceId}`);
        }}
        onError={setError}
      />
    </div>
  );
}

function AgingWidget({
  totalCents,
  aging,
  money,
}: {
  totalCents: number;
  aging: ReturnType<typeof computeInvoiceStats>["aging"];
  money: (cents: number) => string;
}) {
  const t = useTranslations("invoices");
  const entries = [
    { key: "overdue" as const, value: aging.overdue },
    { key: "d7" as const, value: aging.d7 },
    { key: "d30" as const, value: aging.d30 },
    { key: "d30plus" as const, value: aging.d30plus },
  ];
  const sum = entries.reduce((s, e) => s + e.value, 0) || 1;
  let offset = 0;
  const segments = entries
    .filter((e) => e.value > 0)
    .map((entry) => {
      const pct = (entry.value / sum) * 100;
      const seg = { ...entry, pct, offset };
      offset += pct;
      return seg;
    });

  return (
    <PageCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{t("widgets.agingTitle")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {money(totalCents)}
          </p>
        </div>
        <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-muted/40"
          />
          {segments.map((seg) => (
            <circle
              key={seg.key}
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={AGING_COLORS[seg.key]}
              strokeWidth="4"
              strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
        </svg>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2.5 rounded-full"
                style={{ background: AGING_COLORS[entry.key] }}
              />
              {t(`widgets.aging.${entry.key}`)}
            </span>
            <span className="tabular-nums font-medium">
              {money(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}

function TrendWidget({
  thisMonth,
  prevMonth,
}: {
  thisMonth: number[];
  prevMonth: number[];
}) {
  const t = useTranslations("invoices");
  const max = Math.max(1, ...thisMonth, ...prevMonth);
  const w = 280;
  const h = 120;
  const pad = 8;

  function path(values: number[]) {
    if (values.length === 0) return "";
    return values
      .map((value, index) => {
        const x =
          pad + (index / Math.max(1, values.length - 1)) * (w - pad * 2);
        const y = h - pad - (value / max) * (h - pad * 2);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <PageCard className="p-4">
      <p className="text-sm font-medium">{t("widgets.trendTitle")}</p>
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary size-2 rounded-full" />
          {t("widgets.trendThis")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-primary" />
          {t("widgets.trendPrev")}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full">
        <path
          d={path(prevMonth)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="text-primary/40"
        />
        <path
          d={path(thisMonth)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />
      </svg>
    </PageCard>
  );
}

function TopOutstandingWidget({
  items,
  money,
}: {
  items: ReturnType<typeof computeInvoiceStats>["topOutstanding"];
  money: (cents: number) => string;
}) {
  const t = useTranslations("invoices");
  return (
    <PageCard className="p-4">
      <p className="text-sm font-medium">{t("widgets.topTitle")}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("widgets.topEmpty")}
        </p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li
              key={item.projectId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground mr-1.5 tabular-nums">
                  {index + 1}.
                </span>
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums font-medium">
                {money(item.cents)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </PageCard>
  );
}

function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
  onSetStatus,
  disabled,
  formatDate,
  money,
}: {
  invoice: InvoiceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetStatus: (invoice: InvoiceRow, status: InvoiceStatus) => void;
  disabled?: boolean;
  formatDate: (iso: string | null) => string;
  money: (cents: number) => string;
}) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const display = invoiceDisplayStatus(invoice);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-full w-[min(100%,70vw)] gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,70vw)] data-[side=right]:sm:max-w-[70vw]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-5 py-3">
          <SheetTitle className="text-sm font-medium">
            {t("detailTitle", { number: invoice.invoiceNumber })}
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusBadgeClass(display)}>
              {t(`status.${display}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              #{invoice.sequenceNumber}
            </span>
          </div>

          <div>
            <p className="text-lg font-semibold">{invoice.title}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {money(invoice.totalCents)}
            </p>
            <p className="text-xs text-muted-foreground">{t("inclVat")}</p>
          </div>

          <div>
            {invoice.projectId ? (
              <>
                <Link
                  href={`/projecten/${invoice.projectId}`}
                  className="text-primary inline-flex items-center gap-1.5 font-medium hover:underline"
                >
                  {invoice.projectName}
                  <ExternalLink className="size-3.5" />
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invoice.projectNumber} · {invoice.customerName}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {invoice.customerName}
              </p>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.issueDate")}</dt>
              <dd>{formatDate(invoice.issueDate)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.dueDate")}</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("detail.subtotal")}</dt>
              <dd className="tabular-nums">{money(invoice.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("detail.vat")}</dt>
              <dd className="tabular-nums">{money(invoice.vatCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t("detail.total")}</dt>
              <dd className="tabular-nums font-medium">
                {money(invoice.totalCents)}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-medium">{t("detail.notes")}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {invoice.notes?.trim() || t("detail.notesEmpty")}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">{t("columns.status")}</h3>
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={invoice.status === status ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => onSetStatus(invoice, status)}
                >
                  {t(`status.${status}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button type="button" variant="outline" className="flex-1" asChild>
            <Link href={`/facturen/${invoice.id}`}>{t("detail.openFull")}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled
            aria-label={t("rowMenu")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateInvoiceDialog({
  open,
  onOpenChange,
  projects,
  customers,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: InvoiceProjectOption[];
  customers: InvoiceCustomerOption[];
  onCreated: (invoiceId: string) => void;
  onError: (message: string | null) => void;
}) {
  const t = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const [mode, setMode] = useState<"project" | "standalone">("project");
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [projectId, setProjectId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] =
    useState<InvoiceCustomerOption[]>(customers);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setCustomerOptions(customers);
  }, [open, customers]);

  function resetForm() {
    setMode("project");
    setCustomerMode("existing");
    setProjectId("");
    setCustomerId("");
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setNewCustomerAddress("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "project" && !projectId) {
      onError(t("form.projectRequired"));
      return;
    }
    if (mode === "standalone") {
      if (customerMode === "existing" && !customerId) {
        onError(t("form.customerRequired"));
        return;
      }
      if (customerMode === "new" && !newCustomerName.trim()) {
        onError(t("form.customerNameRequired"));
        return;
      }
    }
    onError(null);
    startTransition(() => {
      void (async () => {
        try {
          let resolvedCustomerId =
            mode === "standalone" && customerMode === "existing"
              ? customerId
              : null;

          if (mode === "standalone" && customerMode === "new") {
            const customerRes = await fetch("/api/customers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: newCustomerName.trim(),
                email: newCustomerEmail.trim() || undefined,
                phone: newCustomerPhone.trim() || undefined,
                address: newCustomerAddress.trim() || undefined,
              }),
              signal: AbortSignal.timeout(20_000),
            });
            const customerResult = (await customerRes.json()) as {
              error?: string;
              customerId?: string;
            };
            if (!customerRes.ok || !customerResult.customerId) {
              onError(
                customerResult.error === "name_required"
                  ? t("form.customerNameRequired")
                  : customerResult.error || tCommon("error"),
              );
              return;
            }
            resolvedCustomerId = customerResult.customerId;
            setCustomerOptions((prev) => {
              if (prev.some((c) => c.id === resolvedCustomerId)) return prev;
              return [
                ...prev,
                {
                  id: resolvedCustomerId!,
                  name: newCustomerName.trim(),
                },
              ].sort((a, b) => a.name.localeCompare(b.name, "nl"));
            });
          }

          const res = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: mode === "project" ? projectId : null,
              customerId:
                mode === "standalone" ? resolvedCustomerId : null,
              status: "draft",
              editorMode: true,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await res.json()) as {
            error?: string;
            invoiceId?: string;
          };
          if (!res.ok || !result.invoiceId) {
            onError(result.error || tCommon("error"));
            return;
          }
          resetForm();
          onCreated(result.invoiceId);
        } catch {
          onError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t("form.createTitle")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                mode === "project"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMode("project")}
            >
              {t("form.modeProject")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                mode === "standalone"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMode("standalone")}
            >
              {t("form.modeStandalone")}
            </button>
          </div>

          {mode === "project" ? (
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("form.project")}</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                required
              >
                <option value="">{t("form.selectProject")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    customerMode === "existing"
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setCustomerMode("existing")}
                >
                  {t("form.customerExisting")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    customerMode === "new"
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setCustomerMode("new")}
                >
                  {t("form.customerNew")}
                </button>
              </div>

              {customerMode === "existing" ? (
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">
                    {t("form.customer")}
                  </span>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={isPending}
                    className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                    required
                  >
                    <option value="">{t("form.selectCustomer")}</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {t("form.customerName")}
                    </span>
                    <input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      disabled={isPending}
                      className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                      required
                      autoComplete="organization"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">
                        {t("form.customerEmail")}
                      </span>
                      <input
                        type="email"
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        disabled={isPending}
                        className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-muted-foreground">
                        {t("form.customerPhone")}
                      </span>
                      <input
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        disabled={isPending}
                        className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                      />
                    </label>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">
                      {t("form.customerAddress")}
                    </span>
                    <textarea
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      disabled={isPending}
                      rows={2}
                      className="border-input bg-background w-full rounded-lg border px-2.5 py-2"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t("form.editorHint")}</p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? tCommon("loading") : t("form.openEditor")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
