import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type {
  InvoiceCustomerOption,
  InvoiceProjectOption,
  InvoiceRow,
} from "@/features/invoices/lib/invoice";
import type { InvoiceStatus } from "@/types/database";

export async function listInvoices(): Promise<{
  invoices?: InvoiceRow[];
  projects?: InvoiceProjectOption[];
  customers?: InvoiceCustomerOption[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [invoicesResult, projectsResult] = await Promise.all([
    ctx.supabase
      .from("invoices")
      .select(
        "id, invoice_number, sequence_number, title, status, issue_date, due_date, paid_at, subtotal_cents, vat_cents, total_cents, notes, project_id, quote_id, created_at",
      )
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("projects")
      .select("id, name, project_number, customer_id")
      .eq("organization_id", ctx.organizationId)
      .order("name", { ascending: true }),
  ]);

  if (invoicesResult.error) return { error: invoicesResult.error.message };
  if (projectsResult.error) return { error: projectsResult.error.message };

  const projects = projectsResult.data ?? [];
  const customerIds = [
    ...new Set(projects.map((row) => row.customer_id).filter(Boolean)),
  ];

  const { data: customers } = customerIds.length
    ? await ctx.supabase
        .from("customers")
        .select("id, name")
        .in("id", customerIds)
    : { data: [] as { id: string; name: string }[] };

  const customerNameById = new Map(
    (customers ?? []).map((row) => [row.id, row.name] as const),
  );
  const projectById = new Map(
    projects.map((row) => [row.id, row] as const),
  );

  return {
    invoices: (invoicesResult.data ?? []).map((row) => {
      const project = projectById.get(row.project_id);
      const customerId = project?.customer_id ?? "";
      return {
        id: row.id,
        invoiceNumber: row.invoice_number,
        sequenceNumber: row.sequence_number,
        title: row.title,
        status: row.status as InvoiceStatus,
        issueDate: row.issue_date,
        dueDate: row.due_date,
        paidAt: row.paid_at,
        subtotalCents: row.subtotal_cents,
        vatCents: row.vat_cents,
        totalCents: row.total_cents,
        notes: row.notes,
        projectId: row.project_id,
        projectName: project?.name ?? "—",
        projectNumber: project?.project_number ?? "—",
        customerId,
        customerName: customerNameById.get(customerId) ?? "—",
        quoteId: row.quote_id,
        createdAt: row.created_at,
      };
    }),
    projects: projects.map((row) => ({
      id: row.id,
      name: row.name,
      customerId: row.customer_id,
    })),
    customers: (customers ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    })),
  };
}
