"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  formatEstimatedHours,
  isWorkItemOverdue,
  WORK_ITEM_STATUSES,
  workItemStats,
} from "@/features/projects/lib/work-item";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { OrgWorkItemRow } from "@/features/work-items/work-items-actions";
import { Link } from "@/i18n/navigation";
import type { WorkItemStatus } from "@/types/database";

type OrgWorkItemsWorkspaceProps = {
  workItems: OrgWorkItemRow[];
};

function statusChipClass(status: WorkItemStatus, overdue: boolean) {
  if (overdue) return "bg-destructive/10 text-destructive";
  if (status === "done") return "bg-emerald-500/10 text-emerald-700";
  if (status === "in_progress") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export function OrgWorkItemsWorkspace({
  workItems,
}: OrgWorkItemsWorkspaceProps) {
  const t = useTranslations("workItems");
  const tOrg = useTranslations("orgWorkItems");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const stats = useMemo(() => workItemStats(workItems), [workItems]);

  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of workItems) {
      map.set(item.projectId, item.projectName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }, [workItems]);

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of workItems) {
      if (item.assigneeUserId) {
        map.set(item.assigneeUserId, item.assigneeName ?? "—");
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }, [workItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workItems.filter((item) => {
      if (statusFilter === "overdue") {
        if (!isWorkItemOverdue(item)) return false;
      } else if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (projectFilter !== "all" && item.projectId !== projectFilter) {
        return false;
      }
      if (assigneeFilter === "unassigned") {
        if (item.assigneeUserId) return false;
      } else if (
        assigneeFilter !== "all" &&
        item.assigneeUserId !== assigneeFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.projectName.toLowerCase().includes(q) ||
        (item.assigneeName?.toLowerCase().includes(q) ?? false) ||
        (item.category?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [workItems, query, statusFilter, projectFilter, assigneeFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard label={tOrg("kpiTotal")} value={String(stats.total)} />
        <MetaStatCard label={tOrg("kpiOpen")} value={String(stats.open)} />
        <MetaStatCard
          label={tOrg("kpiInProgress")}
          value={String(stats.inProgress)}
        />
        <MetaStatCard label={tOrg("kpiDone")} value={String(stats.done)} />
      </div>

      <PageCard className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 pl-8"
            />
          </div>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t("filters.statusAll")}</option>
            {WORK_ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
            <option value="overdue">{t("status.overdue")}</option>
          </select>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">{tOrg("filters.projectAll")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">{t("filters.assigneeAll")}</option>
            <option value="unassigned">{tOrg("filters.unassigned")}</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
      </PageCard>

      {filtered.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {workItems.length === 0 ? tOrg("empty") : tOrg("emptyFiltered")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">
                    {t("columns.title")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {tOrg("columns.project")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("columns.assignee")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("columns.status")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("columns.planning")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {tOrg("columns.hours")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const overdue = isWorkItemOverdue(item);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projecten/${item.projectId}?tab=tasks`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        {item.category ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.category}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/projecten/${item.projectId}`}
                          className="text-muted-foreground hover:text-primary hover:underline"
                        >
                          {item.projectName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.assigneeName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(item.status, overdue)}`}
                        >
                          {overdue
                            ? t("status.overdue")
                            : t(`status.${item.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.plannedStart || item.plannedEnd
                          ? `${item.plannedStart ?? "—"} → ${item.plannedEnd ?? "—"}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatEstimatedHours(item.estimatedMinutes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
