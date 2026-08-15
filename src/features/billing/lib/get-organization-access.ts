import { resolveOrgAccess, type OrgAccess } from "@/features/billing/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getOrganizationAccess(
  organizationId: string,
): Promise<OrgAccess> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return resolveOrgAccess({
    status: data?.status,
    trialEndsAt: data?.trial_ends_at,
  });
}

/** Service-role variant for API routes that already use admin client. */
export async function getOrganizationAccessAdmin(
  organizationId: string,
): Promise<OrgAccess> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return resolveOrgAccess({
    status: data?.status,
    trialEndsAt: data?.trial_ends_at,
  });
}
