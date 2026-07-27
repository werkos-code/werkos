"use server";

import {
  type ArticleRow,
  type ArticleSupplierPriceRow,
  type MaterialUsageRow,
  type ProjectMaterialLineRow,
  type StockBalanceRow,
  type StockLocationRow,
  type StockMovementRow,
} from "@/features/materials/lib/materials";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import type { StockLocationKind, StockMovementType } from "@/types/database";

export async function listArticles(): Promise<{
  articles?: ArticleRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("articles")
    .select(
      "id, code, name, description, unit, category, barcode, track_stock, purchase_price_cents, sale_price_cents, is_active, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };

  return {
    articles: (data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      unit: row.unit,
      category: row.category,
      barcode: row.barcode,
      trackStock: row.track_stock,
      purchasePriceCents: row.purchase_price_cents,
      salePriceCents: row.sale_price_cents,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: row.created_at,
    })),
  };
}

export async function listArticleSupplierPrices(articleId: string): Promise<{
  prices?: ArticleSupplierPriceRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("article_supplier_prices")
    .select(
      "id, article_id, supplier_id, supplier_name, supplier_sku, unit_cost_cents, lead_time_days, is_preferred, notes",
    )
    .eq("organization_id", ctx.organizationId)
    .eq("article_id", articleId)
    .order("is_preferred", { ascending: false })
    .order("supplier_name");

  if (error) return { error: error.message };

  return {
    prices: (data ?? []).map((row) => ({
      id: row.id,
      articleId: row.article_id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierSku: row.supplier_sku,
      unitCostCents: row.unit_cost_cents,
      leadTimeDays: row.lead_time_days,
      isPreferred: row.is_preferred,
      notes: row.notes,
    })),
  };
}

export async function listPurchaseOrders(): Promise<{
  orders?: import("@/features/materials/lib/materials").PurchaseOrderRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("purchase_orders")
    .select(
      "id, supplier_id, reference, status, order_date, expected_date, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const poIds = (data ?? []).map((row) => row.id);
  const supplierIds = [...new Set((data ?? []).map((row) => row.supplier_id))];

  const [{ data: suppliers }, { data: lines }] = await Promise.all([
    supplierIds.length
      ? ctx.supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    poIds.length
      ? ctx.supabase
          .from("purchase_order_lines")
          .select(
            "purchase_order_id, quantity, unit_cost_cents, received_quantity",
          )
          .in("purchase_order_id", poIds)
      : Promise.resolve({
          data: [] as Array<{
            purchase_order_id: string;
            quantity: number;
            unit_cost_cents: number | null;
            received_quantity: number;
          }>,
        }),
  ]);

  const supplierById = new Map(
    (suppliers ?? []).map((row) => [row.id, row.name] as const),
  );
  const linesByPo = new Map<
    string,
    { count: number; totalCents: number | null }
  >();

  for (const line of lines ?? []) {
    const current = linesByPo.get(line.purchase_order_id) ?? {
      count: 0,
      totalCents: 0,
    };
    current.count += 1;
    if (line.unit_cost_cents != null) {
      current.totalCents =
        (current.totalCents ?? 0) +
        Math.round(Number(line.quantity) * line.unit_cost_cents);
    } else {
      current.totalCents = null;
    }
    linesByPo.set(line.purchase_order_id, current);
  }

  return {
    orders: (data ?? []).map((row) => {
      const summary = linesByPo.get(row.id);
      return {
        id: row.id,
        supplierId: row.supplier_id,
        supplierName: supplierById.get(row.supplier_id) ?? "—",
        reference: row.reference,
        status: row.status,
        orderDate: row.order_date,
        expectedDate: row.expected_date,
        notes: row.notes,
        lineCount: summary?.count ?? 0,
        totalCents: summary?.totalCents ?? null,
        createdAt: row.created_at,
      };
    }),
  };
}

export async function listStockLocations(): Promise<{
  locations?: StockLocationRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("stock_locations")
    .select("id, name, code, kind, project_id, is_active, notes")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  if (error) return { error: error.message };

  const projectIds = [
    ...new Set(
      (data ?? []).map((row) => row.project_id).filter(Boolean) as string[],
    ),
  ];
  const nameById = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await ctx.supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const project of projects ?? []) {
      nameById.set(project.id, project.name);
    }
  }

  return {
    locations: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      kind: row.kind as StockLocationKind,
      projectId: row.project_id,
      projectName: row.project_id
        ? (nameById.get(row.project_id) ?? "—")
        : null,
      isActive: row.is_active,
      notes: row.notes,
    })),
  };
}

export async function listStockBalances(): Promise<{
  balances?: StockBalanceRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("stock_balances")
    .select(
      "id, article_id, location_id, quantity, reserved_quantity, min_quantity, max_quantity",
    )
    .eq("organization_id", ctx.organizationId);

  if (error) return { error: error.message };

  const articleIds = [...new Set((data ?? []).map((row) => row.article_id))];
  const locationIds = [...new Set((data ?? []).map((row) => row.location_id))];

  const [{ data: articles }, { data: locations }] = await Promise.all([
    articleIds.length
      ? ctx.supabase
          .from("articles")
          .select("id, name, code, unit")
          .in("id", articleIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            name: string;
            code: string | null;
            unit: string;
          }>,
        }),
    locationIds.length
      ? ctx.supabase
          .from("stock_locations")
          .select("id, name")
          .in("id", locationIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const articleById = new Map(
    (articles ?? []).map((row) => [row.id, row] as const),
  );
  const locationById = new Map(
    (locations ?? []).map((row) => [row.id, row] as const),
  );

  return {
    balances: (data ?? []).map((row) => {
      const article = articleById.get(row.article_id);
      const location = locationById.get(row.location_id);
      return {
        id: row.id,
        articleId: row.article_id,
        articleName: article?.name ?? "—",
        articleCode: article?.code ?? null,
        articleUnit: article?.unit ?? "st",
        locationId: row.location_id,
        locationName: location?.name ?? "—",
        quantity: Number(row.quantity),
        reservedQuantity: Number(row.reserved_quantity),
        minQuantity:
          row.min_quantity == null ? null : Number(row.min_quantity),
        maxQuantity:
          row.max_quantity == null ? null : Number(row.max_quantity),
      };
    }),
  };
}

export async function listStockMovements(limit = 50): Promise<{
  movements?: StockMovementRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("stock_movements")
    .select(
      "id, article_id, movement_type, quantity, from_location_id, to_location_id, work_date, notes, created_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };

  const articleIds = [...new Set((data ?? []).map((row) => row.article_id))];
  const locationIds = [
    ...new Set(
      (data ?? [])
        .flatMap((row) => [row.from_location_id, row.to_location_id])
        .filter(Boolean) as string[],
    ),
  ];

  const [{ data: articles }, { data: locations }] = await Promise.all([
    articleIds.length
      ? ctx.supabase.from("articles").select("id, name").in("id", articleIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    locationIds.length
      ? ctx.supabase
          .from("stock_locations")
          .select("id, name")
          .in("id", locationIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const articleById = new Map(
    (articles ?? []).map((row) => [row.id, row.name] as const),
  );
  const locationById = new Map(
    (locations ?? []).map((row) => [row.id, row.name] as const),
  );

  return {
    movements: (data ?? []).map((row) => ({
      id: row.id,
      articleId: row.article_id,
      articleName: articleById.get(row.article_id) ?? "—",
      movementType: row.movement_type as StockMovementType,
      quantity: Number(row.quantity),
      fromLocationId: row.from_location_id,
      fromLocationName: row.from_location_id
        ? (locationById.get(row.from_location_id) ?? "—")
        : null,
      toLocationId: row.to_location_id,
      toLocationName: row.to_location_id
        ? (locationById.get(row.to_location_id) ?? "—")
        : null,
      workDate: row.work_date,
      notes: row.notes,
      createdAt: row.created_at,
    })),
  };
}

export async function listMaterialLinesForWorkItem(workItemId: string): Promise<{
  lines?: ProjectMaterialLineRow[];
  usages?: MaterialUsageRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const [
    { data: lines, error: linesError },
    { data: usages, error: usagesError },
  ] = await Promise.all([
    ctx.supabase
      .from("project_material_lines")
      .select(
        "id, project_id, work_item_id, article_id, title, estimated_quantity, unit, notes, sort_order",
      )
      .eq("organization_id", ctx.organizationId)
      .eq("work_item_id", workItemId)
      .order("sort_order"),
    ctx.supabase
      .from("material_usages")
      .select(
        "id, work_item_id, material_line_id, article_id, title, quantity, unit, location_id, user_id, work_date, notes",
      )
      .eq("organization_id", ctx.organizationId)
      .eq("work_item_id", workItemId)
      .order("work_date", { ascending: false }),
  ]);

  if (linesError) return { error: linesError.message };
  if (usagesError) return { error: usagesError.message };

  const usedByLine = new Map<string, number>();
  for (const usage of usages ?? []) {
    if (!usage.material_line_id) continue;
    usedByLine.set(
      usage.material_line_id,
      (usedByLine.get(usage.material_line_id) ?? 0) + Number(usage.quantity),
    );
  }

  const userIds = [...new Set((usages ?? []).map((row) => row.user_id))];
  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await ctx.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      nameById.set(profile.id, profile.full_name?.trim() || "—");
    }
  }

  return {
    lines: (lines ?? []).map((row) => ({
      id: row.id,
      projectId: row.project_id,
      workItemId: row.work_item_id,
      articleId: row.article_id,
      title: row.title,
      estimatedQuantity: Number(row.estimated_quantity),
      unit: row.unit,
      notes: row.notes,
      sortOrder: row.sort_order,
      usedQuantity: usedByLine.get(row.id) ?? 0,
    })),
    usages: (usages ?? []).map((row) => ({
      id: row.id,
      workItemId: row.work_item_id,
      materialLineId: row.material_line_id,
      articleId: row.article_id,
      title: row.title,
      quantity: Number(row.quantity),
      unit: row.unit,
      locationId: row.location_id,
      userId: row.user_id,
      userName: nameById.get(row.user_id) ?? "—",
      workDate: row.work_date,
      notes: row.notes,
    })),
  };
}
