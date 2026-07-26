import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Apply a signed delta to stock_balances; creates row if missing. */
export async function applyStockDelta(
  admin: Admin,
  organizationId: string,
  articleId: string,
  locationId: string,
  delta: number,
) {
  if (delta === 0) return { ok: true as const };

  const { data: existing } = await admin
    .from("stock_balances")
    .select("id, quantity")
    .eq("organization_id", organizationId)
    .eq("article_id", articleId)
    .eq("location_id", locationId)
    .maybeSingle();

  const current = existing ? Number(existing.quantity) : 0;
  const next = current + delta;
  if (next < -0.0001) {
    return { ok: false as const, error: "insufficient_stock" as const };
  }
  const quantity = Math.max(0, Math.round(next * 10000) / 10000);

  if (existing) {
    const { error } = await admin
      .from("stock_balances")
      .update({ quantity })
      .eq("id", existing.id)
      .eq("organization_id", organizationId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await admin.from("stock_balances").insert({
      organization_id: organizationId,
      article_id: articleId,
      location_id: locationId,
      quantity,
      reserved_quantity: 0,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
