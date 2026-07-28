"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import {
  isInvoiceOverdue,
  type InvoiceRow,
} from "@/features/invoices/lib/invoice";
import { listInvoices } from "@/features/invoices/invoices-actions";
import { listProjects, type ProjectRow } from "@/features/projects/projects-actions";
import {
  isWorkItemOverdue,
  workItemStats,
} from "@/features/projects/lib/work-item";
import { listQuotesForOrganization } from "@/features/quotes/quotes-actions";
import {
  listWorkItemsForOrganization,
  type OrgWorkItemRow,
} from "@/features/work-items/work-items-actions";
import { listWorkOrders } from "@/features/work-orders/work-orders-actions";
import { PROJECT_FILTER_STATUSES } from "@/features/projects/lib/project-status";

export type ReportsSnapshot = {
  kpis: {
    projectsTotal: number;
    projectsActive: number;
    quotesOpen: number;
    invoicesUnpaid: number;
    outstandingCents: number;
    workItemsOverdue: number;
    workOrdersOpen: number;
    timeEntriesCount: number;
  };
  openProjects: Array<{
    id: string;
    name: string;
    status: ProjectRow["status"];
    customerName: string;
    projectNumber: string;
  }>;
  overdueWorkItems: Array<{
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    plannedEnd: string | null;
    assigneeName: string | null;
  }>;
  unpaidInvoices: Array<{
    id: string;
    invoiceNumber: string;
    title: string;
    customerName: string;
    dueDate: string | null;
    totalCents: number;
    overdue: boolean;
  }>;
};

export async function loadReportsSnapshot(): Promise<{
  snapshot?: ReportsSnapshot;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [
    projectsResult,
    quotesResult,
    invoicesResult,
    workItemsResult,
    workOrdersResult,
    timeCountResult,
  ] = await Promise.all([
    listProjects(),
    listQuotesForOrganization(),
    listInvoices(),
    listWorkItemsForOrganization(),
    listWorkOrders(),
    ctx.supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
  ]);

  if (projectsResult.error) return { error: projectsResult.error };
  if (quotesResult.error) return { error: quotesResult.error };
  if (invoicesResult.error) return { error: invoicesResult.error };
  if (workItemsResult.error) return { error: workItemsResult.error };
  if (workOrdersResult.error) return { error: workOrdersResult.error };
  if (timeCountResult.error) return { error: timeCountResult.error.message };

  const projects = projectsResult.projects ?? [];
  const quotes = quotesResult.quotes ?? [];
  const invoices = invoicesResult.invoices ?? [];
  const workItems = workItemsResult.workItems ?? [];
  const workOrders = workOrdersResult.workOrders ?? [];
  const activeStatuses = new Set(PROJECT_FILTER_STATUSES.active ?? []);
  const workStats = workItemStats(workItems);

  const unpaid = invoices.filter(
    (invoice) => invoice.status === "open" || invoice.status === "sent",
  );
  const outstandingCents = unpaid.reduce(
    (sum, invoice) => sum + invoice.totalCents,
    0,
  );

  const openProjects = projects
    .filter((project) => activeStatuses.has(project.status) || project.status === "preparation")
    .slice(0, 12)
    .map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      customerName: project.customerName,
      projectNumber: project.projectNumber,
    }));

  const overdueWorkItems = workItems
    .filter((item: OrgWorkItemRow) => isWorkItemOverdue(item))
    .slice(0, 12)
    .map((item) => ({
      id: item.id,
      title: item.title,
      projectId: item.projectId,
      projectName: item.projectName,
      plannedEnd: item.plannedEnd,
      assigneeName: item.assigneeName,
    }));

  const unpaidInvoices = unpaid
    .slice(0, 12)
    .map((invoice: InvoiceRow) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      title: invoice.title,
      customerName: invoice.customerName,
      dueDate: invoice.dueDate,
      totalCents: invoice.totalCents,
      overdue: isInvoiceOverdue(invoice),
    }));

  return {
    snapshot: {
      kpis: {
        projectsTotal: projects.length,
        projectsActive: projects.filter((p) => activeStatuses.has(p.status)).length,
        quotesOpen: quotes.filter(
          (q) => q.status === "draft" || q.status === "sent",
        ).length,
        invoicesUnpaid: unpaid.length,
        outstandingCents,
        workItemsOverdue: workStats.overdue,
        workOrdersOpen: workOrders.filter(
          (order) =>
            order.status === "planned" ||
            order.status === "in_progress" ||
            order.status === "open",
        ).length,
        timeEntriesCount: timeCountResult.count ?? 0,
      },
      openProjects,
      overdueWorkItems,
      unpaidInvoices,
    },
  };
}
