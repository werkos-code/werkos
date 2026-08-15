import { USER_ROLES } from "@/config/roles";
import {
  fullOrgAccess,
  resolveOrgAccess,
  type OrgAccess,
} from "@/features/billing/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OrganizationAccessOptions = {
  /** Platform super admins always get full product access. */
  isSuperAdmin?: boolean;
  /** When set, looks up `profiles.platform_role` for a super_admin bypass. */
  userId?: string;
};

async function isPlatformSuperAdmin(
  userId: string,
  mode: "user" | "admin",
): Promise<boolean> {
  const client = mode === "admin" ? createAdminClient() : await createClient();
  const { data } = await client
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle();
  return data?.platform_role === USER_ROLES.SUPER_ADMIN;
}

export async function getOrganizationAccess(
  organizationId: string,
  options?: OrganizationAccessOptions,
): Promise<OrgAccess> {
  if (options?.isSuperAdmin) return fullOrgAccess();
  if (options?.userId && (await isPlatformSuperAdmin(options.userId, "user"))) {
    return fullOrgAccess();
  }

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
  options?: OrganizationAccessOptions,
): Promise<OrgAccess> {
  if (options?.isSuperAdmin) return fullOrgAccess();
  if (
    options?.userId &&
    (await isPlatformSuperAdmin(options.userId, "admin"))
  ) {
    return fullOrgAccess();
  }

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
