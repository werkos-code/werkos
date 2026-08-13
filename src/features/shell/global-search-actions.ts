"use server";

import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";

export type GlobalSearchResult = {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  group: "projects" | "customers" | "quotes" | "workItems" | "invoices";
};

function matchesQuery(value: string | null | undefined, q: string) {
  return (value ?? "").toLowerCase().includes(q);
}

export async function globalSearch(query: string): Promise<{
  results?: GlobalSearchResult[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const q = query.trim().toLowerCase();
  if (q.length < 2) return { results: [] };

  const [
    projectsResult,
    customersResult,
    quotesResult,
    workItemsResult,
    invoicesResult,
  ] = await Promise.all([
    ctx.supabase
      .from("projects")
      .select("id, name, project_number")
      .eq("organization_id", ctx.organizationId)
      .order("name")
      .limit(80),
    ctx.supabase
      .from("customers")
      .select("id, name, email")
      .eq("organization_id", ctx.organizationId)
      .order("name")
      .limit(80),
    ctx.supabase
      .from("quotes")
      .select("id, title, quote_number, project_id")
      .eq("organization_id", ctx.organizationId)
      .order("updated_at", { ascending: false })
      .limit(80),
    ctx.supabase
      .from("work_items")
      .select("id, title, project_id, projects!inner(name)")
      .eq("organization_id", ctx.organizationId)
      .eq("is_group", false)
      .order("updated_at", { ascending: false })
      .limit(80),
    ctx.supabase
      .from("invoices")
      .select("id, title, invoice_number")
      .eq("organization_id", ctx.organizationId)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  if (projectsResult.error) return { error: projectsResult.error.message };

  const results: GlobalSearchResult[] = [];

  for (const row of projectsResult.data ?? []) {
    if (!matchesQuery(row.name, q) && !matchesQuery(row.project_number, q)) {
      continue;
    }
    results.push({
      id: row.id,
      label: row.name,
      subtitle: row.project_number ?? undefined,
      href: `/projecten/${row.id}`,
      group: "projects",
    });
    if (results.filter((r) => r.group === "projects").length >= 6) break;
  }

  for (const row of customersResult.data ?? []) {
    if (!matchesQuery(row.name, q) && !matchesQuery(row.email, q)) continue;
    results.push({
      id: row.id,
      label: row.name,
      subtitle: row.email ?? undefined,
      href: `/klanten/${row.id}`,
      group: "customers",
    });
    if (results.filter((r) => r.group === "customers").length >= 6) break;
  }

  for (const row of quotesResult.data ?? []) {
    if (!matchesQuery(row.title, q) && !matchesQuery(row.quote_number, q)) {
      continue;
    }
    results.push({
      id: row.id,
      label: row.title,
      subtitle: row.quote_number ?? undefined,
      href: `/projecten/${row.project_id}/offertes/${row.id}`,
      group: "quotes",
    });
    if (results.filter((r) => r.group === "quotes").length >= 6) break;
  }

  for (const row of workItemsResult.data ?? []) {
    const project = row.projects as unknown as { name: string };
    if (!matchesQuery(row.title, q) && !matchesQuery(project.name, q)) {
      continue;
    }
    results.push({
      id: row.id,
      label: row.title,
      subtitle: project.name,
      href: `/projecten/${row.project_id}?tab=work`,
      group: "workItems",
    });
    if (results.filter((r) => r.group === "workItems").length >= 6) break;
  }

  for (const row of invoicesResult.data ?? []) {
    if (
      !matchesQuery(row.title, q) &&
      !matchesQuery(row.invoice_number, q)
    ) {
      continue;
    }
    results.push({
      id: row.id,
      label: row.title,
      subtitle: row.invoice_number,
      href: `/facturen/${row.id}`,
      group: "invoices",
    });
    if (results.filter((r) => r.group === "invoices").length >= 6) break;
  }

  return { results };
}
