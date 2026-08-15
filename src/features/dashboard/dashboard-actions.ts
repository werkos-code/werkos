"use server";

import { listPlanningWorkspaceData } from "@/features/planning/planning-actions";
import {
  isInvoiceOverdue,
  type InvoiceRow,
} from "@/features/invoices/lib/invoice";
import { listInvoices } from "@/features/invoices/invoices-actions";
import { PROJECT_FILTER_STATUSES } from "@/features/projects/lib/project-status";
import {
  isWorkItemOverdue,
  workItemStats,
} from "@/features/projects/lib/work-item";
import { listProjects, type ProjectRow } from "@/features/projects/projects-actions";
import { listQuotesForOrganization } from "@/features/quotes/quotes-actions";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import {
  listWorkItemsForOrganization,
  type OrgWorkItemRow,
} from "@/features/work-items/work-items-actions";
import type { ProjectStatus } from "@/types/database";

export type DashboardAttentionKind = "invoice" | "workItem" | "quote";

export type DashboardAttentionItem = {
  id: string;
  kind: DashboardAttentionKind;
  title: string;
  subtitle: string;
  href: string;
  dueDate: string | null;
  overdue: boolean;
};

export type DashboardTodayItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  href: string;
  context: string | null;
};

export type DashboardAssignedTask = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  plannedEnd: string | null;
  status: "open" | "in_progress" | "done";
  overdue: boolean;
};

export type DashboardPersonalTodo = {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  customerName: string;
  projectNumber: string;
  coverUrl: string | null;
  progressPercent: number | null;
};

export type DashboardProjectOption = {
  id: string;
  name: string;
};

export type DashboardWorkItemOption = {
  id: string;
  title: string;
  projectId: string;
};

export type DashboardKpis = {
  revenueCents: number;
  openQuotesCount: number;
  openInboxCount: number;
};

export type DashboardCalendarDay = {
  date: string;
  count: number;
};

export type DashboardSnapshot = {
  currentUserId: string;
  kpis: DashboardKpis;
  attention: DashboardAttentionItem[];
  today: DashboardTodayItem[];
  assignedTasks: DashboardAssignedTask[];
  personalTodos: DashboardPersonalTodo[];
  personalNote: string;
  calendarDays: DashboardCalendarDay[];
  projects: DashboardProject[];
  finance: {
    outstandingCents: number;
    overdueCents: number;
    paidThisMonthCents: number;
    draftCount: number;
  };
  projectOptions: DashboardProjectOption[];
  workItemOptions: DashboardWorkItemOption[];
};

function startOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function isMissingTableError(message: string) {
  return (
    message.includes("user_todos") ||
    message.includes("user_notes") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export async function loadDashboardSnapshot(): Promise<{
  snapshot?: DashboardSnapshot;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const todayStart = startOfLocalDay();
  const todayEnd = endOfLocalDay();
  const monthStart = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    1,
  );
  const monthEnd = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const [
    projectsResult,
    quotesResult,
    invoicesResult,
    workItemsResult,
    planningResult,
    monthPlanningResult,
    todosResult,
    notesResult,
    inboxResult,
  ] = await Promise.all([
    listProjects(),
    listQuotesForOrganization(),
    listInvoices(),
    listWorkItemsForOrganization(),
    listPlanningWorkspaceData({
      from: todayStart.toISOString(),
      to: todayEnd.toISOString(),
    }),
    listPlanningWorkspaceData({
      from: monthStart.toISOString(),
      to: monthEnd.toISOString(),
    }),
    ctx.supabase
      .from("user_todos")
      .select("id, title, due_date, completed_at, sort_order, created_at")
      .eq("organization_id", ctx.organizationId)
      .eq("user_id", ctx.userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    ctx.supabase
      .from("user_notes")
      .select("body")
      .eq("organization_id", ctx.organizationId)
      .eq("user_id", ctx.userId)
      .maybeSingle(),
    ctx.supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId),
  ]);

  if (projectsResult.error) return { error: projectsResult.error };
  if (quotesResult.error) return { error: quotesResult.error };
  if (invoicesResult.error) return { error: invoicesResult.error };
  if (workItemsResult.error) return { error: workItemsResult.error };
  if (planningResult.error) return { error: planningResult.error };
  if (monthPlanningResult.error) return { error: monthPlanningResult.error };
  if (
    todosResult.error &&
    !isMissingTableError(todosResult.error.message)
  ) {
    return { error: todosResult.error.message };
  }
  if (
    notesResult.error &&
    !isMissingTableError(notesResult.error.message)
  ) {
    return { error: notesResult.error.message };
  }
  if (
    inboxResult.error &&
    !isMissingTableError(inboxResult.error.message)
  ) {
    return { error: inboxResult.error.message };
  }

  const projects = projectsResult.projects ?? [];
  const quotes = quotesResult.quotes ?? [];
  const invoices = invoicesResult.invoices ?? [];
  const workItems = workItemsResult.workItems ?? [];
  const activeStatuses = new Set<ProjectStatus>([
    ...(PROJECT_FILTER_STATUSES.active ?? []),
    "preparation",
  ]);

  const itemsByProject = new Map<string, OrgWorkItemRow[]>();
  for (const item of workItems) {
    const list = itemsByProject.get(item.projectId) ?? [];
    list.push(item);
    itemsByProject.set(item.projectId, list);
  }

  const attention: DashboardAttentionItem[] = [];

  for (const invoice of invoices) {
    if (!isInvoiceOverdue(invoice)) continue;
    attention.push({
      id: `invoice-${invoice.id}`,
      kind: "invoice",
      title: invoice.invoiceNumber || invoice.title,
      subtitle: invoice.customerName,
      href: `/facturen/${invoice.id}`,
      dueDate: invoice.dueDate,
      overdue: true,
    });
  }

  for (const item of workItems) {
    if (!isWorkItemOverdue(item)) continue;
    attention.push({
      id: `work-${item.id}`,
      kind: "workItem",
      title: item.title,
      subtitle: item.projectName,
          href: `/projecten/${item.projectId}?tab=work`,
      dueDate: item.plannedEnd,
      overdue: true,
    });
  }

  for (const quote of quotes) {
    if (quote.status !== "sent") continue;
    attention.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      title: quote.quoteNumber || quote.title,
      subtitle: quote.projectName,
      href: `/projecten/${quote.projectId}/offertes/${quote.id}`,
      dueDate: quote.validUntil,
      overdue: Boolean(
        quote.validUntil && new Date(`${quote.validUntil}T23:59:59`) < todayStart,
      ),
    });
  }

  const unpaid = invoices.filter(
    (invoice: InvoiceRow) =>
      invoice.status === "open" || invoice.status === "sent",
  );
  const outstandingCents = unpaid.reduce(
    (sum, invoice) => sum + invoice.totalCents,
    0,
  );
  const overdueCents = unpaid
    .filter((invoice) => isInvoiceOverdue(invoice))
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);
  const paidThisMonthCents = invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.paidAt &&
        new Date(invoice.paidAt) >= monthStart,
    )
    .reduce((sum, invoice) => sum + invoice.totalCents, 0);

  const openQuotesCount = quotes.filter(
    (quote) => quote.status === "sent" || quote.status === "draft",
  ).length;

  const calendarCounts = new Map<string, number>();
  for (const row of monthPlanningResult.appointments ?? []) {
    const key = toDateKey(row.startsAt);
    calendarCounts.set(key, (calendarCounts.get(key) ?? 0) + 1);
  }

  const snapshot: DashboardSnapshot = {
    currentUserId: ctx.userId,
    kpis: {
      revenueCents: paidThisMonthCents,
      openQuotesCount,
      openInboxCount: inboxResult.count ?? 0,
    },
    attention: attention.slice(0, 6),
    today: (planningResult.appointments ?? []).slice(0, 8).map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      allDay: row.allDay,
      href: "/planning",
      context: row.projectName ?? row.location,
    })),
    assignedTasks: workItems
      .filter(
        (item) =>
          item.assigneeUserId === ctx.userId && item.status !== "done",
      )
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        title: item.title,
        projectId: item.projectId,
        projectName: item.projectName,
        plannedEnd: item.plannedEnd,
        status: item.status,
        overdue: isWorkItemOverdue(item),
      })),
    personalTodos: (todosResult.data ?? [])
      .filter((row) => {
        if (!row.completed_at) return true;
        return new Date(row.completed_at) >= todayStart;
      })
      .slice(0, 12)
      .map((row) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        completedAt: row.completed_at,
      })),
    personalNote: notesResult.data?.body ?? "",
    calendarDays: Array.from(calendarCounts.entries()).map(([date, count]) => ({
      date,
      count,
    })),
    projects: projects
      .filter((project: ProjectRow) => activeStatuses.has(project.status))
      .slice(0, 8)
      .map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        customerName: project.customerName,
        projectNumber: project.projectNumber,
        coverUrl: project.coverUrl,
        progressPercent: workItemStats(itemsByProject.get(project.id) ?? [])
          .progressPercent,
      })),
    finance: {
      outstandingCents,
      overdueCents,
      paidThisMonthCents,
      draftCount: invoices.filter((invoice) => invoice.status === "draft").length,
    },
    projectOptions: projects.map((project) => ({
      id: project.id,
      name: project.name,
    })),
    workItemOptions: workItems
      .filter((item) => item.status !== "done")
      .map((item) => ({
        id: item.id,
        title: item.title,
        projectId: item.projectId,
      })),
  };

  return { snapshot };
}

export async function saveUserNote(body: string): Promise<{ error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase.from("user_notes").upsert(
    {
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      body,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (error) {
    if (isMissingTableError(error.message)) {
      return { error: "notes_unavailable" };
    }
    return { error: error.message };
  }
  return {};
}

export async function createUserTodo(title: string): Promise<{
  todo?: DashboardPersonalTodo;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const trimmed = title.trim();
  if (!trimmed) return { error: "title_required" };

  const { data, error } = await ctx.supabase
    .from("user_todos")
    .insert({
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      title: trimmed,
    })
    .select("id, title, due_date, completed_at")
    .single();

  if (error) {
    if (isMissingTableError(error.message)) {
      return { error: "todos_unavailable" };
    }
    return { error: error.message };
  }

  return {
    todo: {
      id: data.id,
      title: data.title,
      dueDate: data.due_date,
      completedAt: data.completed_at,
    },
  };
}

export async function setUserTodoCompleted(
  id: string,
  completed: boolean,
): Promise<{ error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("user_todos")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (error) {
    if (isMissingTableError(error.message)) return { error: "todos_unavailable" };
    return { error: error.message };
  }
  return {};
}

export async function updateUserTodoTitle(
  id: string,
  title: string,
): Promise<{ error?: string }> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const trimmed = title.trim();
  if (!trimmed) return { error: "title_required" };

  const { error } = await ctx.supabase
    .from("user_todos")
    .update({ title: trimmed })
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (error) {
    if (isMissingTableError(error.message)) return { error: "todos_unavailable" };
    return { error: error.message };
  }
  return {};
}
