"use client";

import {
  Bookmark,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PROJECT_STATUSES,
  type ProjectListFilter,
} from "@/features/projects/lib/project-status";
import type { ProjectRow } from "@/features/projects/projects-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import type { ProjectStatus } from "@/types/database";

type ProjectsWorkspaceProps = {
  projects: ProjectRow[];
  initialFilter: ProjectListFilter;
};

const PAGE_SIZE_OPTIONS = [8, 16, 32] as const;

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  try {
    const value = iso.length === 10 ? `${iso}T12:00:00` : iso;
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return iso.slice(0, 10);
  }
}

function isSameMonth(iso: string, now = new Date()) {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function statusBadgeVariant(
  status: ProjectStatus,
): "default" | "secondary" | "success" | "outline" {
  switch (status) {
    case "preparation":
      return "default";
    case "execution":
      return "success";
    case "completed":
      return "success";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

function matchesListFilter(
  status: ProjectStatus,
  filter: ProjectListFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "new_requests") return status === "preparation";
  if (filter === "active") {
    return (
      status === "execution" ||
      status === "operationally_completed" ||
      status === "administratively_completed"
    );
  }
  if (filter === "completed") return status === "completed";
  if (filter === "archived") return status === "archived";
  return true;
}

export function ProjectsWorkspace({
  projects,
  initialFilter,
}: ProjectsWorkspaceProps) {
  const t = useTranslations("projects");
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState<string>(initialFilter);
  const [customerId, setCustomerId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(8);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const customers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      map.set(p.customerId, p.customerName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }, [projects]);

  const stats = useMemo(() => {
    const total = projects.length;
    const preparation = projects.filter((p) => p.status === "preparation").length;
    const active = projects.filter((p) =>
      matchesListFilter(p.status, "active"),
    ).length;
    const completedMonth = projects.filter(
      (p) => p.status === "completed" && isSameMonth(p.updatedAt),
    ).length;
    return { total, preparation, active, completedMonth };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filterKey.startsWith("status:")) {
        if (p.status !== filterKey.slice(7)) return false;
      } else if (
        filterKey === "new_requests" ||
        filterKey === "active" ||
        filterKey === "completed" ||
        filterKey === "archived"
      ) {
        if (!matchesListFilter(p.status, filterKey)) return false;
      }
      if (customerId !== "all" && p.customerId !== customerId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.projectNumber.toLowerCase().includes(q)
      );
    });
  }, [projects, query, filterKey, customerId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  function toggleAllOnPage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of pageItems) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          {t("pageSubtitle")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled>
            <Upload className="size-3.5" />
            {t("actions.import")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            <Bookmark className="size-3.5" />
            {t("actions.saveFilters")}
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href="/werk/aanvragen/nieuw">
              <Plus className="size-3.5" />
              {t("newRequest")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PageCard className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stats.total")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {stats.total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("stats.totalHint")}
              </p>
            </div>
            <FolderKanban className="size-4 text-primary" />
          </div>
        </PageCard>
        <PageCard className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stats.newRequests")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {stats.preparation}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("stats.newRequestsHint")}
              </p>
            </div>
            <CheckSquare className="size-4 text-amber-600" />
          </div>
        </PageCard>
        <PageCard className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stats.active")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {stats.active}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("stats.activeHint")}
              </p>
            </div>
            <Wallet className="size-4 text-emerald-600" />
          </div>
        </PageCard>
        <PageCard className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stats.completedMonth")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {stats.completedMonth}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("stats.completedMonthHint")}
              </p>
            </div>
            <CheckSquare className="size-4 text-primary" />
          </div>
        </PageCard>
        <PageCard className="p-4 opacity-70">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("stats.revenue")}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">—</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("stats.revenueHint")}
              </p>
            </div>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
        </PageCard>
      </div>

      <PageCard className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-9 pl-8"
            />
          </div>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={filterKey}
            onChange={(e) => {
              setFilterKey(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("filters.statusAll")}</option>
            <option value="new_requests">{t("filters.new_requests")}</option>
            <option value="active">{t("filters.active")}</option>
            <option value="completed">{t("filters.completed")}</option>
            <option value="archived">{t("filters.archived")}</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={`status:${status}`}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{t("filters.customerAll")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm opacity-60"
            disabled
            defaultValue="all"
          >
            <option value="all">{t("filters.leaderAll")}</option>
          </select>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm opacity-60"
            disabled
            defaultValue="all"
          >
            <option value="all">{t("filters.periodAll")}</option>
          </select>
          <Button type="button" variant="outline" size="sm" disabled>
            {t("filters.more")}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-pressed
              className="border-primary/30 text-primary"
            >
              <List className="size-3.5" />
            </Button>
            <Button type="button" variant="outline" size="icon-sm" disabled>
              <LayoutGrid className="size-3.5" />
            </Button>
          </div>
        </div>
      </PageCard>

      <PageCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => toggleAllOnPage(e.target.checked)}
                      aria-label={t("selectPage")}
                    />
                  </th>
                  <th className="px-4 py-3">{t("columns.name")}</th>
                  <th className="px-4 py-3">{t("columns.customer")}</th>
                  <th className="px-4 py-3">{t("columns.status")}</th>
                  <th className="px-4 py-3">{t("columns.leader")}</th>
                  <th className="px-4 py-3">{t("columns.startDate")}</th>
                  <th className="px-4 py-3">{t("columns.endDate")}</th>
                  <th className="px-4 py-3 text-right">{t("columns.revenue")}</th>
                  <th className="px-4 py-3">{t("columns.progress")}</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(project.id)}
                        onChange={(e) =>
                          toggleOne(project.id, e.target.checked)
                        }
                        aria-label={project.name}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <Building2 className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/werk/projecten/${project.id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {project.projectNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0" />
                        <Link
                          href={`/bedrijf/klanten/${project.customerId}`}
                          className="hover:text-primary hover:underline"
                        >
                          {project.customerName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(project.status)}>
                        {t(`status.${project.status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.leadName || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(project.startDate, "nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(project.endDate, "nl-NL")}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      —
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 opacity-50">
                        <p className="text-xs text-muted-foreground">—</p>
                        <div className="bg-muted h-1.5 w-24 rounded-full" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled
                        title={t("actions.rowMenu")}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {t("pagination.range", {
              start: rangeStart,
              end: rangeEnd,
              total: filtered.length,
            })}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .filter((n) => {
                if (pageCount <= 5) return true;
                return (
                  n === 1 ||
                  n === pageCount ||
                  Math.abs(n - currentPage) <= 1
                );
              })
              .map((n, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && n - prev > 1;
                return (
                  <span key={n} className="contents">
                    {showEllipsis ? (
                      <span className="px-1 text-muted-foreground">…</span>
                    ) : null}
                    <Button
                      type="button"
                      variant={n === currentPage ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  </span>
                );
              })}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <select
              className="border-input bg-background h-8 rounded-lg border px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {t("pagination.perPage", { count: size })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PageCard>

      {selected.size > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("selectedCount", { count: selected.size })} · {t("bulkSoon")}
        </p>
      ) : null}
    </div>
  );
}
