import type { InvoiceStatus } from "@/types/database";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "open",
  "sent",
  "paid",
];

export type InvoiceDisplayStatus =
  | InvoiceStatus
  | "overdue";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  title: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  notes: string | null;
  projectId: string | null;
  projectName: string;
  projectNumber: string;
  customerId: string;
  customerName: string;
  quoteId: string | null;
  createdAt: string;
};

export type InvoiceProjectOption = {
  id: string;
  name: string;
  customerId: string;
};

export type InvoiceCustomerOption = {
  id: string;
  name: string;
};

export function isInvoiceOverdue(
  invoice: Pick<InvoiceRow, "status" | "dueDate">,
  today = new Date(),
) {
  if (invoice.status === "paid" || invoice.status === "draft") return false;
  if (!invoice.dueDate) return false;
  const due = new Date(`${invoice.dueDate}T23:59:59`);
  return due < today;
}

export function invoiceDisplayStatus(
  invoice: Pick<InvoiceRow, "status" | "dueDate">,
): InvoiceDisplayStatus {
  if (isInvoiceOverdue(invoice)) return "overdue";
  return invoice.status;
}

export function daysOverdue(
  dueDate: string | null,
  today = new Date(),
) {
  if (!dueDate) return 0;
  const due = new Date(`${dueDate}T23:59:59`);
  if (due >= today) return 0;
  return Math.ceil((today.getTime() - due.getTime()) / 86_400_000);
}

export function daysUntilDue(dueDate: string | null, today = new Date()) {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T23:59:59`);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

export type InvoiceAgingBucket = "overdue" | "d7" | "d30" | "d30plus";

export function agingBucket(
  invoice: Pick<InvoiceRow, "status" | "dueDate">,
  today = new Date(),
): InvoiceAgingBucket | null {
  if (invoice.status === "paid" || invoice.status === "draft") return null;
  if (!invoice.dueDate) return "d30plus";
  const days = daysUntilDue(invoice.dueDate, today);
  if (days == null) return "d30plus";
  if (days < 0) return "overdue";
  if (days <= 7) return "d7";
  if (days <= 30) return "d30";
  return "d30plus";
}

export function computeInvoiceStats(invoices: InvoiceRow[], today = new Date()) {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

  const outstanding = invoices.filter(
    (inv) => inv.status === "open" || inv.status === "sent",
  );
  const outstandingCents = outstanding.reduce((s, i) => s + i.totalCents, 0);
  const overdueCents = outstanding
    .filter((inv) => isInvoiceOverdue(inv, today))
    .reduce((s, i) => s + i.totalCents, 0);

  const paidThisMonth = invoices.filter(
    (inv) =>
      inv.status === "paid" &&
      inv.paidAt &&
      new Date(inv.paidAt) >= startOfMonth,
  );
  const paidThisMonthCents = paidThisMonth.reduce((s, i) => s + i.totalCents, 0);

  const paidPrevMonth = invoices.filter(
    (inv) =>
      inv.status === "paid" &&
      inv.paidAt &&
      new Date(inv.paidAt) >= startOfPrevMonth &&
      new Date(inv.paidAt) <= endOfPrevMonth,
  );
  const paidPrevMonthCents = paidPrevMonth.reduce((s, i) => s + i.totalCents, 0);

  const issuedThisMonth = invoices.filter((inv) => {
    if (inv.status === "draft") return false;
    return new Date(`${inv.issueDate}T12:00:00`) >= startOfMonth;
  });
  const sentThisMonthCents = issuedThisMonth.reduce((s, i) => s + i.totalCents, 0);

  const paidWithDates = invoices.filter(
    (inv) => inv.status === "paid" && inv.paidAt && inv.issueDate,
  );
  let avgPaymentDays: number | null = null;
  if (paidWithDates.length > 0) {
    const sum = paidWithDates.reduce((acc, inv) => {
      const issued = new Date(`${inv.issueDate}T12:00:00`).getTime();
      const paid = new Date(inv.paidAt!).getTime();
      return acc + Math.max(0, (paid - issued) / 86_400_000);
    }, 0);
    avgPaymentDays = Math.round(sum / paidWithDates.length);
  }

  const paidPrevWithDates = paidPrevMonth.filter((inv) => inv.paidAt && inv.issueDate);
  let avgPaymentDaysPrev: number | null = null;
  if (paidPrevWithDates.length > 0) {
    const sum = paidPrevWithDates.reduce((acc, inv) => {
      const issued = new Date(`${inv.issueDate}T12:00:00`).getTime();
      const paid = new Date(inv.paidAt!).getTime();
      return acc + Math.max(0, (paid - issued) / 86_400_000);
    }, 0);
    avgPaymentDaysPrev = Math.round(sum / paidPrevWithDates.length);
  }

  const aging = {
    overdue: 0,
    d7: 0,
    d30: 0,
    d30plus: 0,
  };
  for (const inv of outstanding) {
    const bucket = agingBucket(inv, today);
    if (bucket) aging[bucket] += inv.totalCents;
  }

  const byProject = new Map<string, { name: string; cents: number }>();
  for (const inv of outstanding) {
    const key = inv.projectId ?? `customer:${inv.customerId || inv.id}`;
    const current = byProject.get(key) ?? {
      name: inv.projectId ? inv.projectName : inv.customerName,
      cents: 0,
    };
    current.cents += inv.totalCents;
    byProject.set(key, current);
  }
  const topOutstanding = [...byProject.entries()]
    .map(([projectId, value]) => ({ projectId, ...value }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);

  // Daily cumulative paid this month / prev month for trend
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const trendThis: number[] = [];
  const trendPrev: number[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const endThis = new Date(today.getFullYear(), today.getMonth(), day, 23, 59, 59);
    const endPrev = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      Math.min(day, endOfPrevMonth.getDate()),
      23,
      59,
      59,
    );
    trendThis.push(
      invoices
        .filter(
          (inv) =>
            inv.status === "paid" &&
            inv.paidAt &&
            new Date(inv.paidAt) >= startOfMonth &&
            new Date(inv.paidAt) <= endThis,
        )
        .reduce((s, i) => s + i.totalCents, 0),
    );
    trendPrev.push(
      invoices
        .filter(
          (inv) =>
            inv.status === "paid" &&
            inv.paidAt &&
            new Date(inv.paidAt) >= startOfPrevMonth &&
            new Date(inv.paidAt) <= endPrev,
        )
        .reduce((s, i) => s + i.totalCents, 0),
    );
  }

  const paidChangePercent =
    paidPrevMonthCents === 0
      ? paidThisMonthCents > 0
        ? 100
        : 0
      : Math.round(
          ((paidThisMonthCents - paidPrevMonthCents) / paidPrevMonthCents) * 100,
        );

  const avgDaysDelta =
    avgPaymentDays != null && avgPaymentDaysPrev != null
      ? avgPaymentDays - avgPaymentDaysPrev
      : null;

  return {
    outstandingCents,
    overdueCents,
    paidThisMonthCents,
    paidChangePercent,
    sentThisMonthCents,
    sentThisMonthCount: issuedThisMonth.length,
    avgPaymentDays,
    avgDaysDelta,
    aging,
    topOutstanding,
    trendThis,
    trendPrev,
  };
}
