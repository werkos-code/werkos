"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * TEMPORARY — remove when Stripe onboarding is live.
 * Skip Checkout and provision org from the current draft via SQL RPC
 * (no Stripe / no service-role key required).
 */
export async function temporarySkipPaymentAction(): Promise<{
  error?: string;
  success?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "unauthorized" };
  }

  const { data: draft } = await supabase
    .from("onboarding_drafts")
    .select("company_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!draft?.company_name) {
    return { error: "incomplete_draft" };
  }

  const { error } = await supabase.rpc(
    "temp_provision_organization_from_draft",
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
