import { organizationLogoPublicUrl } from "@/features/organization/lib/organization-logo";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type {
  InvoiceCustomerOption,
  InvoiceProjectOption,
  InvoiceRow,
} from "@/features/invoices/lib/invoice";
import type {
  BillableSourceLine,
  InvoiceLineRow,
} from "@/features/invoices/lib/invoice-lines";
import {
  DEFAULT_HOURLY_RATE_CENTS,
} from "@/features/invoices/lib/invoice-pricing";
import type { InvoiceStatus } from "@/types/database";

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  title: string;
  status: InvoiceStatus;
  projectId: string;
  projectName: string;
  projectNumber: string;
  organizationName: string | null;
  organization: {
    name: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    kvkNumber: string | null;
    vatNumber: string | null;
    iban: string | null;
    logoUrl: string | null;
  } | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  quoteId: string | null;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  createdAt: string;
  lines: InvoiceLineRow[];
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  title: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string | null;
  totalCents: number;
  createdAt: string;
};

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

export async function getInvoice(invoiceId: string): Promise<{
  invoice?: InvoiceDetail;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: invoice, error } = await ctx.supabase
    .from("invoices")
    .select(
      "id, invoice_number, sequence_number, title, status, project_id, quote_id, issue_date, due_date, paid_at, subtotal_cents, vat_cents, total_cents, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!invoice) return { error: "not_found" };

  const [{ data: project }, { data: lines, error: linesError }] =
    await Promise.all([
      ctx.supabase
        .from("projects")
        .select("id, name, project_number, customer_id")
        .eq("organization_id", ctx.organizationId)
        .eq("id", invoice.project_id)
        .maybeSingle(),
      ctx.supabase
        .from("invoice_lines")
        .select(
          "id, parent_id, sort_order, title, description, quantity, unit, unit_price_cents, vat_rate_bps, discount_cents, is_group",
        )
        .eq("organization_id", ctx.organizationId)
        .eq("invoice_id", invoiceId)
        .order("sort_order", { ascending: true }),
    ]);

  if (linesError) return { error: linesError.message };

  const { data: organization } = await ctx.supabase
    .from("organizations")
    .select(
      "name, address, postal_code, city, country, phone, email, kvk_number, vat_number, iban, logo_path",
    )
    .eq("id", ctx.organizationId)
    .maybeSingle();

  let customerName: string | null = null;
  let customerEmail: string | null = null;
  let customerPhone: string | null = null;
  let customerAddress: string | null = null;
  const customerId = project?.customer_id ?? null;
  if (customerId) {
    const { data: customer } = await ctx.supabase
      .from("customers")
      .select("id, name, email, phone, address")
      .eq("organization_id", ctx.organizationId)
      .eq("id", customerId)
      .maybeSingle();
    customerName = customer?.name ?? null;
    customerEmail = customer?.email ?? null;
    customerPhone = customer?.phone ?? null;
    customerAddress = customer?.address ?? null;
  }

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      sequenceNumber: invoice.sequence_number,
      title: invoice.title,
      status: invoice.status as InvoiceStatus,
      projectId: invoice.project_id,
      projectName: project?.name ?? "—",
      projectNumber: project?.project_number ?? "—",
      organizationName: organization?.name ?? null,
      organization: organization
        ? {
            name: organization.name,
            address: organization.address,
            postalCode: organization.postal_code,
            city: organization.city,
            country: organization.country,
            phone: organization.phone,
            email: organization.email,
            kvkNumber: organization.kvk_number,
            vatNumber: organization.vat_number,
            iban: organization.iban,
            logoUrl: organizationLogoPublicUrl(organization.logo_path),
          }
        : null,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      quoteId: invoice.quote_id,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      paidAt: invoice.paid_at,
      notes: invoice.notes,
      subtotalCents: invoice.subtotal_cents,
      vatCents: invoice.vat_cents,
      totalCents: invoice.total_cents,
      createdAt: invoice.created_at,
      lines: (lines ?? []).map((line) => ({
        id: line.id,
        parentId: line.parent_id,
        sortOrder: line.sort_order,
        title: line.title,
        description: line.description,
        quantity: Number(line.quantity),
        unit: line.unit,
        unitPriceCents: line.unit_price_cents,
        vatRateBps: line.vat_rate_bps,
        discountCents: line.discount_cents,
        isGroup: Boolean(
          "is_group" in line ? (line as { is_group?: boolean }).is_group : false,
        ),
      })),
    },
  };
}

export async function listInvoicesForProject(projectId: string): Promise<{
  invoices?: InvoiceListItem[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("invoices")
    .select(
      "id, invoice_number, title, status, issue_date, due_date, total_cents, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  return {
    invoices: (data ?? []).map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      title: row.title,
      status: row.status as InvoiceStatus,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      totalCents: row.total_cents,
      createdAt: row.created_at,
    })),
  };
}

export async function listBillableProjectSources(
  projectId: string,
  hourlyRateCents = DEFAULT_HOURLY_RATE_CENTS,
): Promise<{
  sources?: BillableSourceLine[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: project } = await ctx.supabase
    .from("projects")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return { error: "project_not_found" };

  const [
    { data: timeEntries },
    { data: materialUsages },
    { data: workOrderMaterials },
    { data: workItems },
  ] = await Promise.all([
    ctx.supabase
      .from("time_entries")
      .select("work_item_id, minutes")
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", projectId),
    ctx.supabase
      .from("material_usages")
      .select("id, article_id, title, quantity, unit")
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", projectId),
    ctx.supabase
      .from("work_order_material_usages")
      .select("id, article_id, title, quantity, unit")
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", projectId),
    ctx.supabase
      .from("work_items")
      .select("id, title, description, is_group, estimated_minutes")
      .eq("organization_id", ctx.organizationId)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ]);

  const workItemById = new Map(
    (workItems ?? []).map((row) => [row.id, row] as const),
  );

  const articleIds = [
    ...new Set(
      [
        ...(materialUsages ?? []).map((row) => row.article_id),
        ...(workOrderMaterials ?? []).map((row) => row.article_id),
      ].filter(Boolean) as string[],
    ),
  ];

  const salePriceByArticle = new Map<string, number>();
  if (articleIds.length > 0) {
    const { data: articles } = await ctx.supabase
      .from("articles")
      .select("id, sale_price_cents")
      .eq("organization_id", ctx.organizationId)
      .in("id", articleIds);

    for (const article of articles ?? []) {
      salePriceByArticle.set(article.id, article.sale_price_cents ?? 0);
    }
  }

  const sources: BillableSourceLine[] = [];

  const minutesByWorkItem = new Map<string, number>();
  for (const entry of timeEntries ?? []) {
    if (!entry.work_item_id) continue;
    minutesByWorkItem.set(
      entry.work_item_id,
      (minutesByWorkItem.get(entry.work_item_id) ?? 0) + entry.minutes,
    );
  }

  for (const [workItemId, minutes] of minutesByWorkItem) {
    if (minutes <= 0) continue;
    const workItem = workItemById.get(workItemId);
    const hours = Math.round((minutes / 60) * 100) / 100;
    sources.push({
      key: `hours:${workItemId}`,
      source: "hours",
      title: workItem?.title
        ? `Uren — ${workItem.title}`
        : "Gewerkte uren",
      description: `${minutes} minuten geregistreerd`,
      quantity: hours,
      unit: "uur",
      unitPriceCents: hourlyRateCents,
      vatRateBps: 2100,
    });
  }

  for (const usage of materialUsages ?? []) {
    sources.push({
      key: `material:${usage.id}`,
      source: "material",
      title: usage.title,
      description: null,
      quantity: Number(usage.quantity),
      unit: usage.unit || "st",
      unitPriceCents: usage.article_id
        ? (salePriceByArticle.get(usage.article_id) ?? 0)
        : 0,
      vatRateBps: 2100,
    });
  }

  for (const usage of workOrderMaterials ?? []) {
    sources.push({
      key: `wo-material:${usage.id}`,
      source: "material",
      title: usage.title,
      description: "Werkbonmateriaal",
      quantity: Number(usage.quantity),
      unit: usage.unit || "st",
      unitPriceCents: usage.article_id
        ? (salePriceByArticle.get(usage.article_id) ?? 0)
        : 0,
      vatRateBps: 2100,
    });
  }

  for (const item of workItems ?? []) {
    if (item.is_group) continue;
    const estimated = item.estimated_minutes ?? 0;
    const hours =
      estimated > 0 ? Math.round((estimated / 60) * 100) / 100 : 1;
    sources.push({
      key: `work_item:${item.id}`,
      source: "work_item",
      title: item.title,
      description: item.description,
      quantity: estimated > 0 ? hours : 1,
      unit: estimated > 0 ? "uur" : "post",
      unitPriceCents:
        estimated > 0 ? hourlyRateCents : 0,
      vatRateBps: 2100,
    });
  }

  return { sources };
}
