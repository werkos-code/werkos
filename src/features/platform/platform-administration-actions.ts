"use server";

import { formatEurFromCents } from "@/config/pricing";
import { assertCallerIsSuperAdmin } from "@/features/platform/lib/platform-auth";
import { monthDateRange } from "@/features/platform/lib/administration-month";
import {
  fetchGoogleAdsMonthMetrics,
  type GoogleAdsAttributionMetrics,
  type GoogleAdsPlatformMetrics,
} from "@/features/platform/lib/google-ads-platform-metrics";
import {
  buildAdministrationCsv,
  fetchStripeMonthSummary,
  type StripeMonthSummary,
} from "@/features/platform/lib/stripe-administration-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformCostCategory } from "@/types/database";

export type PlatformOperatingCostRow = {
  id: string;
  description: string;
  vendor: string | null;
  category: PlatformCostCategory;
  amountCents: number;
  vatRateBps: number;
  invoiceDate: string;
  invoiceReference: string | null;
  notes: string | null;
};

export type PlatformOperatingCostTotals = {
  exclCents: number;
  vatCents: number;
  inclCents: number;
};

export type PlatformAdministrationData = {
  year: number;
  month: number;
  stripe: StripeMonthSummary & {
    grossLabel: string | null;
    taxLabel: string | null;
    feesLabel: string | null;
    netLabel: string | null;
  };
  costs: PlatformOperatingCostRow[];
  costTotals: PlatformOperatingCostTotals;
  costTotalsLabels: {
    excl: string;
    vat: string;
    incl: string;
  };
  googleAds: GoogleAdsPlatformMetrics;
  attribution: GoogleAdsAttributionMetrics;
};

function computeCostTotals(
  costs: PlatformOperatingCostRow[],
): PlatformOperatingCostTotals {
  let exclCents = 0;
  let vatCents = 0;

  for (const cost of costs) {
    exclCents += cost.amountCents;
    vatCents += Math.round((cost.amountCents * cost.vatRateBps) / 10000);
  }

  return {
    exclCents,
    vatCents,
    inclCents: exclCents + vatCents,
  };
}

export async function loadPlatformAdministrationPage(input: {
  year: number;
  month: number;
}): Promise<{ page?: PlatformAdministrationData; error?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();
  const { start, end } = monthDateRange(input.year, input.month);

  const [stripeMetrics, { data: costs, error: costsError }, googleAdsMetrics, signupsWithGclidResult] =
    await Promise.all([
    fetchStripeMonthSummary(input.year, input.month),
    admin
      .from("platform_operating_costs")
      .select(
        "id, description, vendor, category, amount_cents, vat_rate_bps, invoice_date, invoice_reference, notes",
      )
      .gte("invoice_date", start)
      .lte("invoice_date", end)
      .order("invoice_date", { ascending: false }),
    fetchGoogleAdsMonthMetrics(input),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("gclid", "is", null),
  ]);

  if (costsError) return { error: costsError.message };
  if (signupsWithGclidResult.error) {
    return { error: signupsWithGclidResult.error.message };
  }

  const mappedCosts: PlatformOperatingCostRow[] = (costs ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    vendor: row.vendor,
    category: row.category,
    amountCents: row.amount_cents,
    vatRateBps: row.vat_rate_bps,
    invoiceDate: row.invoice_date,
    invoiceReference: row.invoice_reference,
    notes: row.notes,
  }));

  const costTotals = computeCostTotals(mappedCosts);

  return {
    page: {
      year: input.year,
      month: input.month,
      stripe: {
        ...stripeMetrics,
        grossLabel:
          stripeMetrics.grossCents != null
            ? formatEurFromCents(stripeMetrics.grossCents)
            : null,
        taxLabel:
          stripeMetrics.taxCents != null
            ? formatEurFromCents(stripeMetrics.taxCents)
            : null,
        feesLabel:
          stripeMetrics.feesCents != null
            ? formatEurFromCents(stripeMetrics.feesCents)
            : null,
        netLabel:
          stripeMetrics.netAfterFeesCents != null
            ? formatEurFromCents(stripeMetrics.netAfterFeesCents)
            : null,
      },
      costs: mappedCosts,
      costTotals,
      costTotalsLabels: {
        excl: formatEurFromCents(costTotals.exclCents),
        vat: formatEurFromCents(costTotals.vatCents),
        incl: formatEurFromCents(costTotals.inclCents),
      },
      googleAds: googleAdsMetrics,
      attribution: {
        signupsWithGclid: signupsWithGclidResult.count ?? 0,
      },
    },
  };
}

export async function createPlatformOperatingCost(input: {
  description: string;
  vendor?: string;
  category: PlatformCostCategory;
  amountCents: number;
  vatRateBps: number;
  invoiceDate: string;
  invoiceReference?: string;
  notes?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const description = input.description.trim();
  const invoiceDate = input.invoiceDate.trim();
  if (!description || !invoiceDate) return { error: "invalid_input" };
  if (input.amountCents < 0) return { error: "invalid_input" };
  if (input.vatRateBps < 0 || input.vatRateBps > 10000) {
    return { error: "invalid_input" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_operating_costs").insert({
    description,
    vendor: input.vendor?.trim() || null,
    category: input.category,
    amount_cents: input.amountCents,
    vat_rate_bps: input.vatRateBps,
    invoice_date: invoiceDate,
    invoice_reference: input.invoiceReference?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: gate.user.id,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function deletePlatformOperatingCost(
  costId: string,
): Promise<{ error?: string; success?: boolean }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  if (!costId.trim()) return { error: "invalid_input" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_operating_costs")
    .delete()
    .eq("id", costId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function exportPlatformAdministrationCsv(input: {
  year: number;
  month: number;
}): Promise<{ csv?: string; filename?: string; error?: string }> {
  const result = await loadPlatformAdministrationPage(input);
  if (result.error) return { error: result.error };
  if (!result.page) return { error: "not_found" };

  const csv = buildAdministrationCsv({
    year: input.year,
    month: input.month,
    stripe: result.page.stripe,
    costs: result.page.costs.map((cost) => ({
      invoiceDate: cost.invoiceDate,
      description: cost.description,
      vendor: cost.vendor,
      category: cost.category,
      amountCents: cost.amountCents,
      vatRateBps: cost.vatRateBps,
      invoiceReference: cost.invoiceReference,
    })),
  });

  return {
    csv,
    filename: `werkos-administratie-${input.year}-${String(input.month).padStart(2, "0")}.csv`,
  };
}
