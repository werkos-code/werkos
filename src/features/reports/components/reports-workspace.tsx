"use client";

import { useTranslations } from "next-intl";

import { formatEurFromCents } from "@/config/pricing";
import type { ReportsSnapshot } from "@/features/reports/reports-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";

type ReportsWorkspaceProps = {
  snapshot: ReportsSnapshot;
};

export function ReportsWorkspace({ snapshot }: ReportsWorkspaceProps) {
  const t = useTranslations("reports");
  const tProjects = useTranslations("projects");
  const { kpis } = snapshot;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard
          label={t("kpi.projectsActive")}
          value={String(kpis.projectsActive)}
        />
        <MetaStatCard
          label={t("kpi.quotesOpen")}
          value={String(kpis.quotesOpen)}
        />
        <MetaStatCard
          label={t("kpi.invoicesUnpaid")}
          value={String(kpis.invoicesUnpaid)}
        />
        <MetaStatCard
          label={t("kpi.outstanding")}
          value={formatEurFromCents(kpis.outstandingCents)}
        />
        <MetaStatCard
          label={t("kpi.workItemsOverdue")}
          value={String(kpis.workItemsOverdue)}
        />
        <MetaStatCard
          label={t("kpi.workOrdersOpen")}
          value={String(kpis.workOrdersOpen)}
        />
        <MetaStatCard
          label={t("kpi.timeEntries")}
          value={String(kpis.timeEntriesCount)}
        />
        <MetaStatCard
          label={t("kpi.projectsTotal")}
          value={String(kpis.projectsTotal)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        <PageCard className="overflow-hidden xl:col-span-1">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("tables.openProjects")}</h2>
          </div>
          {snapshot.openProjects.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("empty.projects")}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{t("columns.project")}</th>
                  <th className="px-4 py-2 font-medium">{t("columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.openProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/projecten/${project.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {project.customerName}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {tProjects(`status.${project.status}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PageCard>

        <PageCard className="overflow-hidden xl:col-span-1">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("tables.overdueWorkItems")}</h2>
          </div>
          {snapshot.overdueWorkItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("empty.workItems")}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{t("columns.workItem")}</th>
                  <th className="px-4 py-2 font-medium">{t("columns.due")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.overdueWorkItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/projecten/${item.projectId}?tab=tasks`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.projectName}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-destructive">
                      {item.plannedEnd ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PageCard>

        <PageCard className="overflow-hidden xl:col-span-1">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("tables.unpaidInvoices")}</h2>
          </div>
          {snapshot.unpaidInvoices.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("empty.invoices")}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">{t("columns.invoice")}</th>
                  <th className="px-4 py-2 font-medium">{t("columns.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.unpaidInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/facturen/${invoice.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {invoice.customerName}
                        {invoice.overdue ? ` · ${t("overdue")}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatEurFromCents(invoice.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PageCard>
      </div>
    </div>
  );
}
