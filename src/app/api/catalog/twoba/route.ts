import { NextResponse } from "next/server";

import {
  getTwobaProductDetails,
  isTwobaConfigured,
  searchTwobaCatalog,
} from "@/features/materials/lib/twoba-client";
import { requireApiStaff } from "@/features/shell/lib/api-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const result = await searchTwobaCatalog(query);

    return NextResponse.json({
      configured: result.configured,
      configuredEnv: isTwobaConfigured(),
      results: result.results,
      error: result.error,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiStaff();
    if ("error" in gate) return gate.error;

    const body = (await request.json()) as {
      supplierGln?: string;
      tradeItemId?: string;
    };

    const supplierGln = body.supplierGln?.trim() ?? "";
    const tradeItemId = body.tradeItemId?.trim() ?? "";
    if (!supplierGln || !tradeItemId) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    if (!isTwobaConfigured()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("articles")
      .select(
        "id, code, name, description, unit, category, barcode, track_stock, purchase_price_cents, sale_price_cents, is_active, notes",
      )
      .eq("organization_id", gate.organizationId)
      .eq("catalog_source", "2ba")
      .eq("catalog_supplier_gln", supplierGln)
      .eq("catalog_trade_item_id", tradeItemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        articleId: existing.id,
        created: false,
        article: {
          id: existing.id,
          code: existing.code,
          name: existing.name,
          unit: existing.unit,
          purchasePriceCents: existing.purchase_price_cents,
        },
      });
    }

    const hit =
      (await getTwobaProductDetails(supplierGln, tradeItemId)) ?? {
        supplierGln,
        tradeItemId,
        name: tradeItemId,
        manufacturer: null,
        productCode: tradeItemId,
        ean: null,
        unit: "st",
        purchasePriceCents: null,
      };

    const { data, error } = await admin
      .from("articles")
      .insert({
        organization_id: gate.organizationId,
        code: hit.productCode,
        name: hit.name,
        description: hit.manufacturer
          ? `2BA · ${hit.manufacturer}`
          : "2BA catalogus",
        unit: hit.unit ?? "st",
        category: "2BA",
        barcode: hit.ean,
        track_stock: true,
        purchase_price_cents: hit.purchasePriceCents,
        sale_price_cents: hit.purchasePriceCents
          ? Math.round(hit.purchasePriceCents * 1.3)
          : null,
        is_active: true,
        notes: `2BA ${supplierGln}/${tradeItemId}`,
        catalog_source: "2ba",
        catalog_supplier_gln: supplierGln,
        catalog_trade_item_id: tradeItemId,
        created_by: gate.userId,
      })
      .select("id, code, name, unit, purchase_price_cents")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      articleId: data.id,
      created: true,
      article: {
        id: data.id,
        code: data.code,
        name: data.name,
        unit: data.unit,
        purchasePriceCents: data.purchase_price_cents,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "import_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
